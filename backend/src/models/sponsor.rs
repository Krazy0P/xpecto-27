use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sponsor {
    #[serde(alias = "_id", serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub tier: String,
    #[serde(alias = "logo_url")]
    pub logo_url: String,
    #[serde(alias = "website_url")]
    pub website_url: String,
    #[serde(alias = "created_at", serialize_with = "serialize_dt")]
    pub created_at: Option<DateTime>,
    #[serde(alias = "updated_at", serialize_with = "serialize_dt")]
    pub updated_at: Option<DateTime>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SponsorInput {
    pub name: String,
    pub tier: String,
    pub logo_url: Option<String>,
    pub website_url: String,
}
