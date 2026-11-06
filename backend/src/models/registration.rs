use bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

use crate::models::{serialize_dt, serialize_oid};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Registration {
    #[serde(alias = "_id", serialize_with = "serialize_oid")]
    pub id: Option<ObjectId>,
    pub kind: String,
    pub user_id: ObjectId,
    pub target_id: Option<ObjectId>,
    pub target_name: String,
    pub mess_option: Option<ObjectId>,
    pub mess_name: String,
    pub transaction_id: String,
    pub screenshot_url: String,
    pub status: String,
    pub amount: i64,
    pub team_name: Option<String>,
    pub team_members: Vec<TeamMemberReg>,
    pub rejection_reason: Option<String>,
    pub confirmation_qr_url: Option<String>,
    #[serde(serialize_with = "serialize_dt")]
    pub created_at: Option<DateTime>,
    #[serde(serialize_with = "serialize_dt")]
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
