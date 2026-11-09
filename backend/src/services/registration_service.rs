use bson::DateTime;
use mongodb::bson::{doc, oid::ObjectId};
use tracing::{error, info};

use crate::database::{AppDatabase, now, oid_from_hex};
use crate::errors::{AppError, AppResult};
use crate::models::registration::{Registration, RegistrationQuery, RegistrationView, TeamMemberReg};

pub struct RegistrationService {
    db: AppDatabase,
}

impl RegistrationService {
    pub fn new(db: AppDatabase) -> Self {
        Self { db }
    }

    async fn claim_txn(&self, txn: &str) -> AppResult<()> {
        self.db
            .transactions
            .insert_one(doc! { "transaction_id": txn, "created_at": now() }, None)
            .await
            .map_err(|e| {
                if is_duplicate_key(&e) {
                    AppError::Conflict("This transaction ID is already used.".into())
                } else {
                    AppError::Internal(e.to_string())
                }
            })?;
        Ok(())
    }

    async fn release_txn(&self, txn: &str) {
        let _ = self
            .db
            .transactions
            .delete_one(doc! { "transaction_id": txn }, None)
            .await;
    }

    fn to_view(
        &self,
        d: mongodb::bson::Document,
        user: Option<&crate::models::user::User>,
    ) -> AppResult<RegistrationView> {
        let reg: Registration = bson::from_bson(bson::Bson::Document(d))
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(reg.view(user))
    }

    /// Create an event/workshop registration.
    /// Duplicate prevention relies on unique indexes:
    ///  - transaction_id globally unique  -> 409 DUPLICATE_TRANSACTION
    ///  - (user_id, target_id) unique among pending/approved only -> 409 ALREADY_REGISTERED
    ///    (a rejected registration can be redone; its transaction ID is released on reject)
    pub async fn create_event_registration(
        &self,
        user_id: &ObjectId,
        kind: &str,
        target_id: &ObjectId,
        target_name: &str,
        transaction_id: &str,
        screenshot_url: &str,
        amount: i64,
        team_name: Option<String>,
        team_members: Vec<TeamMemberReg>,
        payment_method: &str,
    ) -> AppResult<Registration> {
        if !payment_method.is_empty() && !matches!(payment_method, "upi" | "neft" | "cheque") {
            return Err(AppError::Validation("Unknown payment method.".into()));
        }
        // Pre-checks (best effort; unique indexes are the real guard).
        if kind == "event" {
            let ev = self
                .db
                .events
                .find_one(doc! { "_id": target_id }, None)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
            match ev {
                Some(ev) => {
                    if !ev.get_bool("registration_open").unwrap_or(false) {
                        return Err(AppError::Validation("Registration is closed for this event.".into()));
                    }
                }
                None => return Err(AppError::NotFound("Event not found.".into())),
            }
        } else if kind == "workshop" {
            let ws = self
                .db
                .workshops
                .find_one(doc! { "_id": target_id }, None)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
            match ws {
                Some(ws) => {
                    // Stored as i32 normally, but tolerate i64 (e.g. seeded/imported data).
                    let seats_left = ws
                        .get_i32("seats_left")
                        .map(i64::from)
                        .or_else(|_| ws.get_i64("seats_left"))
                        .unwrap_or(0);
                    if seats_left <= 0 {
                        return Err(AppError::Validation("Workshop is sold out.".into()));
                    }
                }
                None => return Err(AppError::NotFound("Workshop not found.".into())),
            }
        }

        self.claim_txn(transaction_id.trim()).await?;

        let now = now();
        let doc = doc! {
            "kind": kind,
            "user_id": user_id,
            "target_id": target_id,
            "target_name": target_name,
            "transaction_id": transaction_id,
            "screenshot_url": screenshot_url,
            "status": "pending",
            "amount": amount,
            "payment_method": payment_method,
                    "team_name": team_name.clone(),
                    "team_members": team_members
                .iter()
                .map(|m| doc! { "name": &m.name })
                .collect::<Vec<_>>(),
            "created_at": now,
            "updated_at": now,
        };

        match self.db.reg_coll(kind).insert_one(doc, None).await {
            Ok(_) => {
                info!(
                    "registration created: user={} kind={} target={} txn={}",
                    user_id, kind, target_id, transaction_id
                );
                Ok(Registration {
                    id: None,
                    kind: kind.to_string(),
                    user_id: *user_id,
                    target_id: Some(*target_id),
                    target_name: target_name.to_string(),
                    mess_option: None,
                    mess_name: String::new(),
                    transaction_id: transaction_id.to_string(),
                    screenshot_url: screenshot_url.to_string(),
                    status: "pending".to_string(),
                    amount,
                    team_name,
                    team_members,
                    rejection_reason: None,
                    confirmation_qr_url: None,
                    visit_days: 0,
                    competition_names: vec![],
                    payment_method: payment_method.to_string(),
                    created_at: Some(now),
                    updated_at: Some(now),
                })
            }
            Err(e) => {
                self.release_txn(transaction_id.trim()).await;
                if is_duplicate_key(&e) {
                    return Err(AppError::Conflict("You are already registered for this.".into()));
                }
                error!("registration insert failed: {}", e);
                Err(AppError::Internal(e.to_string()))
            }
        }
    }

