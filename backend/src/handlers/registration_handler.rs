use axum::extract::{Extension, Multipart, State};
use axum::response::Json;
use serde_json::json;

use crate::middleware::AppState;
use crate::middleware::auth::{CurrentUser, require_auth};
use crate::services::registration_service::RegistrationService;
use crate::database::oid_from_hex;
use crate::errors::{AppError, AppResult};

/// Read every multipart part once, in any order (text fields + the `screenshot` file).
async fn read_parts(mp: &mut Multipart) -> AppResult<(std::collections::HashMap<String, String>, Option<(String, String, Vec<u8>)>)> {
    let mut texts = std::collections::HashMap::new();
    let mut file = None;
    while let Some(field) = mp.next_field().await.map_err(|e| AppError::Internal(e.to_string()))? {
        let name = field.name().unwrap_or("").to_string();
        if name == "screenshot" {
            let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
            let file_name = field.file_name().unwrap_or("upload").to_string();
            let bytes = field.bytes().await.map_err(|e| AppError::Internal(e.to_string()))?.to_vec();
            file = Some((file_name, content_type, bytes));
        } else {
            texts.insert(name, field.text().await.map_err(|e| AppError::Internal(e.to_string()))?);
        }
    }
    Ok((texts, file))
}

/// Optional `paymentMethod` (defaults to UPI); the services reject unknown values.
fn payment_method_of(texts: &std::collections::HashMap<String, String>) -> String {
    texts.get("paymentMethod").map(|v| v.trim().to_lowercase()).filter(|v| !v.is_empty()).unwrap_or_else(|| "upi".to_string())
}

pub async fn create_registration(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
    mut mp: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let upload_service = crate::services::upload_service::UploadService::new(&crate::config::Config::from_env()?);

    let (texts, file) = read_parts(&mut mp).await?;
    let req = |k: &str| texts.get(k).map(|v| v.trim().to_string()).filter(|v| !v.is_empty()).ok_or_else(|| AppError::Validation(format!("{} is required", k)));
    let kind = req("kind")?;
    let target_id_s = req("targetId")?;
    let transaction_id = req("transactionId")?;
    let team_name = texts.get("teamName").cloned().unwrap_or_default();
    let team_members_s = texts.get("teamMembers").cloned().unwrap_or_default();
    let payment_method = payment_method_of(&texts);

    let target_id = oid_from_hex(&target_id_s).map_err(|_| AppError::Validation("Invalid targetId".into()))?;
    let user_id = oid_from_hex(&current_user.id).map_err(|_| AppError::Validation("Invalid user id".into()))?;

    let (screenshot_url, amount) = match file {
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
        &user_id, &kind, &target_id, &target_name, &transaction_id, &screenshot_url, amount, Some(team_name), team_members, &payment_method,
    ).await?;

    Ok(Json(json!({ "registration": reg })))
}

pub async fn my_registrations(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = oid_from_hex(&current_user.id).map_err(|_| AppError::Validation("Invalid user id".into()))?;
    let svc = RegistrationService::new(state.db.clone());
    let regs = svc.my_registrations(&user_id).await?;
    Ok(Json(json!({ "registrations": regs })))
}

pub async fn create_mess_registration(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
    mut mp: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let upload_service = crate::services::upload_service::UploadService::new(&crate::config::Config::from_env()?);

    let (texts, file) = read_parts(&mut mp).await?;
    let req = |k: &str| texts.get(k).map(|v| v.trim().to_string()).filter(|v| !v.is_empty()).ok_or_else(|| AppError::Validation(format!("{} is required", k)));
    let mess_option_s = req("messOption")?;
    let transaction_id = req("transactionId")?;
    let payment_method = payment_method_of(&texts);

    let mess_option = oid_from_hex(&mess_option_s).map_err(|_| AppError::Validation("Invalid messOption".into()))?;
    let user_id = oid_from_hex(&current_user.id).map_err(|_| AppError::Validation("Invalid user id".into()))?;

    let (screenshot_url, amount) = match file {
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
    let reg = svc.create_mess_registration(&user_id, &mess_option, &mess_name, &transaction_id, &screenshot_url, amount, &payment_method).await?;

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

/// Public: pricing for accommodation so the form can show the amount.
pub async fn accommodation_info() -> Json<serde_json::Value> {
    Json(json!({
        "pricePerDay": RegistrationService::accommodation_price_per_day(),
        "maxDays": RegistrationService::ACCOMMODATION_MAX_DAYS,
    }))
}

pub async fn create_accommodation_registration(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
    mut mp: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let upload_service = crate::services::upload_service::UploadService::new(&crate::config::Config::from_env()?);

    // Read every part once, in any order.
    let mut texts: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut file: Option<(String, String, Vec<u8>)> = None;
    while let Some(field) = mp.next_field().await.map_err(|e| AppError::Internal(e.to_string()))? {
        let name = field.name().unwrap_or("").to_string();
        if name == "screenshot" {
            let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
            let file_name = field.file_name().unwrap_or("upload").to_string();
            let bytes = field.bytes().await.map_err(|e| AppError::Internal(e.to_string()))?.to_vec();
            file = Some((file_name, content_type, bytes));
        } else {
            let text = field.text().await.map_err(|e| AppError::Internal(e.to_string()))?;
            texts.insert(name, text);
        }
    }

    let visit_days: i64 = texts
        .get("visitDays")
        .and_then(|v| v.trim().parse().ok())
        .ok_or_else(|| AppError::Validation("visitDays is required".into()))?;
    let payment_method = texts
        .get("paymentMethod")
        .map(|v| v.trim().to_lowercase())
        .ok_or_else(|| AppError::Validation("paymentMethod is required".into()))?;
    let transaction_id = texts
        .get("transactionId")
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .ok_or_else(|| AppError::Validation("transactionId is required".into()))?;
    let competitions: Vec<String> = texts
        .get("competitions")
        .and_then(|v| serde_json::from_str::<Vec<String>>(v).ok())
        .unwrap_or_default()
        .into_iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .take(50)
        .collect();

    let user_id = oid_from_hex(&current_user.id).map_err(|_| AppError::Validation("Invalid user id".into()))?;

    let (file_name, content_type, bytes) = file.ok_or_else(|| AppError::Validation("screenshot is required".into()))?;
    let screenshot_url = upload_service.save_uploaded_file(&bytes, &content_type, &file_name).await?;

    let svc = RegistrationService::new(state.db.clone());
    let reg = svc
        .create_accommodation_registration(&user_id, visit_days, competitions, &payment_method, &transaction_id, &screenshot_url)
        .await?;
    Ok(Json(json!({ "registration": reg })))
}

pub async fn my_accommodation_registrations(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = oid_from_hex(&current_user.id).map_err(|_| AppError::Validation("Invalid user id".into()))?;
    let svc = RegistrationService::new(state.db.clone());
    let regs = svc.my_accommodation_registrations(&user_id).await?;
    Ok(Json(json!({ "registrations": regs })))
}
