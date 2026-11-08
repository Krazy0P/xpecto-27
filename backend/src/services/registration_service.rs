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

    /// Create an event/workshop registration.
    /// Duplicate prevention relies on unique indexes:
    ///  - transaction_id globally unique  -> 409 DUPLICATE_TRANSACTION
    ///  - (user_id, kind, target_id) unique -> 409 ALREADY_REGISTERED
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
    ) -> AppResult<Registration> {
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
                    if ws.get_i32("seats_left").unwrap_or(0) <= 0 {
                        return Err(AppError::Validation("Workshop is sold out.".into()));
                    }
                }
                None => return Err(AppError::NotFound("Workshop not found.".into())),
            }
        }

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
                    "team_name": team_name.clone(),
                    "team_members": team_members
                .iter()
                .map(|m| doc! { "name": &m.name })
                .collect::<Vec<_>>(),
            "created_at": now,
            "updated_at": now,
        };

        match self
            .db
            .registrations
            .insert_one(doc, None)
            .await
        {
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
                    created_at: Some(now),
                    updated_at: Some(now),
                })
            }
            Err(e) => {
                let msg = e.to_string();
                if is_duplicate_key(&e) {
                    if msg.contains("transaction_id") {
                        return Err(AppError::Conflict(
                            "This transaction ID is already used.".into(),
                        ));
                    }
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
    ) -> AppResult<Registration> {
        let mo = self
            .db
            .mess_options
            .find_one(doc! { "_id": mess_option }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if mo.is_none() {
            return Err(AppError::Validation("Unknown mess option.".into()));
        }

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
            "confirmation_qr_url": None::<String>,
            "created_at": now,
            "updated_at": now,
        };

        match self
            .db
            .registrations
            .insert_one(doc, None)
            .await
        {
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
                    created_at: Some(now),
                    updated_at: Some(now),
                })
            }
            Err(e) => {
                let msg = e.to_string();
                if is_duplicate_key(&e) {
                    if msg.contains("transaction_id") {
                        return Err(AppError::Conflict(
                            "This transaction ID is already used.".into(),
                        ));
                    }
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
        let mut cursor = self
            .db
            .registrations
            .find(doc! { "user_id": user_id, "kind": { "$ne": "mess" } }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out = Vec::new();
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let doc = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            let reg: Registration = bson::from_bson(bson::Bson::Document(doc))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(reg.view(None));
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
            let doc = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            let reg: Registration = bson::from_bson(bson::Bson::Document(doc))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(reg.view(None));
        }
        Ok(out)
    }

    pub async fn list_registrations(&self, query: &RegistrationQuery) -> AppResult<Vec<RegistrationView>> {
        let mut filter = doc! {};
        if let Some(kind) = &query.kind {
            filter.insert("kind", kind);
        }
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
        let mut cursor = self
            .db
            .registrations
            .find(filter, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out = Vec::new();
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
            let user: Option<crate::models::user::User> = user
                .map(|d| bson::from_bson(bson::Bson::Document(d)))
                .transpose()
                .map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(reg.view(user.as_ref()));
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
        let doc = self
            .db
            .registrations
            .find_one_and_update(
                doc! { "_id": oid },
                doc! { "$set": set_doc },
                mongodb::options::FindOneAndUpdateOptions::builder()
                    .return_document(mongodb::options::ReturnDocument::After)
                    .build(),
            )
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        match doc {
            Some(d) => {
                let reg: Registration = bson::from_bson(bson::Bson::Document(d))
                    .map_err(|e| AppError::Internal(e.to_string()))?;
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

    pub async fn export_csv(&self) -> AppResult<String> {
        let mut cursor = self
            .db
            .registrations
            .find(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut rows = Vec::new();
        rows.push("id,email,kind,target,transactionId,amount,status".to_string());
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
        Ok(rows.join("\n"))
    }
}

fn is_duplicate_key(e: &mongodb::error::Error) -> bool {
    let msg = e.to_string();
    msg.contains("E11000") || msg.contains("duplicate key")
}

fn generate_qr_url(id: &str) -> String {
    let svg = r##"<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fff"/><text x="100" y="105" text-anchor="middle" font-size="14" fill="#000">XPECTO QR #{}</text></svg>"##;
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
