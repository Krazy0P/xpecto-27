use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{deserialize_dt, serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FestInfo {
    #[serde(rename(serialize = "id", deserialize = "_id"), serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub tagline: String,
    #[serde(
        default,
        alias = "start_date",
        deserialize_with = "deserialize_dt",
        serialize_with = "serialize_dt"
    )]
    pub start_date: Option<DateTime>,
    #[serde(
        default,
        alias = "end_date",
        deserialize_with = "deserialize_dt",
        serialize_with = "serialize_dt"
    )]
    pub end_date: Option<DateTime>,
    pub venue: String,
    #[serde(alias = "about_html")]
    pub about_html: String,
    #[serde(alias = "hero_image_url")]
    pub hero_image_url: String,
    #[serde(alias = "contact_email")]
    pub contact_email: String,
    #[serde(alias = "contact_phone")]
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
