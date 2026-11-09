use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{deserialize_dt, serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ambassador {
    #[serde(rename(serialize = "id", deserialize = "_id"), serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub college: String,
    pub city: String,
    pub course: String,
    pub year: String,
    #[serde(default, alias = "social_link")]
    pub social_link: String,
    pub motivation: String,
    pub reach: String,
    pub status: String,
    #[serde(
        default,
        alias = "created_at",
        deserialize_with = "deserialize_dt",
        serialize_with = "serialize_dt"
    )]
    pub created_at: Option<DateTime>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AmbassadorInput {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub college: String,
    pub city: String,
    pub course: String,
    pub year: String,
    pub social_link: String,
    pub motivation: String,
    pub reach: String,
}
