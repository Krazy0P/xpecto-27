use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessOption {
    #[serde(alias = "_id", serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub description: String,
    pub price: i64,
    pub image_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessOptionInput {
    pub name: String,
    pub description: String,
    pub price: Option<i64>,
    pub image_url: Option<String>,
}
