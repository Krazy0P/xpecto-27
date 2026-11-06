use axum::{
    extract::{Extension, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use crate::config::Config;
use crate::database::AppDatabase;
use crate::middleware::AppState;
use crate::middleware::auth::{require_auth, CurrentUser};
use crate::services::auth_service::AuthService;
use crate::models::user::{LoginInput, SignupInput};

fn json_user(user: &crate::models::user::UserView) -> serde_json::Value {
    json!({ "user": user })
}

pub async fn signup(
    State(state): State<AppState>,
    Json(payload): Json<SignupInput>,
) -> Result<Response, crate::errors::AppError> {
    let config = Config::from_env()?;
    let auth_service = AuthService::new(state.db.clone(), config.clone());
    let (user, token) = auth_service.signup(payload).await?;
    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        auth_service.set_token_cookie(&token),
    );
    Ok((headers, Json(json_user(&user))).into_response())
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginInput>,
) -> Result<Response, crate::errors::AppError> {
    let config = Config::from_env()?;
    let auth_service = AuthService::new(state.db.clone(), config.clone());
    let (user, token) = auth_service.login(payload).await?;
    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        auth_service.set_token_cookie(&token),
    );
    Ok((headers, Json(json_user(&user))).into_response())
}

pub async fn logout() -> Result<Response, crate::errors::AppError> {
    let config = Config::from_env()?;
    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        crate::services::auth_service::clear_token_cookie(&config),
    );
    Ok((headers, Json(json!({ "ok": true }))).into_response())
}

pub async fn me(
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    Ok(Json(json!({ "user": {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "college": current_user.college,
        "role": current_user.role,
    } })))
}
