use axum::{
    response::{IntoResponse, Response},
    Json,
};
use http::StatusCode;
use serde_json::json;
use tracing::warn;

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    Validation(String),
    Unauthenticated(String),
    Forbidden(String),
    Conflict(String),
    Internal(String),
    TooLarge(String),
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Validation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::Unauthenticated(_) => StatusCode::UNAUTHORIZED,
            AppError::Forbidden(_) => StatusCode::FORBIDDEN,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::TooLarge(_) => StatusCode::PAYLOAD_TOO_LARGE,
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Validation(_) => "VALIDATION",
            AppError::Unauthenticated(_) => "UNAUTHENTICATED",
            AppError::Forbidden(_) => "FORBIDDEN",
            AppError::Conflict(_) => if matches!(self, AppError::Conflict(_)) {
                // Distinguish by message content set by callers is awkward; use generic.
                "CONFLICT"
            } else {
                "CONFLICT"
            },
            AppError::Internal(_) => "SERVER",
            AppError::TooLarge(_) => "FILE_TOO_LARGE",
        }
    }

    pub fn message(&self) -> String {
        match self {
            AppError::NotFound(m) => m.clone(),
            AppError::Validation(m) => m.clone(),
            AppError::Unauthenticated(m) => m.clone(),
            AppError::Forbidden(m) => m.clone(),
            AppError::Conflict(m) => m.clone(),
            AppError::Internal(m) => m.clone(),
            AppError::TooLarge(m) => m.clone(),
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code(), self.message())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        warn!("{} {}: {}", status, self.code(), self.message());
        let body = Json(json!({ "error": { "code": self.code(), "message": self.message() } }));
        (status, body).into_response()
    }
}

impl<E> From<E> for AppError
where
    E: std::error::Error + Send + Sync + 'static,
{
    fn from(err: E) -> Self {
        AppError::Internal(err.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
