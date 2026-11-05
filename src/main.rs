use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{Html, IntoResponse, Redirect},
    routing::get,
    Form, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqliteConnectOptions, FromRow, SqlitePool};
use std::{net::SocketAddr, str::FromStr, sync::Arc};
use tera::{Context, Tera};
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
    tera: Tera,
}

#[derive(Debug, FromRow, Serialize)]
struct Post {
    id: String,
    title: String,
    content: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct CreatePostForm {
    title: String,
    content: String,
}

#[derive(Deserialize)]
struct UpdatePostForm {
    title: String,
    content: String,
}

#[derive(Deserialize)]
struct PaginationQuery {
    page: Option<u32>,
    per_page: Option<u32>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:blog.db".to_string());
    let options = SqliteConnectOptions::from_str(&database_url)?
        .create_if_missing(true);
    let pool = SqlitePool::connect_with(options).await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    let tera = Tera::new("templates/**/*")?;

    let state = Arc::new(AppState { db: pool, tera });

    let app = Router::new()
        .route("/", get(home))
        .route("/home", get(home))
        .route("/competitions", get(competitions))
        .route("/workshops", get(workshops))
        .route("/about", get(about))
        .route("/posts", get(list_posts).post(create_post))
        .route("/posts/new", get(new_post_form))
        .route("/posts/:id", get(show_post).put(update_post).delete(delete_post).post(update_or_delete_post))
        .route("/posts/:id/edit", get(edit_post_form))
        .nest_service("/static", ServeDir::new("static"))
        .with_state(state);

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()?;
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn home(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut context = Context::new();
    context.insert("active_page", &"home");
    render_template(&state, "home.html", context)
}

async fn competitions(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut context = Context::new();
    context.insert("active_page", &"competitions");
    render_template(&state, "competitions.html", context)
}

async fn workshops(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut context = Context::new();
    context.insert("active_page", &"workshops");
    render_template(&state, "workshops.html", context)
}

async fn about(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut context = Context::new();
    context.insert("active_page", &"about");
    render_template(&state, "about.html", context)
}

fn render_template(state: &Arc<AppState>, template: &str, context: Context) -> impl IntoResponse {
    match state.tera.render(template, &context) {
        Ok(html) => Html(html).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Debug, Serialize)]
struct PostView {
    id: String,
    title: String,
    content: String,
    created_at: String,
    updated_at: String,
    created_at_iso: String,
    updated_at_iso: String,
}

fn post_to_view(post: Post) -> PostView {
    PostView {
        id: post.id,
        title: post.title,
        content: post.content,
        created_at: post.created_at.format("%b %d, %Y").to_string(),
        updated_at: post.updated_at.format("%b %d, %Y").to_string(),
        created_at_iso: post.created_at.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
        updated_at_iso: post.updated_at.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
    }
}

async fn list_posts(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationQuery>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(10);
    let offset = ((page - 1) * per_page) as i64;

    let posts = sqlx::query_as::<_, Post>(
        "SELECT id, title, content, created_at, updated_at FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .bind(per_page as i64)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts")
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let total_pages = (total.0 as f64 / per_page as f64).ceil() as u32;

    let posts_view: Vec<PostView> = posts.unwrap_or_default().into_iter().map(post_to_view).collect();

    let mut context = Context::new();
    context.insert("posts", &posts_view);
    context.insert("page", &page);
    context.insert("active_page", &"blog");
    context.insert("total_pages", &total_pages);
    context.insert("per_page", &per_page);

    match state.tera.render("posts/list.html", &context) {
        Ok(html) => Html(html).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn new_post_form(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.tera.render("posts/new.html", &Context::new()) {
        Ok(html) => Html(html).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn create_post(
    State(state): State<Arc<AppState>>,
    Form(form): Form<CreatePostForm>,
) -> impl IntoResponse {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();

    let result = sqlx::query(
        "INSERT INTO posts (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&form.title)
    .bind(&form.content)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Redirect::to(&format!("/posts/{}", id)).into_response(),
        Err(e) => {
            let mut context = Context::new();
            context.insert("error", &e.to_string());
            context.insert("title", &form.title);
            context.insert("content", &form.content);
            match state.tera.render("posts/new.html", &context) {
                Ok(html) => (StatusCode::BAD_REQUEST, Html(html)).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            }
        }
    }
}

async fn show_post(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let post = sqlx::query_as::<_, Post>(
        "SELECT id, title, content, created_at, updated_at FROM posts WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await;

    match post {
        Ok(Some(post)) => {
            let mut context = Context::new();
            context.insert("post", &post_to_view(post));
            match state.tera.render("posts/show.html", &context) {
                Ok(html) => Html(html).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            }
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Post not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn edit_post_form(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let post = sqlx::query_as::<_, Post>(
        "SELECT id, title, content, created_at, updated_at FROM posts WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await;

    match post {
        Ok(Some(post)) => {
            let mut context = Context::new();
            context.insert("post", &post_to_view(post));
            match state.tera.render("posts/edit.html", &context) {
                Ok(html) => Html(html).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            }
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Post not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn update_post(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Form(form): Form<UpdatePostForm>,
) -> impl IntoResponse {
    let now = Utc::now();

    let result = sqlx::query(
        "UPDATE posts SET title = ?, content = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&form.title)
    .bind(&form.content)
    .bind(now)
    .bind(&id)
    .execute(&state.db)
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            Redirect::to(&format!("/posts/{}", id)).into_response()
        }
        Ok(_) => (StatusCode::NOT_FOUND, "Post not found").into_response(),
        Err(e) => {
            let mut context = Context::new();
            context.insert("error", &e.to_string());
            context.insert("post", &PostView {
                id: id.clone(),
                title: form.title,
                content: form.content,
                created_at: now.format("%b %d, %Y").to_string(),
                updated_at: now.format("%b %d, %Y").to_string(),
                created_at_iso: now.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
                updated_at_iso: now.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            });
            match state.tera.render("posts/edit.html", &context) {
                Ok(html) => (StatusCode::BAD_REQUEST, Html(html)).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            }
        }
    }
}

async fn delete_post(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM posts WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => Redirect::to("/posts").into_response(),
        Ok(_) => (StatusCode::NOT_FOUND, "Post not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn update_or_delete_post(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Form(form): Form<serde_json::Value>,
) -> impl IntoResponse {
    match form.get("_method").and_then(|v| v.as_str()) {
        Some("DELETE") => delete_post(State(state), Path(id)).await.into_response(),
        Some("PUT") => {
            let title = form.get("title").and_then(|v| v.as_str()).unwrap_or("");
            let content = form.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let update_form = UpdatePostForm {
                title: title.to_string(),
                content: content.to_string(),
            };
            update_post(State(state), Path(id), Form(update_form)).await.into_response()
        }
        _ => (StatusCode::BAD_REQUEST, "Invalid method").into_response(),
    }
}