use axum::routing::get;
use axum::Router;

use crate::handlers::public_handler;
use crate::middleware::AppState;

pub fn routes(state: AppState) -> Router {
    Router::new()
        .route("/fest", get(public_handler::get_fest))
        .route("/events", get(public_handler::get_events))
        .route("/events/{id}", get(public_handler::get_event))
        .route("/workshops", get(public_handler::get_workshops))
        .route("/team", get(public_handler::get_team))
        .route("/sponsors", get(public_handler::get_sponsors))
        .route("/messoptions", get(public_handler::get_mess_options))
        .route("/payment-info", get(public_handler::get_payment_info))
        .with_state(state)
}
