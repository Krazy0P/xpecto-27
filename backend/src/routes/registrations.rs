use axum::extract::DefaultBodyLimit;
use axum::middleware;
use axum::routing::{get, post};
use axum::Router;

use crate::handlers::registration_handler;
use crate::middleware::auth::require_auth;
use crate::middleware::AppState;

pub fn routes(state: AppState) -> Router {
    Router::new()
        // The screenshot is limited to 5 MiB by UploadService; allow room for
        // multipart boundaries and field headers before that validation runs.
        .route(
            "/registrations",
            post(registration_handler::create_registration)
                .layer(DefaultBodyLimit::max(6 * 1024 * 1024)),
        )
        .route("/registrations/me", get(registration_handler::my_registrations))
        .route_layer(middleware::from_fn_with_state(state.clone(), require_auth))
        .with_state(state)
}
