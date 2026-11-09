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
    pub event_registrations: Collection<Document>,
    pub workshop_registrations: Collection<Document>,
    pub accommodation_registrations: Collection<Document>,
    pub transactions: Collection<Document>, // global transaction-ID guard
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
            event_registrations: self.event_registrations.clone(),
            workshop_registrations: self.workshop_registrations.clone(),
            accommodation_registrations: self.accommodation_registrations.clone(),
            transactions: self.transactions.clone(),
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
            event_registrations: db.collection("event_registrations"),
            workshop_registrations: db.collection("workshop_registrations"),
            accommodation_registrations: db.collection("accommodation_registrations"),
            transactions: db.collection("transactions"),
        };
        db.ensure_indexes().await?;
        Ok(db)
    }

    async fn ensure_indexes(&self) -> anyhow::Result<()> {
        self.normalize_timestamp_fields().await?;

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

        // Global transaction-ID guard (shared by every registration type).
        self.transactions
            .create_index(unique_idx(doc! { "transaction_id": 1 }), None)
            .await?;

        // One active (pending/approved) registration per user per event/workshop;
        // a rejected one can be redone, same as accommodation.
        for c in [&self.event_registrations, &self.workshop_registrations] {
            // Migration: the old index was unique on (user_id, target_id) for ALL statuses,
            // which blocked re-submitting after a rejection. Same keys with different options
            // can't coexist, so drop it first. Errors (index/collection missing) are fine.
            let _ = c.drop_index("user_id_1_target_id_1", None).await;

            c.create_index(
                IndexModel::builder()
                    .keys(doc! { "user_id": 1, "target_id": 1 })
                    .options(
                        IndexOptions::builder()
                            .name("user_target_active_unique".to_string())
                            .unique(true)
                            .partial_filter_expression(doc! {
                                "status": { "$in": ["pending", "approved"] }
                            })
                            .build(),
                    )
                    .build(),
                None,
            )
            .await?;
        }

        // One active (pending/approved) stay per user; a rejected one can be rebooked.
        self.accommodation_registrations
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "user_id": 1 })
                    .options(
                        IndexOptions::builder()
                            .unique(true)
                            .partial_filter_expression(doc! {
                                "status": { "$in": ["pending", "approved"] }
                            })
                            .build(),
                    )
                    .build(),
                None,
            )
            .await?;

        for c in [
            &self.event_registrations,
            &self.workshop_registrations,
            &self.accommodation_registrations,
        ] {
            c.create_index(idx(doc! { "status": 1 }), None).await?;
            // Plain lookup index. It needs an explicit, distinct name: on accommodation the
            // unique partial index above already owns the auto-generated name "user_id_1"
            // (same key), which caused IndexKeySpecsConflict (code 86) at startup.
            // Non-fatal: it's only a performance index.
            if let Err(e) = c
                .create_index(
                    IndexModel::builder()
                        .keys(doc! { "user_id": 1 })
                        .options(
                            IndexOptions::builder()
                                .name("user_id_lookup".to_string())
                                .build(),
                        )
                        .build(),
                    None,
                )
                .await
            {
                tracing::warn!("user_id lookup index skipped: {e}");
            }
        }

        info!("MongoDB indexes ensured");
        Ok(())
    }

    async fn normalize_timestamp_fields(&self) -> anyhow::Result<()> {
        let collections = [
            &self.users,
            &self.events,
            &self.workshops,
            &self.team_members,
            &self.sponsors,
            &self.fest_info,
            &self.admins,
            &self.ambassadors,
            &self.registrations,
            &self.event_registrations,
            &self.workshop_registrations,
            &self.accommodation_registrations,
        ];
        let fields = [
            ("createdAt", "created_at"),
            ("updatedAt", "updated_at"),
            ("startDate", "start_date"),
            ("endDate", "end_date"),
            ("startTime", "start_time"),
            ("endTime", "end_time"),
        ];

        for collection in collections {
            let mut duplicate_aliases = Vec::new();
            let mut unset = Document::new();
            let mut legacy_aliases = Vec::new();
            let mut rename = Document::new();
            for &(camel_case, snake_case) in &fields {
                let mut duplicate_filter = Document::new();
                duplicate_filter.insert(camel_case, doc! { "$exists": true });
                duplicate_filter.insert(snake_case, doc! { "$exists": true });
                duplicate_aliases.push(duplicate_filter);
                unset.insert(camel_case, "");
                let mut legacy_filter = Document::new();
                legacy_filter.insert(camel_case, doc! { "$exists": true });
                legacy_filter.insert(snake_case, doc! { "$exists": false });
                legacy_aliases.push(legacy_filter);
                rename.insert(camel_case, snake_case);
            }
            // Serde treats camelCase and snake_case aliases as the same field.
            collection
                .update_many(
                    doc! { "$or": duplicate_aliases },
                    doc! { "$unset": unset },
                    None,
                )
                .await?;
            collection
                .update_many(
                    doc! { "$or": legacy_aliases },
                    doc! { "$rename": rename },
                    None,
                )
                .await?;
        }

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
    /// Pick the registration collection for a kind ("mess" stays in `registrations`).
    pub fn reg_coll(&self, kind: &str) -> &Collection<Document> {
        match kind {
            "event" => &self.event_registrations,
            "accommodation" => &self.accommodation_registrations,
            "mess" => &self.registrations,
            _ => &self.workshop_registrations,
        }
    }

    pub fn collection_names() -> Vec<&'static str> {
        vec![
            "users", "events", "workshops", "team_members", "sponsors",
            "mess_options", "fest_info", "payment_info", "admins", "ambassadors", "registrations",
            "event_registrations", "workshop_registrations", "accommodation_registrations", "transactions",
        ]
    }
}

impl Drop for AppDatabase {
    fn drop(&mut self) {
        // Client is internally reference-counted; nothing explicit to close.
    }
}
