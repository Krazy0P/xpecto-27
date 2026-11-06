use axum::middleware;
use axum::routing::{delete, get, post, put};
use axum::Router;

use crate::handlers::{admin_handler, upload_handler};
use crate::middleware::auth::require_admin;
use crate::middleware::AppState;

pub fn routes(state: AppState) -> Router {
    Router::new()
        .route("/admin/uploads", post(upload_handler::upload_file))
        .route("/admin/fest", put(admin_handler::admin_fest))
        .route("/admin/payment-info", put(admin_handler::admin_payment_info))
        .route("/admin/events", post(admin_handler::admin_event_create))
        .route(
            "/admin/events/:id",
            put(admin_handler::admin_event_update).delete(admin_handler::admin_event_delete),
        )
        .route("/admin/workshops", post(admin_handler::admin_workshop_create))
        .route(
            "/admin/workshops/:id",
            put(admin_handler::admin_workshop_update).delete(admin_handler::admin_workshop_delete),
        )
        .route("/admin/team", post(admin_handler::admin_team_create))
        .route(
            "/admin/team/:id",
            put(admin_handler::admin_team_update).delete(admin_handler::admin_team_delete),
        )
        .route("/admin/sponsors", post(admin_handler::admin_sponsor_create))
        .route(
            "/admin/sponsors/:id",
            put(admin_handler::admin_sponsor_update).delete(admin_handler::admin_sponsor_delete),
        )
        .route("/admin/mess-options/:id", put(admin_handler::admin_mess_option_update))
        .route("/admin/registrations", get(admin_handler::admin_registrations))
        .route(
            "/admin/registrations/:id/approve",
            post(admin_handler::admin_decide_registration),
        )
        .route(
            "/admin/registrations/:id/reject",
            post(admin_handler::admin_decide_registration),
        )
        .route("/admin/mess/registrations", get(admin_handler::admin_registrations))
        .route(
            "/admin/mess/registrations/:id/approve",
            post(admin_handler::admin_decide_registration),
        )
        .route(
            "/admin/mess/registrations/:id/reject",
            post(admin_handler::admin_decide_registration),
        )
        .route(
            "/admin/registrations/export.csv",
            get(admin_handler::admin_export_csv),
        )
        .route("/admin/admins", get(admin_handler::admin_admins_list).post(admin_handler::admin_add_admin))
        .route("/admin/admins/:email", delete(admin_handler::admin_remove_admin))
        .route_layer(middleware::from_fn_with_state(state.clone(), require_admin))
        .with_state(state)
}
