use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::models::{serialize_oid, serialize_dt};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    #[serde(alias = "_id", serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub college: String,
    pub password_hash: String,
    pub role: String,
    #[serde(serialize_with = "serialize_dt")]
    pub created_at: Option<DateTime>,
    #[serde(serialize_with = "serialize_dt")]
    pub updated_at: Option<DateTime>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct SignupInput {
    #[validate(length(min = 2, message = "Enter your full name."))]
    pub name: String,
    #[validate(email(message = "Enter a valid email address."))]
    pub email: String,
    #[validate(length(min = 8, message = "Use at least 8 characters."))]
    pub password: String,
    #[validate(length(min = 10, max = 15, message = "Enter a 10-digit phone number."))]
    pub phone: String,
    #[validate(length(min = 1, message = "Enter your college."))]
    pub college: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserView {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub college: String,
    pub role: String,
}

impl User {
    pub fn view(&self) -> UserView {
        UserView {
            id: self.id.as_ref().map(|o| o.to_hex()).unwrap_or_default(),
            name: self.name.clone(),
            email: self.email.clone(),
            phone: self.phone.clone(),
            college: self.college.clone(),
            role: self.role.clone(),
        }
    }
}
