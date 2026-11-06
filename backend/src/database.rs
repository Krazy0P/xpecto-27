use mongodb::{
    bson::{doc, Document},
    options::{IndexOptions, UpdateOptions},
    Client, Collection, IndexModel,
};
use tracing::{error, info};

use crate::config::Config;

pub struct AppDatabase {
    pub client: Client,
    pub users: Collection<Document>,
    pub events: Collection<Document>,
    pub workshops: Collection<Document>,
    pub team_members: Collection<Document>,
    pub sponsors: Collection<Document>,
    pub mess_options: Collection<Document>,
    pub fest_info: Collection<Document>,
    pub payment_info: Collection<Document>,
    pub admins: Collection<Document>,
    pub ambassadors: Collection<Document>,
    pub registrations: Collection<Document>,
}

impl Clone for AppDatabase {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            users: self.users.clone(),
            events: self.events.clone(),
            workshops: self.workshops.clone(),
            team_members: self.team_members.clone(),
            sponsors: self.sponsors.clone(),
            mess_options: self.mess_options.clone(),
            fest_info: self.fest_info.clone(),
            payment_info: self.payment_info.clone(),
            admins: self.admins.clone(),
            ambassadors: self.ambassadors.clone(),
            registrations: self.registrations.clone(),
        }
    }
}

impl AppDatabase {
    pub async fn connect(config: &Config) -> anyhow::Result<Self> {
        let client = Client::with_uri_str(&config.mongodb_uri).await?;
        // Ping to verify connectivity.
        client.database(&config.db_name).run_command(doc! {"ping": 1}, None).await?;
        info!("MongoDB connected to database {}", config.db_name);

        let db = client.database(&config.db_name);
        let db = Self {
            client,
            users: db.collection("users"),
            events: db.collection("events"),
            workshops: db.collection("workshops"),
            team_members: db.collection("team_members"),
            sponsors: db.collection("sponsors"),
            mess_options: db.collection("mess_options"),
            fest_info: db.collection("fest_info"),
            payment_info: db.collection("payment_info"),
            admins: db.collection("admins"),
            ambassadors: db.collection("ambassadors"),
            registrations: db.collection("registrations"),
        };
        db.ensure_indexes().await?;
        Ok(db)
    }

    async fn ensure_indexes(&self) -> anyhow::Result<()> {
        let idx = |keys: Document| IndexModel::builder().keys(keys).build();
        let unique_idx = |keys: Document| {
            IndexModel::builder()
                .keys(keys)
                .options(IndexOptions::builder().unique(true).build())
                .build()
        };

        self.users
            .create_index(unique_idx(doc! { "email": 1 }), None)
            .await?;

        self.events
            .create_index(unique_idx(doc! { "slug": 1 }), None)
            .await?;
        self.events.create_index(idx(doc! { "category": 1 }), None).await?;

        self.team_members
            .create_index(idx(doc! { "order": 1 }), None)
            .await?;

        self.sponsors.create_index(idx(doc! { "tier": 1 }), None).await?;

        self.admins
            .create_index(unique_idx(doc! { "email": 1 }), None)
            .await?;
        self.ambassadors
            .create_index(unique_idx(doc! { "email": 1 }), None)
            .await?;

        // Registrations indexes.
        self.registrations
            .create_index(unique_idx(doc! { "transaction_id": 1 }), None)
            .await?;

        // One registration per user per target (event/workshop).
        self.registrations
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "user_id": 1, "kind": 1, "target_id": 1 })
                    .options(
                        IndexOptions::builder()
                            .unique(true)
                            .partial_filter_expression(doc! {
                                "kind": { "$in": ["event", "workshop"] }
                            })
                            .build(),
                    )
                    .build(),
                None,
            )
            .await?;

        // One mess registration per user per mess option.
        self.registrations
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "user_id": 1, "mess_option": 1 })
                    .options(
                        IndexOptions::builder()
                            .unique(true)
                            .partial_filter_expression(doc! { "kind": "mess" })
                            .build(),
                    )
                    .build(),
                None,
            )
            .await?;

        self.registrations
            .create_index(idx(doc! { "status": 1 }), None)
            .await?;
        self.registrations
            .create_index(idx(doc! { "user_id": 1 }), None)
            .await?;
        self.registrations
            .create_index(idx(doc! { "created_at": 1 }), None)
            .await?;

        info!("MongoDB indexes ensured");
        Ok(())
    }

    pub async fn health(&self) -> anyhow::Result<()> {
        self.client
            .database("admin")
            .run_command(doc! {"ping": 1}, None)
            .await?;
        Ok(())
    }
}

pub fn oid_from_hex(s: &str) -> anyhow::Result<bson::oid::ObjectId> {
    Ok(bson::oid::ObjectId::parse_str(s)?)
}

pub fn now() -> bson::DateTime {
    bson::DateTime::now()
}

impl AppDatabase {
    pub fn collection_names() -> Vec<&'static str> {
        vec![
            "users", "events", "workshops", "team_members", "sponsors",
            "mess_options", "fest_info", "payment_info", "admins", "ambassadors", "registrations",
        ]
    }
}

impl Drop for AppDatabase {
    fn drop(&mut self) {
        // Client is internally reference-counted; nothing explicit to close.
    }
}
