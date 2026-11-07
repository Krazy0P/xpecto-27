use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamMember {
    #[serde(alias = "_id", serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub role: String,
    pub department: String,
    #[serde(alias = "photo_url")]
    pub photo_url: String,
    pub email: String,
    #[serde(alias = "linkedin_url")]
    pub linkedin_url: String,
    pub order: i32,
    #[serde(alias = "created_at", serialize_with = "serialize_dt")]
    pub created_at: Option<DateTime>,
    #[serde(alias = "updated_at", serialize_with = "serialize_dt")]
    pub updated_at: Option<DateTime>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamMemberInput {
    pub name: String,
    pub role: String,
    pub department: String,
    pub photo_url: Option<String>,
    pub email: String,
    pub linkedin_url: Option<String>,
    pub order: Option<i32>,
}
