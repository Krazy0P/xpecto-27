use axum::extract::{Extension, Path, State};
use axum::response::{IntoResponse, Json};
use serde_json::json;

use crate::middleware::AppState;
use crate::middleware::auth::CurrentUser;
use crate::services::public_service::PublicService;
use crate::errors::AppError;

fn require_admin_user(user: &CurrentUser) -> Result<(), AppError> {
    if user.role == "admin" {
        Ok(())
    } else {
        Err(AppError::Forbidden("Admins only.".into()))
    }
}

pub async fn create_ambassador(
    State(state): State<AppState>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let input: crate::models::ambassador::AmbassadorInput = serde_json::from_value(body)
        .map_err(|e| crate::errors::AppError::Validation(e.to_string()))?;
    let ambassador = svc.create_ambassador(input).await?;
    Ok(Json(json!({ "ambassador": ambassador })))
}

pub async fn list_ambassadors(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require_admin_user(&_current_user)?;
    let svc = PublicService::new(state.db.clone());
    let ambassadors = svc.list_ambassadors().await?;
    Ok(Json(json!({ "ambassadors": ambassadors })))
}

pub async fn decide_ambassador(
    State(state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(id): Path<String>,
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> Result<impl IntoResponse, crate::errors::AppError> {
    require_admin_user(&_current_user)?;
    let status = body
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("approved")
        .to_string();
    let svc = PublicService::new(state.db.clone());
    let ambassador = svc.update_ambassador_status(&id, &status).await?;
    Ok(Json(json!({ "ambassador": ambassador })))
}
