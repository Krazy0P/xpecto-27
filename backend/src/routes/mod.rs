use axum::Router;

use crate::middleware::AppState;

mod admin;
mod ambassador;
mod auth;
mod mess;
mod public;
mod registrations;

pub fn routes(state: AppState) -> Router {
    Router::new()
        .merge(auth::routes(state.clone()))
        .merge(public::routes(state.clone()))
        .merge(registrations::routes(state.clone()))
        .merge(mess::routes(state.clone()))
        .merge(admin::routes(state.clone()))
        .merge(ambassador::routes(state))
}
