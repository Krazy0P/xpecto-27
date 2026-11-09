use axum::Router;

use crate::middleware::AppState;

pub(crate) mod accommodation;
pub(crate) mod admin;
pub(crate) mod ambassador;
pub(crate) mod auth;
pub(crate) mod mess;
pub(crate) mod public;
pub(crate) mod registrations;

pub fn routes(state: AppState) -> Router {
    Router::new()
        .merge(auth::routes(state.clone()))
        .merge(public::routes(state.clone()))
        .merge(registrations::routes(state.clone()))
        .merge(mess::routes(state.clone()))
        .merge(accommodation::routes(state.clone()))
        .merge(admin::routes(state.clone()))
        .merge(ambassador::routes(state))
}
