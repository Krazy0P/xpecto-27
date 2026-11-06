use axum::extract::{Path, State};
use axum::response::Json;

use crate::middleware::AppState;
use crate::services::public_service::PublicService;

pub async fn get_fest(State(state): State<AppState>) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let fest = svc.get_fest().await?;
    Ok(Json(serde_json::to_value(&fest).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_events(State(state): State<AppState>) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let events = svc.get_events().await?;
    Ok(Json(serde_json::to_value(&events).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_event(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let event = svc.get_event(&id).await?;
    Ok(Json(serde_json::to_value(&event).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_workshops(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let workshops = svc.get_workshops().await?;
    Ok(Json(serde_json::to_value(&workshops).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_team(State(state): State<AppState>) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let team = svc.get_team().await?;
    Ok(Json(serde_json::to_value(&team).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_sponsors(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let sponsors = svc.get_sponsors().await?;
    Ok(Json(serde_json::to_value(&sponsors).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_mess_options(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let mess = svc.get_mess_options().await?;
    Ok(Json(serde_json::to_value(&mess).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_payment_info(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let payment = svc.get_payment_info().await?;
    Ok(Json(serde_json::to_value(&payment).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}
