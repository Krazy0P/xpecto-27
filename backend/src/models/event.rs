use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{deserialize_dt, serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    #[serde(rename(serialize = "id", deserialize = "_id"), serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub slug: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub rules: String,
    #[serde(alias = "image_url")]
    pub image_url: String,
    #[serde(default, alias = "start_time", deserialize_with = "deserialize_dt")]
    pub start_time: Option<DateTime>,
    #[serde(default, alias = "end_time", deserialize_with = "deserialize_dt")]
    pub end_time: Option<DateTime>,
    pub venue: String,
    #[serde(alias = "prize_pool")]
    pub prize_pool: i64,
    #[serde(alias = "prize_breakdown")]
    pub prize_breakdown: Vec<Prize>,
    #[serde(alias = "registration_fee")]
    pub registration_fee: i64,
    #[serde(alias = "team_size")]
    pub team_size: TeamSize,
    #[serde(alias = "registration_open")]
    pub registration_open: bool,
    #[serde(alias = "contact")]
    pub contact: Contact,
    #[serde(
        default,
        alias = "created_at",
        deserialize_with = "deserialize_dt",
        serialize_with = "serialize_dt"
    )]
    pub created_at: Option<DateTime>,
    #[serde(
        default,
        alias = "updated_at",
        deserialize_with = "deserialize_dt",
        serialize_with = "serialize_dt"
    )]
    pub updated_at: Option<DateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Prize {
    pub position: String,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamSize {
    pub min: i32,
    pub max: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Contact {
    pub name: String,
    pub phone: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventInput {
    pub slug: Option<String>,
    pub name: String,
    pub category: String,
    pub description: String,
    pub rules: String,
    pub image_url: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub venue: String,
    pub prize_pool: Option<i64>,
    pub prize_breakdown: Option<Vec<Prize>>,
    pub registration_fee: Option<i64>,
    pub team_size: Option<TeamSize>,
    pub registration_open: Option<bool>,
    pub contact: Option<Contact>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrizeInput {
    pub position: String,
    pub amount: i64,
}
