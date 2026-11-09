use bson::Document;
use mongodb::bson::{doc, oid::ObjectId};
use tracing::info;

use crate::database::{AppDatabase, oid_from_hex};
use crate::errors::{AppError, AppResult};
use crate::models::{
    admin::AddAdminInput,
    ambassador::{Ambassador, AmbassadorInput},
    event::{Event, EventInput},
    fest::{FestInfo, FestInfoInput},
    mess::MessOption,
    payment::PaymentInfo,
    sponsor::Sponsor,
    team::TeamMember,
    workshop::{Workshop, WorkshopInput},
};

pub struct PublicService {
    db: AppDatabase,
}

impl PublicService {
    pub fn new(db: AppDatabase) -> Self {
        Self { db }
    }

    pub async fn get_fest(&self) -> AppResult<FestInfo> {
        let doc = self
            .db
            .fest_info
            .find_one(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        match doc {
            Some(d) => bson::from_bson::<FestInfo>(bson::Bson::Document(d))
                .map_err(|e| AppError::Internal(e.to_string())),
            None => Err(AppError::NotFound("Fest info not found.".into())),
        }
    }

    pub async fn get_events(&self) -> AppResult<Vec<Event>> {
        let mut cursor = self
            .db
            .events
            .find(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out: Vec<Event> = Vec::new();
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let doc: bson::Document = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            let item: Event = bson::from_bson(bson::Bson::Document(doc))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(item);
        }
        Ok(out)
    }

    pub async fn get_event(&self, id: &str) -> AppResult<Event> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid event id.".into()))?;
        let doc = self
            .db
            .events
            .find_one(doc! { "_id": oid }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        match doc {
            Some(d) => bson::from_bson::<Event>(bson::Bson::Document(d))
                .map_err(|e| AppError::Internal(e.to_string())),
            None => Err(AppError::NotFound("Event not found.".into())),
        }
    }

    pub async fn get_workshops(&self) -> AppResult<Vec<Workshop>> {
        let mut cursor = self
            .db
            .workshops
            .find(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out: Vec<Workshop> = Vec::new();
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let doc: bson::Document = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            let item: Workshop = bson::from_bson(bson::Bson::Document(doc))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(item);
        }
        Ok(out)
    }

    pub async fn get_team(&self) -> AppResult<Vec<TeamMember>> {
        let mut cursor = self
            .db
            .team_members
            .find(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out: Vec<TeamMember> = Vec::new();
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let doc: bson::Document = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            let item: TeamMember = bson::from_bson(bson::Bson::Document(doc))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(item);
        }
        out.sort_by(|a, b| a.order.cmp(&b.order));
        Ok(out)
    }

    pub async fn get_sponsors(&self) -> AppResult<Vec<Sponsor>> {
        let mut cursor = self
            .db
            .sponsors
            .find(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out: Vec<Sponsor> = Vec::new();
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let doc: bson::Document = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            let item: Sponsor = bson::from_bson(bson::Bson::Document(doc))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(item);
        }
        Ok(out)
    }

    pub async fn get_mess_options(&self) -> AppResult<Vec<MessOption>> {
        let mut cursor = self
            .db
            .mess_options
            .find(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out: Vec<MessOption> = Vec::new();
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let doc: bson::Document = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            let item: MessOption = bson::from_bson(bson::Bson::Document(doc))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(item);
        }
        Ok(out)
    }

    pub async fn get_payment_info(&self) -> AppResult<PaymentInfo> {
        let doc = self
            .db
            .payment_info
            .find_one(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        match doc {
            Some(d) => bson::from_bson::<PaymentInfo>(bson::Bson::Document(d))
                .map_err(|e| AppError::Internal(e.to_string())),
            None => Err(AppError::NotFound("Payment info not found.".into())),
        }
    }

    // ---- Admin write helpers (shared with admin service) ----

    pub async fn create_event(&self, input: EventInput) -> AppResult<Event> {
        let slug = input.slug.unwrap_or_else(|| slugify(&input.name));
        if self
            .db
            .events
            .count_documents(doc! { "slug": &slug }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            > 0
        {
            return Err(AppError::Validation("Event slug already exists.".into()));
        }
        let now = crate::database::now();
        let mut doc = bson::to_document(&Event {
            id: None,
            slug,
            name: input.name,
            category: input.category,
            description: input.description,
            rules: input.rules,
            image_url: input.image_url.unwrap_or_default(),
            start_time: parse_iso(input.start_time.as_deref()),
            end_time: parse_iso(input.end_time.as_deref()),
            venue: input.venue,
            prize_pool: input.prize_pool.unwrap_or(0),
            prize_breakdown: input
                .prize_breakdown
                .unwrap_or_default()
                .into_iter()
                .map(|p| crate::models::event::Prize { position: p.position, amount: p.amount })
                .collect(),
            registration_fee: input.registration_fee.unwrap_or(0),
            team_size: input.team_size.unwrap_or(crate::models::event::TeamSize { min: 1, max: 1 }),
            registration_open: input.registration_open.unwrap_or(true),
            contact: input.contact.unwrap_or(crate::models::event::Contact { name: String::new(), phone: String::new() }),
            created_at: Some(now),
            updated_at: Some(now),
        })
        .map_err(|e| AppError::Internal(e.to_string()))?;
        rename_timestamp_fields(
            &mut doc,
            &[
                ("createdAt", "created_at"),
                ("updatedAt", "updated_at"),
                ("startTime", "start_time"),
                ("endTime", "end_time"),
            ],
        );
        doc.insert("created_at", now);
        doc.insert("updated_at", now);
        let result = self
            .db
            .events
            .insert_one(doc, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let id = result.inserted_id.as_object_id().unwrap_or_default();
        self.get_event(&id.to_hex()).await
    }

    pub async fn update_event(&self, id: &str, input: EventInput) -> AppResult<Event> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid event id.".into()))?;
        let now = crate::database::now();
        let mut doc = doc! {};
        if let Some(slug) = &input.slug {
            doc.insert("slug", slug);
        }
        doc.insert("name", input.name);
        doc.insert("category", input.category);
        doc.insert("description", input.description);
        doc.insert("rules", input.rules);
        doc.insert("image_url", input.image_url.unwrap_or_default());
        if let Some(st) = &input.start_time {
            doc.insert("start_time", parse_iso(Some(st)));
        }
        if let Some(et) = &input.end_time {
            doc.insert("end_time", parse_iso(Some(et)));
        }
        doc.insert("venue", input.venue);
        doc.insert("prize_pool", input.prize_pool.unwrap_or(0));
        doc.insert(
            "prize_breakdown",
            input
                .prize_breakdown
                .unwrap_or_default()
                .into_iter()
                .map(|p| {
                    doc! {
                        "position": p.position,
                        "amount": p.amount
                    }
                })
                .collect::<Vec<_>>(),
        );
        doc.insert("registration_fee", input.registration_fee.unwrap_or(0));
        doc.insert(
            "team_size",
            doc! {
                "min": input.team_size.as_ref().map(|t| t.min).unwrap_or(1),
                "max": input.team_size.as_ref().map(|t| t.max).unwrap_or(1)
            },
        );
        doc.insert("registration_open", input.registration_open.unwrap_or(true));
        let contact = input.contact.as_ref();
        doc.insert(
            "contact",
            doc! {
                "name": contact.map(|c| c.name.as_str()).unwrap_or(""),
                "phone": contact.map(|c| c.phone.as_str()).unwrap_or("")
            },
        );
        doc.insert("updated_at", now);

        self.db
            .events
            .update_one(doc! { "_id": oid }, doc! { "$set": doc }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        self.get_event(id).await
    }

    pub async fn delete_event(&self, id: &str) -> AppResult<()> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid event id.".into()))?;
        let res = self
            .db
            .events
            .delete_one(doc! { "_id": oid }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if res.deleted_count == 0 {
            return Err(AppError::NotFound("Event not found.".into()));
        }
        Ok(())
    }

    pub async fn create_workshop(&self, input: WorkshopInput) -> AppResult<Workshop> {
        let now = crate::database::now();
        let mut doc = bson::to_document(&Workshop {
            id: None,
            title: input.title,
            description: input.description,
            image_url: input.image_url.unwrap_or_default(),
            speaker: input.speaker,
            start_time: parse_iso(input.start_time.as_deref()),
            end_time: parse_iso(input.end_time.as_deref()),
            venue: input.venue,
            fee: input.fee.unwrap_or(0),
            seats_total: input.seats_total.unwrap_or(0),
            seats_left: input.seats_left.unwrap_or(0),
            created_at: Some(now),
            updated_at: Some(now),
        })
        .map_err(|e| AppError::Internal(e.to_string()))?;
        rename_timestamp_fields(
            &mut doc,
            &[
                ("createdAt", "created_at"),
                ("updatedAt", "updated_at"),
                ("startTime", "start_time"),
                ("endTime", "end_time"),
            ],
        );
        doc.insert("created_at", now);
        doc.insert("updated_at", now);
        let result = self
            .db
            .workshops
            .insert_one(doc, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let id = result.inserted_id.as_object_id().unwrap_or_default();
        let doc = self
            .db
            .workshops
            .find_one(doc! { "_id": id }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::NotFound("Workshop not found after create.".into()))?;
        bson::from_bson(bson::Bson::Document(doc)).map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn update_workshop(&self, id: &str, input: WorkshopInput) -> AppResult<Workshop> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid workshop id.".into()))?;
        let now = crate::database::now();
        let mut doc = doc! {};
        doc.insert("title", input.title);
        doc.insert("description", input.description);
        doc.insert("image_url", input.image_url.unwrap_or_default());
        doc.insert("speaker", input.speaker);
        if let Some(st) = &input.start_time {
            doc.insert("start_time", parse_iso(Some(st)));
        }
        if let Some(et) = &input.end_time {
            doc.insert("end_time", parse_iso(Some(et)));
        }
        doc.insert("venue", input.venue);
        doc.insert("fee", input.fee.unwrap_or(0));
        doc.insert("seats_total", input.seats_total.unwrap_or(0));
        doc.insert("seats_left", input.seats_left.unwrap_or(0));
        doc.insert("updated_at", now);
        self.db
            .workshops
            .update_one(doc! { "_id": oid }, doc! { "$set": doc }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let doc = self
            .db
            .workshops
            .find_one(doc! { "_id": oid }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::NotFound("Workshop not found.".into()))?;
        bson::from_bson(bson::Bson::Document(doc)).map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn delete_workshop(&self, id: &str) -> AppResult<()> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid workshop id.".into()))?;
        let res = self
            .db
            .workshops
            .delete_one(doc! { "_id": oid }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if res.deleted_count == 0 {
            return Err(AppError::NotFound("Workshop not found.".into()));
        }
        Ok(())
    }

    pub async fn create_team_member(&self, input: crate::models::team::TeamMemberInput) -> AppResult<TeamMember> {
        let now = crate::database::now();
        let mut doc = bson::to_document(&crate::models::team::TeamMember {
            id: None,
            name: input.name,
            role: input.role,
            department: input.department,
            photo_url: input.photo_url.unwrap_or_default(),
            email: input.email,
            linkedin_url: input.linkedin_url.unwrap_or_default(),
            order: input.order.unwrap_or(9999),
            created_at: Some(now),
            updated_at: Some(now),
        })
        .map_err(|e| AppError::Internal(e.to_string()))?;
        rename_timestamp_fields(
            &mut doc,
            &[("createdAt", "created_at"), ("updatedAt", "updated_at")],
        );
        doc.insert("created_at", now);
        doc.insert("updated_at", now);
        let result = self
            .db
            .team_members
            .insert_one(doc, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let id = result.inserted_id.as_object_id().unwrap_or_default();
        let doc = self
            .db
            .team_members
            .find_one(doc! { "_id": id }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::NotFound("Team member not found after create.".into()))?;
        bson::from_bson(bson::Bson::Document(doc)).map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn update_team_member(&self, id: &str, input: crate::models::team::TeamMemberInput) -> AppResult<TeamMember> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid team member id.".into()))?;
        let now = crate::database::now();
        let mut doc = doc! {};
        doc.insert("name", input.name);
        doc.insert("role", input.role);
        doc.insert("department", input.department);
        doc.insert("photo_url", input.photo_url.unwrap_or_default());
        doc.insert("email", input.email);
        doc.insert("linkedin_url", input.linkedin_url.unwrap_or_default());
        doc.insert("order", input.order.unwrap_or(9999));
        doc.insert("updated_at", now);
        self.db
            .team_members
            .update_one(doc! { "_id": oid }, doc! { "$set": doc }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let doc = self
            .db
            .team_members
            .find_one(doc! { "_id": oid }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::NotFound("Team member not found.".into()))?;
        bson::from_bson(bson::Bson::Document(doc)).map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn delete_team_member(&self, id: &str) -> AppResult<()> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid team member id.".into()))?;
        let res = self
            .db
            .team_members
            .delete_one(doc! { "_id": oid }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if res.deleted_count == 0 {
            return Err(AppError::NotFound("Team member not found.".into()));
        }
        Ok(())
    }

    pub async fn create_sponsor(&self, input: crate::models::sponsor::SponsorInput) -> AppResult<Sponsor> {
        let now = crate::database::now();
        let mut doc = bson::to_document(&crate::models::sponsor::Sponsor {
            id: None,
            name: input.name,
            tier: input.tier,
            logo_url: input.logo_url.unwrap_or_default(),
            website_url: input.website_url,
            created_at: Some(now),
            updated_at: Some(now),
        })
        .map_err(|e| AppError::Internal(e.to_string()))?;
        rename_timestamp_fields(
            &mut doc,
            &[("createdAt", "created_at"), ("updatedAt", "updated_at")],
        );
        doc.insert("created_at", now);
        doc.insert("updated_at", now);
        let result = self
            .db
            .sponsors
            .insert_one(doc, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let id = result.inserted_id.as_object_id().unwrap_or_default();
        let doc = self
            .db
            .sponsors
            .find_one(doc! { "_id": id }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::NotFound("Sponsor not found after create.".into()))?;
        bson::from_bson(bson::Bson::Document(doc)).map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn update_sponsor(&self, id: &str, input: crate::models::sponsor::SponsorInput) -> AppResult<Sponsor> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid sponsor id.".into()))?;
        let now = crate::database::now();
        let mut doc = doc! {};
        doc.insert("name", input.name);
        doc.insert("tier", input.tier);
        doc.insert("logo_url", input.logo_url.unwrap_or_default());
        doc.insert("website_url", input.website_url);
        doc.insert("updated_at", now);
        self.db
            .sponsors
            .update_one(doc! { "_id": oid }, doc! { "$set": doc }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let doc = self
            .db
            .sponsors
            .find_one(doc! { "_id": oid }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::NotFound("Sponsor not found.".into()))?;
        bson::from_bson(bson::Bson::Document(doc)).map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn delete_sponsor(&self, id: &str) -> AppResult<()> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid sponsor id.".into()))?;
        let res = self
            .db
            .sponsors
            .delete_one(doc! { "_id": oid }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if res.deleted_count == 0 {
            return Err(AppError::NotFound("Sponsor not found.".into()));
        }
        Ok(())
    }

    pub async fn update_fest(&self, input: FestInfoInput) -> AppResult<FestInfo> {
        let now = crate::database::now();
        let doc = doc! {
            "name": &input.name,
            "tagline": &input.tagline,
            "start_date": parse_iso(input.start_date.as_deref()),
            "end_date": parse_iso(input.end_date.as_deref()),
            "venue": &input.venue,
            "about_html": &input.about_html,
            "hero_image_url": input.hero_image_url.unwrap_or_default(),
            "contact_email": &input.contact_email,
            "contact_phone": &input.contact_phone,
            "updated_at": now,
        };
        let filter = doc! {};
        let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
        self.db
            .fest_info
            .update_one(filter, doc! { "$set": doc }, Some(options))
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        self.get_fest().await
    }

    pub async fn update_payment_info(&self, input: crate::models::payment::PaymentInfoInput) -> AppResult<PaymentInfo> {
        let now = crate::database::now();
        let doc = doc! {
            "qr_image_url": input.qr_image_url.unwrap_or_default(),
            "upi_id": &input.upi_id,
            "note": input.note.unwrap_or_default(),
            "updated_at": now,
        };
        let filter = doc! {};
        let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
        self.db
            .payment_info
            .update_one(filter, doc! { "$set": doc }, Some(options))
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        self.get_payment_info().await
    }

    pub async fn update_mess_option(&self, id: &str, input: crate::models::mess::MessOptionInput) -> AppResult<MessOption> {
        let now = crate::database::now();
        let mut doc = doc! {};
        doc.insert("name", input.name);
        doc.insert("description", input.description);
        doc.insert("price", input.price.unwrap_or(0));
        doc.insert("image_url", input.image_url.unwrap_or_default());
        doc.insert("updated_at", now);
        // id is a string in mock ("pine"/"oak"/"alder"); try ObjectId first then string.
        let oid_res = oid_from_hex(id);
        let updated = match oid_res {
            Ok(oid) => self
                .db
                .mess_options
                .find_one_and_update(
                    doc! { "_id": oid },
                    doc! { "$set": doc },
                    mongodb::options::FindOneAndUpdateOptions::builder()
                        .return_document(mongodb::options::ReturnDocument::After)
                        .build(),
                )
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?,
            Err(_) => self
                .db
                .mess_options
                .find_one_and_update(
                    doc! { "_id": id },
                    doc! { "$set": doc },
                    mongodb::options::FindOneAndUpdateOptions::builder()
                        .return_document(mongodb::options::ReturnDocument::After)
                        .build(),
                )
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?,
        };
        match updated {
            Some(d) => bson::from_bson::<MessOption>(bson::Bson::Document(d)).map_err(|e| AppError::Internal(e.to_string())),
            None => Err(AppError::NotFound("Mess option not found.".into())),
        }
    }

    pub async fn create_ambassador(&self, input: AmbassadorInput) -> AppResult<Ambassador> {
        let exists = self
            .db
            .ambassadors
            .count_documents(doc! { "email": &input.email }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if exists > 0 {
            return Err(AppError::Conflict(
                "An application with this email already exists.".into(),
            ));
        }
        let now = crate::database::now();
        let doc = doc! {
            "name": &input.name,
            "email": &input.email,
            "phone": &input.phone,
            "college": &input.college,
            "city": &input.city,
            "course": &input.course,
            "year": &input.year,
            "social_link": &input.social_link,
            "motivation": &input.motivation,
            "reach": &input.reach,
            "status": "pending",
            "created_at": now,
            "updated_at": now,
        };
        let result = self
            .db
            .ambassadors
            .insert_one(doc, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let id = result.inserted_id.as_object_id().unwrap_or_default();
        let doc = self
            .db
            .ambassadors
            .find_one(doc! { "_id": id }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::NotFound("Ambassador not found after create.".into()))?;
        bson::from_bson::<Ambassador>(bson::Bson::Document(doc))
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn list_ambassadors(&self) -> AppResult<Vec<Ambassador>> {
        let mut cursor = self
            .db
            .ambassadors
            .find(doc! {}, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut out: Vec<Ambassador> = Vec::new();
        while cursor.advance().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let doc: bson::Document = cursor.deserialize_current().map_err(|e| AppError::Internal(e.to_string()))?;
            let item: Ambassador = bson::from_bson(bson::Bson::Document(doc))
                .map_err(|e| AppError::Internal(e.to_string()))?;
            out.push(item);
        }
        Ok(out)
    }

    pub async fn update_ambassador_status(&self, id: &str, status: &str) -> AppResult<Ambassador> {
        let oid = oid_from_hex(id).map_err(|_| AppError::NotFound("Invalid ambassador id.".into()))?;
        let now = crate::database::now();
        let doc = self
            .db
            .ambassadors
            .find_one_and_update(
                doc! { "_id": oid },
                doc! { "$set": { "status": status, "updated_at": now } },
                mongodb::options::FindOneAndUpdateOptions::builder()
                    .return_document(mongodb::options::ReturnDocument::After)
                    .build(),
            )
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        match doc {
            Some(d) => bson::from_bson::<Ambassador>(bson::Bson::Document(d))
                .map_err(|e| AppError::Internal(e.to_string())),
            None => Err(AppError::NotFound("Ambassador not found.".into())),
        }
    }
}

fn slugify(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn rename_timestamp_fields(doc: &mut Document, fields: &[(&str, &str)]) {
    for (camel_case, snake_case) in fields {
        if let Some(value) = doc.remove(*camel_case) {
            doc.insert(*snake_case, value);
        }
    }
}

fn parse_iso(s: Option<&str>) -> Option<bson::DateTime> {
    let s = s?;
    let dt = chrono::DateTime::parse_from_rfc3339(s)
        .map(|d| d.with_timezone(&chrono::Utc))
        .or_else(|_| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S")
                .map(|d| d.and_utc())
        })
        .ok()?;
    Some(bson::DateTime::from_millis(dt.timestamp_millis()))
}

#[cfg(test)]
mod tests {
    use super::rename_timestamp_fields;
    use crate::models::sponsor::Sponsor;
    use bson::{doc, DateTime};

    #[test]
    fn model_timestamps_do_not_duplicate_snake_case_aliases() {
        let timestamp = DateTime::from_millis(1_700_000_000_000);
        let mut document = bson::to_document(&Sponsor {
            id: None,
            name: "Sponsor".into(),
            tier: "Partner".into(),
            logo_url: String::new(),
            website_url: String::new(),
            created_at: Some(timestamp),
            updated_at: Some(timestamp),
        })
        .unwrap();

        rename_timestamp_fields(
            &mut document,
            &[("createdAt", "created_at"), ("updatedAt", "updated_at")],
        );
        document.insert("created_at", timestamp);
        document.insert("updated_at", timestamp);

        assert!(!document.contains_key("createdAt"));
        assert!(!document.contains_key("updatedAt"));
        assert_eq!(
            bson::from_document::<Sponsor>(document).unwrap().created_at,
            Some(timestamp)
        );

        let legacy_duplicate = doc! {
            "createdAt": timestamp.to_rfc3339_string(),
            "created_at": timestamp,
        };
        assert!(bson::from_document::<Sponsor>(legacy_duplicate).is_err());
    }
}
