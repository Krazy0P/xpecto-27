use std::path::Path;

use mime::Mime;
use tracing::{error, info};

use crate::config::Config;
use crate::errors::{AppError, AppResult};

const MAX_BYTES: u64 = 5 * 1024 * 1024;
const ALLOWED: &[&str] = &["image/png", "image/jpeg", "image/webp"];

pub struct UploadService {
    pub upload_dir: String,
    pub base_url: String,
}

impl UploadService {
    pub fn new(config: &Config) -> Self {
        Self {
            upload_dir: config.upload_dir.clone(),
            base_url: config.cors_origin.clone(),
        }
    }

    pub async fn save_uploaded_file(
        &self,
        bytes: &[u8],
        content_type: &str,
        original_name: &str,
    ) -> AppResult<String> {
        let mime: Mime = content_type
            .parse()
            .map_err(|_| AppError::Validation("Unsupported content type.".into()))?;
        if !ALLOWED.contains(&mime.type_().to_string().as_str())
            || !ALLOWED.contains(&mime.subtype().to_string().as_str())
        {
            // Check full mime string as well.
            if !ALLOWED.contains(&content_type) {
                return Err(AppError::Validation(
                    "Only PNG, JPG or WEBP images are allowed.".into(),
                ));
            }
        }
        if bytes.len() as u64 > MAX_BYTES {
            return Err(AppError::TooLarge(
                "Screenshot is too large. Use an image under 5 MB.".into(),
            ));
        }

        std::fs::create_dir_all(&self.upload_dir).map_err(|e| {
            error!("failed to create upload dir: {}", e);
            AppError::Internal("upload directory unavailable".into())
        })?;

        let ext = Path::new(original_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("bin");
        let filename = format!("{}.{}", uuid::Uuid::new_v4(), ext);
        let path = Path::new(&self.upload_dir).join(&filename);
        std::fs::write(&path, bytes).map_err(|e| {
            error!("failed to write upload: {}", e);
            AppError::Internal("failed to save upload".into())
        })?;

        info!("saved upload: {}", path.display());
        Ok(format!("/uploads/{}", filename))
    }
}
