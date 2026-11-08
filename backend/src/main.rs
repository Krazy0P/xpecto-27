use axum::{
    routing::get,
    Router,
};
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;
use crate::database::AppDatabase;
use crate::middleware::AppState;
use crate::seed::Seed;

mod config;
mod database;
mod errors;
mod middleware;
mod models;
mod routes;
mod services;
mod seed;
mod handlers;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env().map_err(|e| anyhow::anyhow!(e.to_string()))?;
    let db = AppDatabase::connect(&config).await?;

    // CLI Command Handler: Allows managing admin accounts directly from backend.
    // Usage: cargo run -- create-admin <email> <password> [name] [phone] [college]
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 && (args[1] == "create-admin" || args[1] == "admin") {
        if args.len() < 4 {
            eprintln!("\n❌ Usage: cargo run -- create-admin <email> <password> [name] [phone] [college]\n");
            std::process::exit(1);
        }
        let email = &args[2];
        let password = &args[3];
        let name = if args.len() > 4 { &args[4] } else { "Admin" };
        let phone = if args.len() > 5 { &args[5] } else { "0000000000" };
        let college = if args.len() > 6 { &args[6] } else { "IIT Mandi" };

        let auth_service = crate::services::auth_service::AuthService::new(db.clone(), config.clone());
        match auth_service.create_or_update_admin(email, password, name, phone, college).await {
            Ok(view) => {
                println!("\n========================================");
                println!("✅ Admin Account Created / Updated Successfully!");
                println!("========================================");
                println!("Email:    {}", view.email);
                println!("Name:     {}", view.name);
                println!("Role:     {}", view.role);
                println!("Login at: http://localhost:5173/auth");
                println!("========================================\n");
                return Ok(());
            }
            Err(e) => {
                eprintln!("\n❌ Failed to create admin: {}\n", e);
                std::process::exit(1);
            }
        }
    }

    // Ensure admin user from .env exists in database
    if let (Some(admin_email), Some(admin_password)) = (&config.admin_email, &config.admin_password) {
        let admin_name = config.admin_name.as_deref().unwrap_or("Super Admin");
        let auth_service = crate::services::auth_service::AuthService::new(db.clone(), config.clone());
        if let Err(e) = auth_service.create_or_update_admin(admin_email, admin_password, admin_name, "0000000000", "IIT Mandi").await {
            tracing::warn!("Failed to ensure admin from .env: {}", e);
        } else {
            tracing::info!("Admin account ensured from .env for {}", admin_email);
        }
    }

    // Seed if enabled and collections are empty.
    if config.seed_on_start {
        let seed_dir = std::path::Path::new("seed-data");
        if let Err(e) = Seed::run_if_empty(&db, seed_dir).await {
            tracing::warn!("seed skipped: {}", e);
        }
    }

    let state = AppState { db };

    // API routes mounted under /api to match the frontend's baseURL prefix.
    let api_public = Router::new()
        .merge(routes::public::routes(state.clone()))
        .merge(routes::registrations::routes(state.clone()))
        .merge(routes::mess::routes(state.clone()))
        .merge(routes::admin::routes(state.clone()))
        .merge(routes::ambassador::routes(state.clone()));

    // Auth routes mounted under /api/auth.
    let api_auth = routes::auth::routes(state.clone());

    // Health endpoint (carries state so it merges cleanly).
    let health = Router::new().route("/health", get(health_handler)).with_state(state.clone());

    // Combine: API + health at root, static file serving for uploads.
    let app = Router::new()
        .nest("/api", api_public)
        .nest("/api/auth", api_auth)
        .merge(health)
        .nest_service("/uploads", tower_http::services::ServeDir::new(&config.upload_dir))
        // Reads the `xpecto_token` cookie and attaches the logged-in user to the request.
        // Without this layer, `require_auth` / `require_admin` never see a user and every
        // protected route answers 401 ("Session expired").
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::auth_middleware,
        ))
        .layer(
            CorsLayer::new()
                .allow_origin(config.cors_origin.parse::<http::header::HeaderValue>()?)
                .allow_methods([
                    http::Method::GET,
                    http::Method::POST,
                    http::Method::PUT,
                    http::Method::PATCH,
                    http::Method::DELETE,
                ])
                .allow_headers([http::header::CONTENT_TYPE, http::header::COOKIE, http::header::SET_COOKIE])
                .allow_credentials(true),
        );

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", config.host, config.port)).await?;
    tracing::info!("Backend listening on http://{}:{}", config.host, config.port);
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health_handler() -> &'static str {
    "ok"
}
