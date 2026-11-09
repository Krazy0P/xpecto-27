use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{deserialize_dt, serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Registration {
    #[serde(default, rename(serialize = "id", deserialize = "_id"), serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    #[serde(default)]
    pub kind: String,
    // The database stores snake_case keys; accept those as well as camelCase.
    #[serde(alias = "user_id")]
    pub user_id: ObjectId,
    #[serde(default, alias = "target_id")]
    pub target_id: Option<ObjectId>,
    #[serde(default, alias = "target_name")]
    pub target_name: String,
    #[serde(default, alias = "mess_option")]
    pub mess_option: Option<ObjectId>,
    #[serde(default, alias = "mess_name")]
    pub mess_name: String,
    #[serde(default, alias = "transaction_id")]
    pub transaction_id: String,
    #[serde(default, alias = "screenshot_url")]
    pub screenshot_url: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub amount: i64,
    #[serde(default, alias = "team_name")]
    pub team_name: Option<String>,
    #[serde(default, alias = "team_members")]
    pub team_members: Vec<TeamMemberReg>,
    #[serde(default, alias = "rejection_reason")]
    pub rejection_reason: Option<String>,
    #[serde(default, alias = "confirmation_qr_url")]
    pub confirmation_qr_url: Option<String>,
    #[serde(default, alias = "visit_days")]
    pub visit_days: i64,
    #[serde(default, alias = "competition_names")]
    pub competition_names: Vec<String>,
    #[serde(default, alias = "payment_method")]
    pub payment_method: String,
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
pub struct TeamMemberReg {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrationView {
    pub id: String,
    pub kind: String,
    pub target_id: Option<String>,
    pub target_name: String,
    pub mess_option: Option<String>,
    pub mess_name: String,
    pub transaction_id: String,
    pub screenshot_url: String,
    pub status: String,
    pub amount: i64,
    pub team_name: Option<String>,
    pub team_members: Vec<TeamMemberReg>,
    pub created_at: String,
    pub rejection_reason: Option<String>,
    pub confirmation_qr_url: Option<String>,
    pub visit_days: i64,
    pub competition_names: Vec<String>,
    pub payment_method: String,
    pub user: Option<UserRegView>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRegView {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub college: String,
}

impl Registration {
    pub fn view(&self, user: Option<&crate::models::user::User>) -> RegistrationView {
        RegistrationView {
            id: self.id.as_ref().map(|o| o.to_hex()).unwrap_or_default(),
            kind: self.kind.clone(),
            target_id: self.target_id.map(|o| o.to_hex()),
            target_name: self.target_name.clone(),
            mess_option: self.mess_option.map(|o| o.to_hex()),
            mess_name: self.mess_name.clone(),
            transaction_id: self.transaction_id.clone(),
            screenshot_url: self.screenshot_url.clone(),
            status: self.status.clone(),
            amount: self.amount,
            team_name: self.team_name.clone(),
            team_members: self.team_members.clone(),
            created_at: self
                .created_at
                .map(|d| d.to_rfc3339_string())
                .unwrap_or_default(),
            rejection_reason: self.rejection_reason.clone(),
            confirmation_qr_url: self.confirmation_qr_url.clone(),
            visit_days: self.visit_days,
            competition_names: self.competition_names.clone(),
            payment_method: self.payment_method.clone(),
            user: user.map(|u| UserRegView {
                id: u.id.as_ref().map(|o| o.to_hex()).unwrap_or_default(),
                name: u.name.clone(),
                email: u.email.clone(),
                phone: u.phone.clone(),
                college: u.college.clone(),
            }),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RegistrationQuery {
    pub kind: Option<String>,
    pub target_id: Option<String>,
    pub status: Option<String>,
    pub mess_option: Option<String>,
}
