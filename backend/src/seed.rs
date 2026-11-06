use mongodb::bson::{doc, oid::ObjectId, DateTime};
use serde_json::Value;
use std::path::PathBuf;
use tracing::{info, warn};

use crate::database::AppDatabase;

pub struct Seed;

impl Seed {
    pub async fn run_if_empty(db: &AppDatabase, seed_dir: &std::path::Path) -> anyhow::Result<()> {
        let count = db.fest_info.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_fest(db, seed_dir.join("fest.json")).await?;
        }

        let count = db.events.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_events(db, seed_dir.join("events.json")).await?;
        }

        let count = db.workshops.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_workshops(db, seed_dir.join("workshops.json")).await?;
        }

        let count = db.team_members.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_team(db, seed_dir.join("team.json")).await?;
        }

        let count = db.sponsors.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_sponsors(db, seed_dir.join("sponsors.json")).await?;
        }

        let count = db.mess_options.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_mess(db, seed_dir.join("mess.json")).await?;
        }

        let count = db.payment_info.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_payment(db, seed_dir.join("payment.json")).await?;
        }

        let exists = db
            .admins
            .count_documents(
                doc! { "email": crate::services::auth_service::DEFAULT_ADMIN_EMAIL },
                None,
            )
            .await?;
        if exists == 0 {
            let now = DateTime::now();
            db.admins
                .insert_one(
                    doc! { "email": crate::services::auth_service::DEFAULT_ADMIN_EMAIL, "created_at": now },
                    None,
                )
                .await?;
            info!("seeded default admin email");
        }

        info!("Seed complete");
        Ok(())
    }

    fn read_json(path: PathBuf) -> anyhow::Result<Value> {
        let text = std::fs::read_to_string(path)?;
        Ok(serde_json::from_str(&text)?)
    }

    async fn seed_fest(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let now = DateTime::now();
        let doc = doc! {
            "name": data.get("name").and_then(|v| v.as_str()).unwrap_or("XPECTO"),
            "tagline": data.get("tagline").and_then(|v| v.as_str()).unwrap_or("TechFest"),
            "start_date": parse_iso(data.get("startDate").and_then(|v| v.as_str()).unwrap_or("")),
            "end_date": parse_iso(data.get("endDate").and_then(|v| v.as_str()).unwrap_or("")),
            "venue": data.get("venue").and_then(|v| v.as_str()).unwrap_or(""),
            "about_html": data.get("aboutHtml").and_then(|v| v.as_str()).unwrap_or(""),
            "hero_image_url": data.get("heroImageUrl").and_then(|v| v.as_str()).unwrap_or(""),
            "contact_email": data.get("contactEmail").and_then(|v| v.as_str()).unwrap_or(""),
            "contact_phone": data.get("contactPhone").and_then(|v| v.as_str()).unwrap_or(""),
            "created_at": now,
            "updated_at": now,
        };
        db.fest_info.insert_one(doc, None).await?;
        info!("seeded fest info");
        Ok(())
    }

    async fn seed_events(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let arr = data.as_array().cloned().unwrap_or_default();
        for item in arr.iter() {
            let now = DateTime::now();
            let prize_breakdown: Vec<bson::Bson> = item
                .get("prizeBreakdown")
                .and_then(|v| v.as_array())
                .unwrap_or(&Vec::new())
                .iter()
                .map(|p| {
                    bson::Bson::Document(doc! {
                        "position": p.get("position").and_then(|v| v.as_str()).unwrap_or(""),
                        "amount": p.get("amount").and_then(|v| v.as_i64()).unwrap_or(0),
                    })
                })
                .collect();
            let ts = item.get("teamSize").and_then(|v| v.as_object()).cloned().unwrap_or_default();
            let contact = item.get("contact").and_then(|v| v.as_object()).cloned().unwrap_or_default();
            let doc = doc! {
                "slug": item.get("slug").and_then(|v| v.as_str()).unwrap_or(""),
                "name": item.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                "category": item.get("category").and_then(|v| v.as_str()).unwrap_or(""),
                "description": item.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                "rules": item.get("rules").and_then(|v| v.as_str()).unwrap_or(""),
                "image_url": item.get("imageUrl").and_then(|v| v.as_str()).unwrap_or(""),
                "start_time": parse_iso(item.get("startTime").and_then(|v| v.as_str()).unwrap_or("")),
                "end_time": parse_iso(item.get("endTime").and_then(|v| v.as_str()).unwrap_or("")),
                "venue": item.get("venue").and_then(|v| v.as_str()).unwrap_or(""),
                "prize_pool": item.get("prizePool").and_then(|v| v.as_i64()).unwrap_or(0),
                "prize_breakdown": prize_breakdown,
                "registration_fee": item.get("registrationFee").and_then(|v| v.as_i64()).unwrap_or(0),
                "team_size": doc! {
                    "min": ts.get("min").and_then(|v| v.as_i64()).unwrap_or(1) as i32,
                    "max": ts.get("max").and_then(|v| v.as_i64()).unwrap_or(1) as i32,
                },
                "registration_open": item.get("registrationOpen").and_then(|v| v.as_bool()).unwrap_or(true),
                "contact": doc! {
                    "name": contact.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                    "phone": contact.get("phone").and_then(|v| v.as_str()).unwrap_or(""),
                },
                "created_at": now,
                "updated_at": now,
            };
            db.events.insert_one(doc, None).await?;
        }
        info!("seeded {} events", arr.len());
        Ok(())
    }

    async fn seed_workshops(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let arr = data.as_array().cloned().unwrap_or_default();
        for item in arr.iter() {
            let now = DateTime::now();
            let doc = doc! {
                "title": item.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                "description": item.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                "image_url": item.get("imageUrl").and_then(|v| v.as_str()).unwrap_or(""),
                "speaker": item.get("speaker").and_then(|v| v.as_str()).unwrap_or(""),
                "start_time": parse_iso(item.get("startTime").and_then(|v| v.as_str()).unwrap_or("")),
                "end_time": parse_iso(item.get("endTime").and_then(|v| v.as_str()).unwrap_or("")),
                "venue": item.get("venue").and_then(|v| v.as_str()).unwrap_or(""),
                "fee": item.get("fee").and_then(|v| v.as_i64()).unwrap_or(0),
                "seats_total": item.get("seatsTotal").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                "seats_left": item.get("seatsLeft").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                "created_at": now,
                "updated_at": now,
            };
            db.workshops.insert_one(doc, None).await?;
        }
        info!("seeded {} workshops", arr.len());
        Ok(())
    }

    async fn seed_team(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let arr = data.as_array().cloned().unwrap_or_default();
        for item in arr.iter() {
            let now = DateTime::now();
            let doc = doc! {
                "name": item.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                "role": item.get("role").and_then(|v| v.as_str()).unwrap_or("Member"),
                "department": item.get("department").and_then(|v| v.as_str()).unwrap_or(""),
                "photo_url": item.get("photoUrl").and_then(|v| v.as_str()).unwrap_or(""),
                "email": item.get("email").and_then(|v| v.as_str()).unwrap_or(""),
                "linkedin_url": item.get("linkedinUrl").and_then(|v| v.as_str()).unwrap_or(""),
                "order": item.get("order").and_then(|v| v.as_i64()).unwrap_or(9999) as i32,
                "created_at": now,
                "updated_at": now,
            };
            db.team_members.insert_one(doc, None).await?;
        }
        info!("seeded {} team members", arr.len());
        Ok(())
    }

    async fn seed_sponsors(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let arr = data.as_array().cloned().unwrap_or_default();
        for item in arr.iter() {
            let now = DateTime::now();
            let doc = doc! {
                "name": item.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                "tier": item.get("tier").and_then(|v| v.as_str()).unwrap_or("Partner"),
                "logo_url": item.get("logoUrl").and_then(|v| v.as_str()).unwrap_or(""),
                "website_url": item.get("websiteUrl").and_then(|v| v.as_str()).unwrap_or(""),
                "created_at": now,
                "updated_at": now,
            };
            db.sponsors.insert_one(doc, None).await?;
        }
        info!("seeded {} sponsors", arr.len());
        Ok(())
    }

    async fn seed_mess(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let arr = data.as_array().cloned().unwrap_or_default();
        for item in arr.iter() {
            let now = DateTime::now();
            let id = item.get("id").and_then(|v| v.as_str()).unwrap_or("mess").to_string();
            let doc = doc! {
                "_id": id,
                "name": item.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                "description": item.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                "price": item.get("price").and_then(|v| v.as_i64()).unwrap_or(0),
                "image_url": item.get("imageUrl").and_then(|v| v.as_str()).unwrap_or(""),
                "created_at": now,
                "updated_at": now,
            };
            db.mess_options.insert_one(doc, None).await?;
        }
        info!("seeded {} mess options", arr.len());
        Ok(())
    }

    async fn seed_payment(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let now = DateTime::now();
        let doc = doc! {
            "qr_image_url": data.get("qrImageUrl").and_then(|v| v.as_str()).unwrap_or(""),
            "upi_id": data.get("upiId").and_then(|v| v.as_str()).unwrap_or(""),
            "note": data.get("note").and_then(|v| v.as_str()).unwrap_or(""),
            "created_at": now,
            "updated_at": now,
        };
        db.payment_info.insert_one(doc, None).await?;
        info!("seeded payment info");
        Ok(())
    }
}

fn parse_iso(s: &str) -> Option<DateTime> {
    if s.is_empty() {
        return None;
    }
    chrono::DateTime::parse_from_rfc3339(s)
        .map(|dt| DateTime::from_millis(dt.timestamp_millis()))
        .ok()
        .or_else(|| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S")
                .map(|d| d.and_utc())
                .map(|dt| DateTime::from_millis(dt.timestamp_millis()))
                .ok()
        })
}

#[allow(dead_code)]
fn new_oid() -> ObjectId {
    ObjectId::new()
}
