use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    #[serde(alias = "_id", serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub slug: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub rules: String,
    pub image_url: String,
    pub start_time: Option<DateTime>,
    pub end_time: Option<DateTime>,
    pub venue: String,
    pub prize_pool: i64,
    pub prize_breakdown: Vec<Prize>,
    pub registration_fee: i64,
    pub team_size: TeamSize,
    pub registration_open: bool,
    pub contact: Contact,
    #[serde(serialize_with = "serialize_dt")]
    pub created_at: Option<DateTime>,
    #[serde(serialize_with = "serialize_dt")]
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
