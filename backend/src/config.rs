use serde::Deserialize;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub mongodb_uri: String,
    pub db_name: String,
    pub port: u16,
    pub host: String,
    pub jwt_secret: String,
    pub jwt_expires: i64,
    pub cors_origin: String,
    pub seed_on_start: bool,
    pub upload_dir: String,
    pub admin_email: Option<String>,
    pub admin_password: Option<String>,
    pub admin_name: Option<String>,
}

/// Parses "86400", "30s", "15m", "24h" or "7d" into seconds.
/// (A value like "24h" used to be read as 24 *seconds*, which expired sessions almost immediately.)
fn parse_duration_secs(raw: &str) -> Option<i64> {
    let raw = raw.trim();
    let digits: String = raw.chars().take_while(|c| c.is_ascii_digit()).collect();
    let n: i64 = digits.parse().ok()?;
    let mult = match raw[digits.len()..].trim().to_ascii_lowercase().as_str() {
        "" | "s" => 1,
        "m" => 60,
        "h" => 60 * 60,
        "d" => 24 * 60 * 60,
        _ => return None,
    };
    Some(n * mult)
}

impl Config {
    pub fn from_env() -> Result<Self, crate::errors::AppError> {
        dotenvy::dotenv().map_err(|e| crate::errors::AppError::Internal(e.to_string())).ok();
        Ok(Self {
            mongodb_uri: env::var("MONGODB_URI").unwrap_or_else(|_| "mongodb://localhost:27017".into()),
            db_name: env::var("DB_NAME").unwrap_or_else(|_| "xpecto".into()),
            port: env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3000),
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| "change-me-in-production".into()),
            jwt_expires: env::var("JWT_EXPIRES")
                .ok()
                .and_then(|v| parse_duration_secs(&v))
                .unwrap_or(24 * 60 * 60),
            cors_origin: env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".into()),
            seed_on_start: env::var("SEED_ON_START")
                .ok()
                .and_then(|v| v.parse::<bool>().ok())
                .unwrap_or(true),
            upload_dir: env::var("UPLOAD_DIR").unwrap_or_else(|_| "backend/uploads".into()),
            admin_email: env::var("ADMIN_EMAIL").ok().filter(|s| !s.trim().is_empty()),
            admin_password: env::var("ADMIN_PASSWORD").ok().filter(|s| !s.trim().is_empty()),
            admin_name: env::var("ADMIN_NAME").ok().filter(|s| !s.trim().is_empty()),
        })
    }
}
