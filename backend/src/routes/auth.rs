use axum::middleware;
use axum::routing::{get, post};
use axum::Router;

use crate::handlers::auth_handler;
use crate::middleware::auth::require_auth;
use crate::middleware::AppState;

pub fn routes(state: AppState) -> Router {
    let public = Router::new()
        .route("/signup", post(auth_handler::signup))
        .route("/login", post(auth_handler::login))
        .route("/logout", post(auth_handler::logout))
        .with_state(state.clone());
    let protected = Router::new()
        .route("/me", get(auth_handler::me))
        .route_layer(middleware::from_fn_with_state(state.clone(), require_auth))
        .with_state(state);
    public.merge(protected)
}
