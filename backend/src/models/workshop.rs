use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workshop {
    #[serde(alias = "_id", serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub description: String,
    #[serde(alias = "image_url")]
    pub image_url: String,
    pub speaker: String,
    #[serde(alias = "start_time")]
    pub start_time: Option<DateTime>,
    #[serde(alias = "end_time")]
    pub end_time: Option<DateTime>,
    pub venue: String,
    pub fee: i64,
    #[serde(alias = "seats_total")]
    pub seats_total: i32,
    #[serde(alias = "seats_left")]
    pub seats_left: i32,
    #[serde(alias = "created_at", serialize_with = "serialize_dt")]
    pub created_at: Option<DateTime>,
    #[serde(alias = "updated_at", serialize_with = "serialize_dt")]
    pub updated_at: Option<DateTime>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkshopInput {
    pub title: String,
    pub description: String,
    pub image_url: Option<String>,
    pub speaker: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub venue: String,
    pub fee: Option<i64>,
    pub seats_total: Option<i32>,
    pub seats_left: Option<i32>,
}