    /// Create a mess registration.
    pub async fn create_mess_registration(
        &self,
        user_id: &ObjectId,
        mess_option: &ObjectId,
        mess_name: &str,
        transaction_id: &str,
        screenshot_url: &str,
        amount: i64,
        payment_method: &str,
    ) -> AppResult<Registration> {
        if !payment_method.is_empty() && !matches!(payment_method, "upi" | "neft" | "cheque") {
            return Err(AppError::Validation("Unknown payment method.".into()));
        }
        let mo = self
            .db
            .mess_options
            .find_one(doc! { "_id": mess_option }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if mo.is_none() {
            return Err(AppError::Validation("Unknown mess option.".into()));
        }

        self.claim_txn(transaction_id.trim()).await?;

        let now = now();
        let doc = doc! {
            "kind": "mess",
            "user_id": user_id,
            "mess_option": mess_option,
            "mess_name": mess_name,
            "transaction_id": transaction_id,
            "screenshot_url": screenshot_url,
            "status": "pending",
            "amount": amount,
            "payment_method": payment_method,
            "confirmation_qr_url": None::<String>,
            "created_at": now,
            "updated_at": now,
        };

        match self.db.registrations.insert_one(doc, None).await {
            Ok(_) => {
                info!(
                    "mess registration created: user={} option={} txn={}",
                    user_id, mess_option, transaction_id
                );
                Ok(Registration {
                    id: None,
                    kind: "mess".to_string(),
                    user_id: *user_id,
                    target_id: None,
                    target_name: String::new(),
                    mess_option: Some(*mess_option),
                    mess_name: mess_name.to_string(),
                    transaction_id: transaction_id.to_string(),
                    screenshot_url: screenshot_url.to_string(),
                    status: "pending".to_string(),
                    amount,
                    team_name: None,
                    team_members: vec![],
                    rejection_reason: None,
                    confirmation_qr_url: None,
                    visit_days: 0,
                    competition_names: vec![],
                    payment_method: payment_method.to_string(),
                    created_at: Some(now),
                    updated_at: Some(now),
                })
            }
            Err(e) => {
                self.release_txn(transaction_id.trim()).await;
                if is_duplicate_key(&e) {
                    return Err(AppError::Conflict(
                        "You are already registered for this mess.".into(),
                    ));
                }
                error!("mess registration insert failed: {}", e);
                Err(AppError::Internal(e.to_string()))
            }
        }
    }

    pub async fn my_registrations(&self, user_id: &ObjectId) -> AppResult<Vec<RegistrationView>> {
        let mut out = Vec::new();
        for c in [&self.db.event_registrations, &self.db.workshop_registrations] {
            let mut cursor = c
                .find(doc! { "user_id": user_id }, None)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
            while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
                let d = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
                out.push(self.to_view(d, None)?);
            }
        }
        Ok(out)
    }

