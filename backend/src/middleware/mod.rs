pub mod auth;
pub mod admin;

use axum::extract::FromRef;
use crate::database::AppDatabase;

#[derive(Clone)]
pub struct AppState {
    pub db: AppDatabase,
}

impl FromRef<AppState> for AppDatabase {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}
