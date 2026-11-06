use axum::http::HeaderValue;
use argon2::{password_hash::rand_core::OsRng, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use jsonwebtoken::{encode, EncodingKey, Header};
use mongodb::bson::{doc, oid::ObjectId};
use tracing::info;

use crate::config::Config;
use crate::database::{oid_from_hex, AppDatabase};
use crate::errors::{AppError, AppResult};
use crate::models::user::{LoginInput, SignupInput, User, UserView};

const TOKEN_COOKIE: &str = "xpecto_token";
pub(crate) const DEFAULT_ADMIN_EMAIL: &str = "b25347@students.iitmandi.ac.in";

/// Build the Set-Cookie header value for a session token.
pub fn set_token_cookie(config: &Config, token: &str) -> HeaderValue {
    format!(
        "{}={}; HttpOnly; Path=/; SameSite=Lax; Max-Age={}",
        TOKEN_COOKIE, token, config.jwt_expires
    )
    .parse()
    .unwrap_or_else(|_| HeaderValue::from_static(""))
}

/// Build the Set-Cookie header value to clear the session token.
pub fn clear_token_cookie(config: &Config) -> HeaderValue {
    let _ = config;
    HeaderValue::from_static("xpecto_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0")
}

pub struct AuthService {
    db: AppDatabase,
    config: Config,
}

impl AuthService {
    pub fn new(db: AppDatabase, config: Config) -> Self {
        Self { db, config }
    }

    pub async fn signup(&self, input: SignupInput) -> AppResult<(UserView, String)> {
        // Check existing email.
        let exists = self
            .db
            .users
            .count_documents(doc! { "email": &input.email }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if exists > 0 {
            return Err(AppError::Validation("Email already registered.".into()));
        }

        let password_hash = hash_password(&input.password)?;

        let is_admin = input.email == DEFAULT_ADMIN_EMAIL;
        let role = if is_admin { "admin" } else { "user" };
        let now = crate::database::now();

        let doc = doc! {
            "name": &input.name,
            "email": &input.email,
            "phone": &input.phone,
            "college": &input.college,
            "password_hash": &password_hash,
            "role": role,
            "created_at": now,
            "updated_at": now,
        };

        let result = self
            .db
            .users
            .insert_one(doc, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let id = result.inserted_id.as_object_id().unwrap_or_default();

        // Ensure default admin email is registered in the admins collection.
        if is_admin {
            let _ = self
                .db
                .admins
                .insert_one(doc! { "email": &input.email, "created_at": now }, None)
                .await;
        }

        let user = User {
            id: Some(id),
            name: input.name,
            email: input.email,
            phone: input.phone,
            college: input.college,
            password_hash,
            role: role.to_string(),
            created_at: Some(now),
            updated_at: Some(now),
        };

        let token = self.issue_token(&user)?;
        info!("User registered: {} (role={})", user.email, user.role);
        Ok((user.view(), token))
    }

    pub async fn login(&self, input: LoginInput) -> AppResult<(UserView, String)> {
        let doc = self
            .db
            .users
            .find_one(doc! { "email": &input.email }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let doc = doc.ok_or_else(|| AppError::Unauthenticated("Wrong email or password.".into()))?;

        let password_hash = doc
            .get_str("password_hash")
            .map_err(|_| AppError::Unauthenticated("Wrong email or password.".into()))?;

        if !verify_password(&input.password, password_hash)? {
            return Err(AppError::Unauthenticated("Wrong email or password.".into()));
        }

        let id = doc.get_object_id("_id").unwrap_or_default();
        let role = doc.get_str("role").unwrap_or("user").to_string();

        let user = User {
            id: Some(id),
            name: doc.get_str("name").unwrap_or("").to_string(),
            email: doc.get_str("email").unwrap_or("").to_string(),
            phone: doc.get_str("phone").unwrap_or("").to_string(),
            college: doc.get_str("college").unwrap_or("").to_string(),
            password_hash: password_hash.to_string(),
            role,
            created_at: doc.get_datetime("created_at").ok().map(|d| *d),
            updated_at: doc.get_datetime("updated_at").ok().map(|d| *d),
        };

        let token = self.issue_token(&user)?;
        info!("User logged in: {}", user.email);
        Ok((user.view(), token))
    }

    pub fn build_user_view(id: &ObjectId, name: &str, email: &str, phone: &str, college: &str, role: &str) -> UserView {
        UserView {
            id: id.to_hex(),
            name: name.to_string(),
            email: email.to_string(),
            phone: phone.to_string(),
            college: college.to_string(),
            role: role.to_string(),
        }
    }

    fn issue_token(&self, user: &User) -> AppResult<String> {
        let now = chrono::Utc::now().timestamp();
        let exp = now + self.config.jwt_expires;
        let claims = crate::middleware::auth::Claims {
            sub: user.id.as_ref().map(|o| o.to_hex()).unwrap_or_default(),
            role: user.role.clone(),
            exp,
            iat: now,
        };
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.config.jwt_secret.as_bytes()),
        )
        .map_err(|e| AppError::Internal(e.to_string()))
    }

    pub fn set_token_cookie(&self, token: &str) -> http::header::HeaderValue {
        crate::services::auth_service::set_token_cookie(&self.config, token)
    }

    pub fn clear_token_cookie(&self) -> http::header::HeaderValue {
        crate::services::auth_service::clear_token_cookie(&self.config)
    }

    pub fn default_admin_email() -> &'static str {
        DEFAULT_ADMIN_EMAIL
    }
}

fn hash_password(password: &str) -> AppResult<String> {
    let argon2 = Argon2::default();
    let salt = argon2::password_hash::SaltString::generate(&mut OsRng);
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .to_string();
    Ok(hash)
}

fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    let parsed_hash = PasswordHash::new(hash).map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}
