use axum::extract::{Extension, Path, Query, State};
use axum::http::header;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

use crate::database::oid_from_hex;
use crate::middleware::AppState;
use crate::middleware::auth::{CurrentUser, require_admin};
use crate::services::public_service::PublicService;
use crate::services::registration_service::RegistrationService;
use crate::models::registration::RegistrationQuery;
use crate::models::admin::AddAdminInput;
use crate::errors::AppError;

fn require(admin_user: &CurrentUser) -> Result<(), crate::errors::AppError> {
    if admin_user.role == "admin" {
        Ok(())
    } else {
        Err(crate::errors::AppError::Forbidden("Admins only.".into()))
    }
}

pub async fn admin_fest(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::fest::FestInfoInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let fest = svc.update_fest(input).await?;
    let value = serde_json::json!({ "fest": fest });
    Ok(Json(value))
}

pub async fn admin_payment_info(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::payment::PaymentInfoInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let payment = svc.update_payment_info(input).await?;
    let value = serde_json::json!({ "payment": payment });
    Ok(Json(value))
}

// --- events ---

pub async fn admin_event_create(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::event::EventInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let item = svc.create_event(input).await?;
    let value = serde_json::json!({ "event": item });
    Ok(Json(value))
}

pub async fn admin_event_update(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::event::EventInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let item = svc.update_event(&id, input).await?;
    let value = serde_json::json!({ "event": item });
    Ok(Json(value))
}

pub async fn admin_event_delete(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    svc.delete_event(&id).await?;
    Ok(Json(json!({ "ok": true })))
}

// --- workshops ---

pub async fn admin_workshop_create(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::workshop::WorkshopInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let item = svc.create_workshop(input).await?;
    Ok(Json(json!({ "workshop": item })))
}

pub async fn admin_workshop_update(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::workshop::WorkshopInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let item = svc.update_workshop(&id, input).await?;
    Ok(Json(json!({ "workshop": item })))
}

pub async fn admin_workshop_delete(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    svc.delete_workshop(&id).await?;
    Ok(Json(json!({ "ok": true })))
}

// --- team ---

pub async fn admin_team_create(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::team::TeamMemberInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let item = svc.create_team_member(input).await?;
    Ok(Json(json!({ "team": item })))
}

pub async fn admin_team_update(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::team::TeamMemberInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let item = svc.update_team_member(&id, input).await?;
    Ok(Json(json!({ "team": item })))
}

pub async fn admin_team_delete(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    svc.delete_team_member(&id).await?;
    Ok(Json(json!({ "ok": true })))
}

// --- sponsors ---

pub async fn admin_sponsor_create(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::sponsor::SponsorInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let item = svc.create_sponsor(input).await?;
    Ok(Json(json!({ "sponsor": item })))
}

pub async fn admin_sponsor_update(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::sponsor::SponsorInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let item = svc.update_sponsor(&id, input).await?;
    Ok(Json(json!({ "sponsor": item })))
}

pub async fn admin_sponsor_delete(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    svc.delete_sponsor(&id).await?;
    Ok(Json(json!({ "ok": true })))
}

// --- mess options ---

pub async fn admin_mess_option_update(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::mess::MessOptionInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let item = svc.update_mess_option(&id, input).await?;
    Ok(Json(json!({ "mess": item })))
}

// --- registrations ---

pub async fn admin_registrations(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Query(query): Query<RegistrationQuery>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = RegistrationService::new(state.db.clone());
    let regs = svc.list_registrations(&query).await?;
    Ok(Json(json!({ "registrations": regs })))
}

pub async fn admin_create_registration(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = RegistrationService::new(state.db.clone());
    let kind = body.get("kind").and_then(|v| v.as_str()).unwrap_or("event").to_string();
    let target_id_s = body.get("targetId").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let target_name = body.get("targetName").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let transaction_id = body.get("transactionId").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let screenshot_url = body.get("screenshotUrl").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let amount = body.get("amount").and_then(|v| v.as_i64()).unwrap_or(0);
    let team_name = body.get("teamName").and_then(|v| v.as_str()).map(|s| s.to_string());
    let team_members: Vec<crate::models::registration::TeamMemberReg> = body
        .get("teamMembers")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let target_id = oid_from_hex(&target_id_s).map_err(|_| AppError::Validation("Invalid targetId".into()))?;
    let user_id = body
        .get("user")
        .and_then(|v| v.get("id"))
        .and_then(|v| v.as_str())
        .and_then(|s| oid_from_hex(s).ok())
        .unwrap_or_default();

    let reg = svc.create_event_registration(
        &user_id,
        &kind,
        &target_id,
        &target_name,
        &transaction_id,
        &screenshot_url,
        amount,
        team_name,
        team_members,
    ).await?;

    Ok(Json(json!({ "registration": reg })))
}

pub async fn admin_decide_registration(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path((id, action)): Path<(String, String)>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    if action != "approve" && action != "reject" {
        return Err(crate::errors::AppError::NotFound("Invalid action".into()));
    }
    let reason = body.get("reason").and_then(|v| v.as_str()).map(|s| s.to_string());
    let svc = RegistrationService::new(state.db.clone());
    let reg = svc.decide_registration(&id, &action, reason.as_deref()).await?;
    let value = serde_json::json!({ "registration": reg });
    Ok(Json(value))
}

pub async fn admin_export_csv(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let svc = RegistrationService::new(state.db.clone());
    let csv = svc.export_csv().await?;
    Ok((
        [(header::CONTENT_TYPE, "text/csv; charset=utf-8")],
        csv,
    )
        .into_response())
}

// --- admins ---

pub async fn admin_admins_list(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    require(&_current_user)?;
    let mut cursor = state.db.admins.find(mongodb::bson::doc! {}, None).await.map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
    let mut emails = Vec::new();
    while cursor.advance().await.map_err(|e| crate::errors::AppError::Internal(e.to_string()))? {
        let doc = cursor.deserialize_current().map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
        emails.push(doc.get_str("email").unwrap_or("").to_string());
    }
    let value = serde_json::json!({ "admins": emails });
    Ok(Json(value))
}

pub async fn admin_add_admin(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    axum::extract::Json(body): axum::extract::Json<AddAdminInput>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let now = crate::database::now();
    let exists = state.db.admins.count_documents(mongodb::bson::doc! { "email": &body.email }, None).await.map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
    if exists > 0 {
        let value = serde_json::json!({ "ok": true });
        return Ok(Json(value));
    }
    state.db.admins.insert_one(mongodb::bson::doc! { "email": &body.email, "created_at": now }, None).await.map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
    let _ = state.db.users.update_one(
        mongodb::bson::doc! { "email": &body.email },
        mongodb::bson::doc! { "$set": { "role": "admin", "updated_at": now } },
        None,
    ).await;
    let value = serde_json::json!({ "ok": true });
    Ok(Json(value))
}

pub async fn admin_remove_admin(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(email): Path<String>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require(&_current_user)?;
    let now = crate::database::now();
    state.db.admins.delete_one(mongodb::bson::doc! { "email": &email }, None).await.map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
    let _ = state.db.users.update_one(
        mongodb::bson::doc! { "email": &email },
        mongodb::bson::doc! { "$set": { "role": "user", "updated_at": now } },
        None,
    ).await;
    let value = serde_json::json!({ "ok": true });
    Ok(Json(value))
}
