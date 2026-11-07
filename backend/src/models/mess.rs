use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessOption {
    #[serde(alias = "_id")]
    pub id: Option<String>,
    pub name: String,
    #[serde(alias = "description")]
    pub description: String,
    pub price: i64,
    #[serde(alias = "image_url")]
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
