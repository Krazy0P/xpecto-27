use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{deserialize_dt, serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Admin {
    #[serde(rename(serialize = "id", deserialize = "_id"), serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub email: String,
    #[serde(
        default,
        deserialize_with = "deserialize_dt",
        serialize_with = "serialize_dt"
    )]
    pub created_at: Option<DateTime>,
}

#[derive(Debug, Deserialize)]
pub struct AddAdminInput {
    pub email: String,
}
