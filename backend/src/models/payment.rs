use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentInfo {
    #[serde(rename(serialize = "id", deserialize = "_id"), serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    #[serde(alias = "qr_image_url")]
    pub qr_image_url: String,
    #[serde(alias = "upi_id")]
    pub upi_id: String,
    #[serde(alias = "note")]
    pub note: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentInfoInput {
    pub qr_image_url: Option<String>,
    pub upi_id: String,
    pub note: Option<String>,
}
