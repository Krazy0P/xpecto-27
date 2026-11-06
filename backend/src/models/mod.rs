use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

pub mod admin;
pub mod ambassador;
pub mod event;
pub mod fest;
pub mod mess;
pub mod payment;
pub mod registration;
pub mod sponsor;
pub mod team;
pub mod user;
pub mod workshop;

/// Serialize an ObjectId as its hex string.
pub fn serialize_oid<S>(oid: &Option<ObjectId>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    match oid {
        Some(oid) => serializer.serialize_str(&oid.to_hex()),
        None => serializer.serialize_str(""),
    }
}

/// Serialize a DateTime as an ISO-8601 string.
pub fn serialize_dt<S>(dt: &Option<DateTime>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    match dt {
        Some(dt) => serializer.serialize_str(&dt.to_rfc3339_string()),
        None => serializer.serialize_str(""),
    }
}
