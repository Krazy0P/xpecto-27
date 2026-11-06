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

    // Seed if enabled and collections are empty.
    if config.seed_on_start {
        let seed_dir = std::path::Path::new("seed-data");
        if let Err(e) = Seed::run_if_empty(&db, seed_dir).await {
            tracing::warn!("seed skipped: {}", e);
        }
    }

    let state = AppState { db };

    // API router mounted at /api (already carries AppState).
    let api = routes::routes(state.clone());

    // Health endpoint (carries state so it merges cleanly).
    let health = Router::new().route("/health", get(health_handler)).with_state(state.clone());

    // Combine: API + health at root, static file serving for uploads.
    let app = api
        .merge(health)
        .nest_service("/uploads", tower_http::services::ServeDir::new(&config.upload_dir))
        .layer(
            CorsLayer::new()
                .allow_origin(config.cors_origin.parse::<http::header::HeaderValue>()?)
                .allow_methods([http::Method::GET, http::Method::POST, http::Method::PUT, http::Method::DELETE])
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