    pub async fn my_mess_registrations(&self, user_id: &ObjectId) -> AppResult<Vec<RegistrationView>> {
        let mut cursor = self
            .db
            .registrations
            .find(doc! { "user_id": user_id, "kind": "mess" }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out = Vec::new();
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let d = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(self.to_view(d, None)?);
        }
        Ok(out)
    }

    /// Price per person per day for accommodation (env ACCOMMODATION_PRICE_PER_DAY, default 300).
    pub fn accommodation_price_per_day() -> i64 {
        std::env::var("ACCOMMODATION_PRICE_PER_DAY")
            .ok()
            .and_then(|v| v.trim().parse::<i64>().ok())
            .filter(|v| *v >= 0)
            .unwrap_or(300)
    }

    pub const ACCOMMODATION_MAX_DAYS: i64 = 7;

    /// Create an accommodation booking (stored in `accommodation_registrations`).
    /// Goes through the same pending -> approve/reject admin flow as everything else.
    pub async fn create_accommodation_registration(
        &self,
        user_id: &ObjectId,
        visit_days: i64,
        competition_names: Vec<String>,
        payment_method: &str,
        transaction_id: &str,
        screenshot_url: &str,
    ) -> AppResult<Registration> {
        if visit_days < 1 || visit_days > Self::ACCOMMODATION_MAX_DAYS {
            return Err(AppError::Validation(format!(
                "Number of days must be between 1 and {}.",
                Self::ACCOMMODATION_MAX_DAYS
            )));
        }
        if !matches!(payment_method, "upi" | "neft" | "cheque") {
            return Err(AppError::Validation("Invalid payment method.".into()));
        }
        if transaction_id.trim().len() < 6 {
            return Err(AppError::Validation("Transaction ID / reference is too short.".into()));
        }

        // One active (pending/approved) booking per user. A rejected one can be redone.
        let existing = self
            .db
            .accommodation_registrations
            .find_one(
                doc! { "user_id": user_id, "status": { "$ne": "rejected" } },
                None,
            )
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if existing.is_some() {
            return Err(AppError::Conflict(
                "You already have an accommodation booking. Check My Registrations for its status.".into(),
            ));
        }

        let amount = visit_days * Self::accommodation_price_per_day();
        let target_name = format!("Accommodation ({} day{})", visit_days, if visit_days == 1 { "" } else { "s" });
        self.claim_txn(transaction_id.trim()).await?;

        let now = now();
        let doc = doc! {
            "kind": "accommodation",
            "user_id": user_id,
            "target_name": &target_name,
            "transaction_id": transaction_id.trim(),
            "screenshot_url": screenshot_url,
            "status": "pending",
            "amount": amount,
            "visit_days": visit_days,
            "competition_names": competition_names.clone(),
            "payment_method": payment_method,
            "confirmation_qr_url": None::<String>,
            "created_at": now,
            "updated_at": now,
        };

        match self.db.accommodation_registrations.insert_one(doc, None).await {
            Ok(_) => {
                info!(
                    "accommodation booking created: user={} days={} txn={}",
                    user_id, visit_days, transaction_id
                );
                Ok(Registration {
                    id: None,
                    kind: "accommodation".to_string(),
                    user_id: *user_id,
                    target_id: None,
                    target_name,
                    mess_option: None,
                    mess_name: String::new(),
                    transaction_id: transaction_id.trim().to_string(),
                    screenshot_url: screenshot_url.to_string(),
                    status: "pending".to_string(),
                    amount,
                    team_name: None,
                    team_members: vec![],
                    rejection_reason: None,
                    confirmation_qr_url: None,
                    visit_days,
                    competition_names,
                    payment_method: payment_method.to_string(),
                    created_at: Some(now),
                    updated_at: Some(now),
                })
            }
            Err(e) => {
                self.release_txn(transaction_id.trim()).await;
                if is_duplicate_key(&e) {
                    return Err(AppError::Conflict(
                        "You already have an accommodation booking. Check My Registrations for its status.".into(),
                    ));
                }
                error!("accommodation insert failed: {}", e);
                Err(AppError::Internal(e.to_string()))
            }
        }
    }

