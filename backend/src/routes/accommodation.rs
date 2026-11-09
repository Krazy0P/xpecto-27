use axum::middleware;
use axum::routing::{get, post};
use axum::Router;

use crate::handlers::registration_handler;
use crate::middleware::auth::require_auth;
use crate::middleware::AppState;

pub fn routes(state: AppState) -> Router {
    let public = Router::new().route("/accommodation/info", get(registration_handler::accommodation_info));

    let authed = Router::new()
        .route("/accommodation/registrations", post(registration_handler::create_accommodation_registration))
        .route("/accommodation/registrations/me", get(registration_handler::my_accommodation_registrations))
        .route_layer(middleware::from_fn_with_state(state.clone(), require_auth))
        .with_state(state);

    public.merge(authed)
}
