use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FestInfo {
    #[serde(alias = "_id", serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub tagline: String,
    pub start_date: Option<DateTime>,
    pub end_date: Option<DateTime>,
    pub venue: String,
    pub about_html: String,
    pub hero_image_url: String,
    pub contact_email: String,
    pub contact_phone: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FestInfoInput {
    pub name: String,
    pub tagline: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub venue: String,
    pub about_html: String,
    pub hero_image_url: Option<String>,
    pub contact_email: String,
    pub contact_phone: String,
}
