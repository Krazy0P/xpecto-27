use axum::{
    extract::{Request, State},
    http::header::{COOKIE, SET_COOKIE},
    middleware::Next,
    response::{IntoResponse, Response},
};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use tracing::warn;

use crate::config::Config;
use crate::database::AppDatabase;
use crate::errors::{AppError, AppResult};

/// Claims embedded in the JWT.
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Claims {
    pub sub: String,   // user id (hex)
    pub role: String,  // "user" | "admin"
    pub exp: i64,
    pub iat: i64,
}

/// Extracted current user, available via request extensions.
#[derive(Debug, Clone)]
pub struct CurrentUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub college: String,
    pub role: String,
}

/// Read the `xpecto_token` cookie from a request.
fn cookie_token(req: &Request) -> Option<String> {
    let cookies = req.headers().get_all(COOKIE);
    for cookie in cookies {
        if let Ok(s) = cookie.to_str() {
            for part in s.split(';') {
                let part = part.trim();
                if let Some(rest) = part.strip_prefix("xpecto_token=") {
                    return Some(rest.to_string());
                }
            }
        }
    }
    None
}

pub async fn auth_middleware(State(state): State<crate::middleware::AppState>, mut req: Request, next: Next) -> Response {
    let config = Config::from_env().ok();
    let token = cookie_token(&req);

    let user = match token {
        Some(t) => {
            let secret = config.as_ref().map(|c| c.jwt_secret.as_str()).unwrap_or("change-me-in-production");
            match decode::<Claims>(&t, &DecodingKey::from_secret(secret.as_bytes()), &Validation::new(Algorithm::HS256)) {
                Ok(token_data) => {
                    let claims = token_data.claims;
                    let db = &state.db;
                    // Load user from DB to ensure they exist and get fresh data.
                    match db.users.find_one(
                        mongodb::bson::doc! { "_id": mongodb::bson::oid::ObjectId::parse_str(&claims.sub).unwrap_or_default() },
                        None,
                    ).await {
                        Ok(Some(doc)) => {
                            let role = if doc.contains_key("role") {
                                doc.get_str("role").unwrap_or("user").to_string()
                            } else {
                                claims.role.clone()
                            };
                            Some(CurrentUser {
                                id: doc.get_object_id("_id").map(|o| o.to_hex()).unwrap_or_default(),
                                name: doc.get_str("name").unwrap_or("").to_string(),
                                email: doc.get_str("email").unwrap_or("").to_string(),
                                phone: doc.get_str("phone").unwrap_or("").to_string(),
                                college: doc.get_str("college").unwrap_or("").to_string(),
                                role,
                            })
                        }
                        Ok(None) => None,
                        Err(_) => None,
                    }
                }
                Err(_) => None,
            }
        }
        None => None,
    };

    if let Some(u) = user {
        req.extensions_mut().insert(u);
    }

    next.run(req).await
}

/// Extractor that requires an authenticated user.
pub async fn require_auth(State(_state): State<crate::middleware::AppState>, req: Request, next: Next) -> Response {
    let user = req.extensions().get::<CurrentUser>().cloned();
    match user {
        Some(_) => next.run(req).await,
        None => AppError::Unauthenticated("Please log in.".into()).into_response(),
    }
}

/// Middleware that requires admin role.
pub async fn require_admin(State(_state): State<crate::middleware::AppState>, req: Request, next: Next) -> Response {
    let user = req.extensions().get::<CurrentUser>().cloned();
    match user {
        Some(u) if u.role == "admin" => next.run(req).await,
        Some(_) => AppError::Forbidden("Admins only.".into()).into_response(),
        None => AppError::Unauthenticated("Please log in.".into()).into_response(),
    }
}