    pub async fn my_accommodation_registrations(&self, user_id: &ObjectId) -> AppResult<Vec<RegistrationView>> {
        let mut cursor = self
            .db
            .accommodation_registrations
            .find(doc! { "user_id": user_id }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out = Vec::new();
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let d = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(self.to_view(d, None)?);
        }
        Ok(out)
    }

    pub async fn list_registrations(&self, query: &RegistrationQuery) -> AppResult<Vec<RegistrationView>> {
        let mut filter = doc! {};
        if let Some(status) = &query.status {
            filter.insert("status", status);
        }
        if let Some(tid) = &query.target_id {
            if let Ok(oid) = oid_from_hex(tid) {
                filter.insert("target_id", oid);
            }
        }
        if let Some(mo) = &query.mess_option {
            if let Ok(oid) = oid_from_hex(mo) {
                filter.insert("mess_option", oid);
            }
        }

        let colls: Vec<&mongodb::Collection<mongodb::bson::Document>> = match query.kind.as_deref() {
            Some("event") => vec![&self.db.event_registrations],
            Some("workshop") => vec![&self.db.workshop_registrations],
            Some("accommodation") => vec![&self.db.accommodation_registrations],
            Some("mess") => vec![&self.db.registrations],
            _ => vec![
                &self.db.event_registrations,
                &self.db.workshop_registrations,
                &self.db.accommodation_registrations,
                &self.db.registrations,
            ],
        };

        let mut out = Vec::new();
        for c in colls {
            let mut cursor = c
                .find(filter.clone(), None)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
            while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
                let d = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
                let uid = d.get_object_id("user_id").ok();
                let user: Option<crate::models::user::User> = match uid {
                    Some(u) => self
                        .db
                        .users
                        .find_one(doc! { "_id": u }, None)
                        .await
                        .map_err(|e| AppError::Internal(e.to_string()))?
                        .map(|x| bson::from_bson(bson::Bson::Document(x)))
                        .transpose()
                        .map_err(|e| AppError::Internal(e.to_string()))?,
                    None => None,
                };
                out.push(self.to_view(d, user.as_ref())?);
            }
        }
        Ok(out)
    }

    pub async fn decide_registration(&self, id: &str, action: &str, reason: Option<&str>) -> AppResult<RegistrationView> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid registration id.".into()))?;
        let status = match action {
            "approve" => "approved",
            "reject"  => "rejected",
            other     => return Err(AppError::Validation(format!("Invalid action: {}", other))),
        };
        let now = now();
        let mut set_doc = doc! { "status": status, "updated_at": now };
        if let Some(r) = reason {
            set_doc.insert("rejection_reason", r);
        }
        if status == "approved" {
            set_doc.insert("confirmation_qr_url", generate_qr_url(id));
        } else {
            set_doc.insert("confirmation_qr_url", None::<String>);
        }
        let opts = mongodb::options::FindOneAndUpdateOptions::builder()
            .return_document(mongodb::options::ReturnDocument::After)
            .build();
        let mut doc_found = None;
        for c in [
            &self.db.event_registrations,
            &self.db.workshop_registrations,
            &self.db.accommodation_registrations,
            &self.db.registrations,
        ] {
            if let Some(d) = c
                .find_one_and_update(doc! { "_id": oid }, doc! { "$set": set_doc.clone() }, opts.clone())
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?
            {
                doc_found = Some(d);
                break;
            }
        }
        let doc = doc_found;
        match doc {
            Some(d) => {
                let reg: Registration = bson::from_bson(bson::Bson::Document(d))
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                // A rejected payment shouldn't keep its transaction ID locked: let the user
                // re-submit (e.g. with a corrected ID) or the real owner of that ID use it.
                // Mess is excluded: its collection has its own unique transaction_id index.
                if status == "rejected" && reg.kind != "mess" {
                    self.release_txn(reg.transaction_id.trim()).await;
                }
                let user_doc = self
                    .db
                    .users
                    .find_one(doc! { "_id": reg.user_id }, None)
                    .await
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                let user: Option<crate::models::user::User> = user_doc
                    .map(|d| bson::from_bson(bson::Bson::Document(d)))
                    .transpose()
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                Ok(reg.view(user.as_ref()))
            }
            None => Err(AppError::NotFound("Registration not found.".into())),
        }
    }

    /// Desk check: look a registration up by its ID (what the QR/ticket shows) and return the
    /// live record. The database is the source of truth, so a hand-drawn or edited QR proves
    /// nothing: an unknown ID is a 404, and only status "approved" counts as valid.
    pub async fn verify_registration(&self, id: &str) -> AppResult<RegistrationView> {
        let id = id.trim().trim_start_matches('#').trim();
        let not_found = || AppError::NotFound("No registration found with that ID.".into());
        let oid = oid_from_hex(id).map_err(|_| not_found())?;
        for c in [
            &self.db.event_registrations,
            &self.db.workshop_registrations,
            &self.db.accommodation_registrations,
            &self.db.registrations,
        ] {
            if let Some(d) = c
                .find_one(doc! { "_id": oid }, None)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?
            {
                let user: Option<crate::models::user::User> = match d.get_object_id("user_id").ok() {
                    Some(u) => self
                        .db
                        .users
                        .find_one(doc! { "_id": u }, None)
                        .await
                        .map_err(|e| AppError::Internal(e.to_string()))?
                        .map(|x| bson::from_bson(bson::Bson::Document(x)))
                        .transpose()
                        .map_err(|e| AppError::Internal(e.to_string()))?,
                    None => None,
                };
                return self.to_view(d, user.as_ref());
            }
        }
        Err(not_found())
    }

    pub async fn export_csv(&self) -> AppResult<String> {
        let mut rows = Vec::new();
        rows.push("id,email,kind,target,transactionId,amount,status".to_string());
        for c in [
            &self.db.event_registrations,
            &self.db.workshop_registrations,
            &self.db.accommodation_registrations,
            &self.db.registrations,
        ] {
        let mut cursor = c
            .find(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let doc = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            let reg: Registration = bson::from_bson(bson::Bson::Document(doc))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            let user = self
                .db
                .users
                .find_one(doc! { "_id": reg.user_id }, None)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
            let email = user
                .as_ref()
                .and_then(|u| u.get_str("email").ok())
                .unwrap_or("")
                .to_string();
            let target = if reg.kind == "mess" {
                reg.mess_name.clone()
            } else {
                reg.target_name.clone()
            };
            let id = reg.id.map(|o| o.to_hex()).unwrap_or_default();
            rows.push(format!(
                "{},{},{},{},{},{},{}",
                id, email, reg.kind, target, reg.transaction_id, reg.amount, reg.status
            ));
        }
        }
        Ok(rows.join("\n"))
    }
}

fn is_duplicate_key(e: &mongodb::error::Error) -> bool {
    let msg = e.to_string();
    msg.contains("E11000") || msg.contains("duplicate key")
}

fn generate_qr_url(id: &str) -> String {
    let svg = r##"<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fff"/><text x="100" y="90" text-anchor="middle" font-size="16" font-weight="bold" fill="#000">XPECTO</text><text x="100" y="115" text-anchor="middle" font-size="11" font-family="monospace" fill="#000">{}</text></svg>"##;
    let svg = svg.replace("{}", &id);
    format!("data:image/svg+xml;utf8,{}", url_encode(&svg))
}

fn url_encode(s: &str) -> String {
    s.chars()
        .map(|c| {
            if c.is_alphanumeric() || matches!(c, '-' | '_' | '.' | '~') {
                c.to_string()
            } else {
                format!("%{:02X}", c as u32)
            }
        })
        .collect()
}
