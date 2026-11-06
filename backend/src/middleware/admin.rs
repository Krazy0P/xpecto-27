use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

use crate::middleware::auth::CurrentUser;

/// Verify the current user is an admin; return error otherwise.
pub fn ensure_admin(user: &CurrentUser) -> Result<(), crate::errors::AppError> {
    if user.role == "admin" {
        Ok(())
    } else {
        Err(crate::errors::AppError::Forbidden("Admins only.".into()))
    }
}

pub async fn admin_middleware(_req: Request, _next: Next) -> Response {
    // Placeholder; admin checks are done per-route via require_admin.
    _next.run(_req).await
}
