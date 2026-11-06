use axum::extract::{Extension, Multipart, State};
use axum::response::Json;
use serde_json::json;

use crate::middleware::AppState;
use crate::middleware::auth::CurrentUser;

pub async fn upload_file(
    State(_state): State<AppState>,
    Extension(_current_user): Extension<CurrentUser>,
    mut mp: Multipart,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let config = crate::config::Config::from_env()?;
    let upload_service = crate::services::upload_service::UploadService::new(&config);

    while let Some(field) = mp.next_field().await.map_err(|e| crate::errors::AppError::Internal(e.to_string()))? {
        if field.name() == Some("file") {
            let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
            let file_name = field.file_name().unwrap_or("upload").to_string();
            let bytes = field.bytes().await.map_err(|e| crate::errors::AppError::Internal(e.to_string()))?.to_vec();
            let url = upload_service.save_uploaded_file(&bytes, &content_type, &file_name).await?;
            return Ok(Json(json!({ "url": url })));
        }
    }
    Err(crate::errors::AppError::Validation("file is required".into()))
}
