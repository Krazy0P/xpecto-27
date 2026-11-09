use bson::{oid::ObjectId, DateTime};
use serde::{de::Error, Deserialize, Serialize};

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

/// Read native BSON datetimes and legacy ISO-8601 strings written by older versions.
pub fn deserialize_dt<'de, D>(deserializer: D) -> Result<Option<DateTime>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Timestamp {
        DateTime(DateTime),
        String(String),
    }

    let value = Option::<Timestamp>::deserialize(deserializer)?;
    value
        .map(|value| match value {
            Timestamp::DateTime(dt) => Ok(Some(dt)),
            Timestamp::String(value) if value.trim().is_empty() => Ok(None),
            Timestamp::String(value) => {
                let millis = chrono::DateTime::parse_from_rfc3339(&value)
                    .map(|dt| dt.timestamp_millis())
                    .or_else(|_| {
                        chrono::NaiveDateTime::parse_from_str(&value, "%Y-%m-%dT%H:%M:%S")
                            .map(|dt| dt.and_utc().timestamp_millis())
                    })
                    .map_err(D::Error::custom)?;
                Ok(Some(DateTime::from_millis(millis)))
            }
        })
        .transpose()
        .map(Option::flatten)
}

#[cfg(test)]
mod tests {
    use super::{deserialize_dt, serialize_dt};
    use bson::{doc, Bson, DateTime};
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Deserialize, Serialize)]
    struct TimestampRecord {
        #[serde(
            default,
            deserialize_with = "deserialize_dt",
            serialize_with = "serialize_dt"
        )]
        timestamp: Option<DateTime>,
    }

    #[test]
    fn timestamps_keep_json_format_and_read_native_bson() {
        let timestamp = DateTime::from_millis(1_700_000_000_000);
        let record = TimestampRecord {
            timestamp: Some(timestamp),
        };

        assert_eq!(
            bson::from_document::<TimestampRecord>(doc! {
                "timestamp": Bson::DateTime(timestamp)
            })
            .unwrap()
            .timestamp,
            Some(timestamp)
        );
        assert_eq!(
            serde_json::to_value(&record).unwrap()["timestamp"],
            timestamp.to_rfc3339_string()
        );
    }

    #[test]
    fn timestamps_read_legacy_iso_strings_and_empty_values() {
        let timestamp = DateTime::from_millis(1_700_000_000_000);
        let legacy = doc! { "timestamp": timestamp.to_rfc3339_string() };
        assert_eq!(
            bson::from_document::<TimestampRecord>(legacy)
                .unwrap()
                .timestamp,
            Some(timestamp)
        );
        assert_eq!(
            bson::from_document::<TimestampRecord>(doc! { "timestamp": "" })
                .unwrap()
                .timestamp,
            None
        );
        assert_eq!(
            bson::from_document::<TimestampRecord>(doc! {})
                .unwrap()
                .timestamp,
            None
        );
    }
}
