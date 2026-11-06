use axum::routing::{get, patch, post};
use axum::Router;

use crate::handlers::ambassador_handler;
use crate::middleware::AppState;

pub fn routes(state: AppState) -> Router {
    Router::new()
        .route("/campus-ambassadors", post(ambassador_handler::create_ambassador))
        .with_state(state.clone())
        .merge(
            Router::new()
                .route(
                    "/admin/campus-ambassadors",
                    get(ambassador_handler::list_ambassadors),
                )
                .route(
                    "/admin/campus-ambassadors/:id",
                    patch(ambassador_handler::decide_ambassador),
                )
                .with_state(state),
        )
}
