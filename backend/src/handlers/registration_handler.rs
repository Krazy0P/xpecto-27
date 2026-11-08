use axum::extract::{Extension, Multipart, State};
use axum::response::Json;
use serde_json::json;

use crate::middleware::AppState;
use crate::middleware::auth::{CurrentUser, require_auth};
use crate::services::registration_service::RegistrationService;
use crate::database::oid_from_hex;
use crate::errors::{AppError, AppResult};

async fn extract_text_field(mp: &mut Multipart, name: &str) -> AppResult<Option<String>> {
    while let Some(field) = mp.next_field().await.map_err(|e| AppError::Internal(e.to_string()))? {
        if field.name() == Some(name) {
            return Ok(Some(field.text().await.map_err(|e| AppError::Internal(e.to_string()))?));
        }
    }
    Ok(None)
}

async fn extract_file_field(mp: &mut Multipart, name: &str) -> AppResult<Option<(String, String, Vec<u8>)>> {
    while let Some(field) = mp.next_field().await.map_err(|e| AppError::Internal(e.to_string()))? {
        if field.name() == Some(name) {
            let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
            let file_name = field.file_name().unwrap_or("upload").to_string();
            let bytes = field.bytes().await.map_err(|e| AppError::Internal(e.to_string()))?.to_vec();
            return Ok(Some((file_name, content_type, bytes)));
        }
    }
    Ok(None)
}

pub async fn create_registration(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
    mut mp: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let upload_service = crate::services::upload_service::UploadService::new(&crate::config::Config::from_env()?);

    let kind = extract_text_field(&mut mp, "kind").await?.ok_or_else(|| AppError::Validation("kind is required".into()))?;
    let target_id_s = extract_text_field(&mut mp, "targetId").await?.ok_or_else(|| AppError::Validation("targetId is required".into()))?;
    let transaction_id = extract_text_field(&mut mp, "transactionId").await?.ok_or_else(|| AppError::Validation("transactionId is required".into()))?;
    let team_name = extract_text_field(&mut mp, "teamName").await?.unwrap_or_default();
    let team_members_s = extract_text_field(&mut mp, "teamMembers").await?.unwrap_or_default();

    let target_id = oid_from_hex(&target_id_s).map_err(|_| AppError::Validation("Invalid targetId".into()))?;
    let user_id = oid_from_hex(&current_user.id).map_err(|_| AppError::Validation("Invalid user id".into()))?;

    let (screenshot_url, amount) = match extract_file_field(&mut mp, "screenshot").await? {
        Some((file_name, content_type, bytes)) => {
            let url = upload_service.save_uploaded_file(&bytes, &content_type, &file_name).await?;
            (url, 0)
        }
        None => return Err(AppError::Validation("screenshot is required".into())),
    };

    // Determine amount from target event/workshop.
    let db = &state.db;
    let amount = if kind == "event" {
        let ev = db.events.find_one(mongodb::bson::doc! { "_id": target_id }, None).await.map_err(|e| AppError::Internal(e.to_string()))?;
        ev.map(|d| d.get_i64("registration_fee").unwrap_or(0)).unwrap_or(0)
    } else {
        let ws = db.workshops.find_one(mongodb::bson::doc! { "_id": target_id }, None).await.map_err(|e| AppError::Internal(e.to_string()))?;
        ws.map(|d| d.get_i64("fee").unwrap_or(0)).unwrap_or(0)
    };

    let team_members: Vec<crate::models::registration::TeamMemberReg> = if !team_members_s.is_empty() {
        serde_json::from_str(&team_members_s).unwrap_or_default()
    } else {
        vec![]
    };

    let svc = RegistrationService::new(db.clone());
    let target_name = if kind == "event" {
        db.events.find_one(mongodb::bson::doc! { "_id": target_id }, None).await.map_err(|e| AppError::Internal(e.to_string()))?
            .map(|d| d.get_str("name").unwrap_or("").to_string()).unwrap_or_default()
    } else {
        db.workshops.find_one(mongodb::bson::doc! { "_id": target_id }, None).await.map_err(|e| AppError::Internal(e.to_string()))?
            .map(|d| d.get_str("title").unwrap_or("").to_string()).unwrap_or_default()
    };

    let reg = svc.create_event_registration(
        &user_id, &kind, &target_id, &target_name, &transaction_id, &screenshot_url, amount, Some(team_name), team_members,
    ).await?;

    Ok(Json(json!({ "registration": reg })))
}

pub async fn my_registrations(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = oid_from_hex(&current_user.id).map_err(|_| AppError::Validation("Invalid user id".into()))?;
    let svc = RegistrationService::new(state.db.clone());
    let regs = svc.my_mess_registrations(&user_id).await?;
    Ok(Json(json!({ "registrations": regs })))
}

pub async fn create_mess_registration(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
    mut mp: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let upload_service = crate::services::upload_service::UploadService::new(&crate::config::Config::from_env()?);

    let mess_option_s = extract_text_field(&mut mp, "messOption").await?.ok_or_else(|| AppError::Validation("messOption is required".into()))?;
    let transaction_id = extract_text_field(&mut mp, "transactionId").await?.ok_or_else(|| AppError::Validation("transactionId is required".into()))?;

    let mess_option = oid_from_hex(&mess_option_s).map_err(|_| AppError::Validation("Invalid messOption".into()))?;
    let user_id = oid_from_hex(&current_user.id).map_err(|_| AppError::Validation("Invalid user id".into()))?;

    let (screenshot_url, amount) = match extract_file_field(&mut mp, "screenshot").await? {
        Some((file_name, content_type, bytes)) => {
            let url = upload_service.save_uploaded_file(&bytes, &content_type, &file_name).await?;
            // Determine amount from mess option.
            let db = &state.db;
            let mo = db.mess_options.find_one(mongodb::bson::doc! { "_id": mess_option }, None).await.map_err(|e| AppError::Internal(e.to_string()))?;
            let amt = mo.map(|d| d.get_i64("price").unwrap_or(0)).unwrap_or(0);
            (url, amt)
        }
        None => return Err(AppError::Validation("screenshot is required".into())),
    };

    let db = &state.db;
    let mess_name = db.mess_options.find_one(mongodb::bson::doc! { "_id": mess_option }, None).await.map_err(|e| AppError::Internal(e.to_string()))?
        .map(|d| d.get_str("name").unwrap_or("").to_string()).unwrap_or_default();

    let svc = RegistrationService::new(db.clone());
    let reg = svc.create_mess_registration(&user_id, &mess_option, &mess_name, &transaction_id, &screenshot_url, amount).await?;

    Ok(Json(json!({ "registration": reg })))
}

pub async fn my_mess_registrations(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = oid_from_hex(&current_user.id).map_err(|_| AppError::Validation("Invalid user id".into()))?;
    let svc = RegistrationService::new(state.db.clone());
    let regs = svc.my_mess_registrations(&user_id).await?;
    Ok(Json(json!({ "registrations": regs })))
}
