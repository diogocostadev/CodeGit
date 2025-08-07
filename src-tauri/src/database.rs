use sqlx::{sqlite::SqlitePool, Row};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::path::PathBuf;
use tauri::api::path::data_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: Option<i64>,
    pub name: String,
    pub email: String,
    pub workspace_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Organization {
    pub id: String,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
    pub avatar: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub path: String,
    pub organization_id: Option<String>,
    pub remote_url: Option<String>,
    pub current_branch: String,
    pub last_commit: String,
    pub is_dirty: bool,
    pub is_favorite: bool,
    pub tags: serde_json::Value, // JSON array of strings
    pub last_accessed: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub id: Option<i64>,
    pub is_first_time: bool,
    pub theme_mode: String, // 'dark' | 'light' | 'auto'
    pub font_size: i32,
    pub font_family: String,
    pub language: String,
    pub settings_json: serde_json::Value, // Complete settings as JSON
    pub updated_at: DateTime<Utc>,
}

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    // Public getter for the pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    pub async fn new() -> Result<Self, sqlx::Error> {
        // Use app data directory for better cross-platform compatibility
        let app_data_dir = data_dir().unwrap_or_else(|| {
            // Fallback for different platforms
            #[cfg(target_os = "macos")]
            { PathBuf::from(std::env::var("HOME").unwrap_or_default()).join("Library/Application Support") }
            #[cfg(target_os = "windows")]
            { PathBuf::from(std::env::var("APPDATA").unwrap_or_default()) }
            #[cfg(target_os = "linux")]
            { PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".local/share") }
            #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
            { PathBuf::from(".") }
        });
        
        let codegit_dir = app_data_dir.join("codegit");
        let db_path = codegit_dir.join("database.sqlite");
        
        // Create directory if it doesn't exist
        std::fs::create_dir_all(&codegit_dir).map_err(|e| {
            eprintln!("Failed to create codegit directory: {}", e);
            sqlx::Error::Io(e)
        })?;

        // SQLite connection with embedded mode
        let database_url = format!("sqlite:{}?mode=rwc", db_path.to_string_lossy());
        println!("📄 Creating SQLite database at: {}", db_path.display());
        
        let pool = SqlitePool::connect(&database_url).await?;

        let db = Database { pool };
        db.initialize().await?;
        Ok(db)
    }

    async fn initialize(&self) -> Result<(), sqlx::Error> {
        // Create tables
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                workspace_name TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS organizations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                description TEXT,
                avatar TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS repositories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                organization_id TEXT,
                remote_url TEXT,
                current_branch TEXT NOT NULL,
                last_commit TEXT NOT NULL,
                is_dirty BOOLEAN NOT NULL DEFAULT FALSE,
                is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
                tags TEXT NOT NULL DEFAULT '[]',
                last_accessed DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                is_first_time BOOLEAN NOT NULL DEFAULT TRUE,
                theme_mode TEXT NOT NULL DEFAULT 'dark',
                font_size INTEGER NOT NULL DEFAULT 14,
                font_family TEXT NOT NULL DEFAULT 'Inter',
                language TEXT NOT NULL DEFAULT 'en',
                settings_json TEXT NOT NULL DEFAULT '{}',
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Insert default settings if not exists
        sqlx::query(
            r#"
            INSERT OR IGNORE INTO app_settings (id, is_first_time, settings_json, updated_at)
            VALUES (1, TRUE, '{}', CURRENT_TIMESTAMP)
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // User operations
    pub async fn save_user(&self, user: &UserInfo) -> Result<i64, sqlx::Error> {
        let now = Utc::now();
        let result = sqlx::query(
            r#"
            INSERT OR REPLACE INTO users (name, email, workspace_name, created_at, updated_at)
            VALUES (?1, ?2, ?3, COALESCE((SELECT created_at FROM users WHERE email = ?2), ?4), ?4)
            "#,
        )
        .bind(&user.name)
        .bind(&user.email)
        .bind(&user.workspace_name)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn get_user(&self) -> Result<Option<UserInfo>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT id, name, email, workspace_name, created_at, updated_at FROM users ORDER BY id DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| UserInfo {
            id: Some(r.get("id")),
            name: r.get("name"),
            email: r.get("email"),
            workspace_name: r.get("workspace_name"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }))
    }

    // Organization operations
    pub async fn save_organization(&self, org: &Organization) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO organizations 
            (id, name, color, description, avatar, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, COALESCE((SELECT created_at FROM organizations WHERE id = ?1), ?6), ?6)
            "#,
        )
        .bind(&org.id)
        .bind(&org.name)
        .bind(&org.color)
        .bind(&org.description)
        .bind(&org.avatar)
        .bind(&org.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_organizations(&self) -> Result<Vec<Organization>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT id, name, color, description, avatar, created_at, updated_at FROM organizations ORDER BY created_at ASC"
        )
        .fetch_all(&self.pool)
        .await?;

        let organizations = rows
            .into_iter()
            .map(|r| Organization {
                id: r.get("id"),
                name: r.get("name"),
                color: r.get("color"),
                description: r.get("description"),
                avatar: r.get("avatar"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            })
            .collect();

        Ok(organizations)
    }

    pub async fn delete_organization(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM organizations WHERE id = ?1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Repository operations
    pub async fn save_repository(&self, repo: &Repository) -> Result<(), sqlx::Error> {
        let tags_json = serde_json::to_string(&repo.tags).unwrap_or_else(|_| "[]".to_string());
        
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO repositories 
            (id, name, path, organization_id, remote_url, current_branch, last_commit, 
             is_dirty, is_favorite, tags, last_accessed, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 
                    COALESCE((SELECT created_at FROM repositories WHERE id = ?1), ?12), ?12)
            "#,
        )
        .bind(&repo.id)
        .bind(&repo.name)
        .bind(&repo.path)
        .bind(&repo.organization_id)
        .bind(&repo.remote_url)
        .bind(&repo.current_branch)
        .bind(&repo.last_commit)
        .bind(repo.is_dirty)
        .bind(repo.is_favorite)
        .bind(tags_json)
        .bind(&repo.last_accessed)
        .bind(&repo.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_repositories(&self) -> Result<Vec<Repository>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, path, organization_id, remote_url, current_branch, last_commit,
                   is_dirty, is_favorite, tags, last_accessed, created_at, updated_at 
            FROM repositories ORDER BY last_accessed DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let repositories = rows
            .into_iter()
            .map(|r| {
                let tags_str: String = r.get("tags");
                let tags = serde_json::from_str(&tags_str).unwrap_or_else(|_| serde_json::json!([]));
                
                Repository {
                    id: r.get("id"),
                    name: r.get("name"),
                    path: r.get("path"),
                    organization_id: r.get("organization_id"),
                    remote_url: r.get("remote_url"),
                    current_branch: r.get("current_branch"),
                    last_commit: r.get("last_commit"),
                    is_dirty: r.get("is_dirty"),
                    is_favorite: r.get("is_favorite"),
                    tags,
                    last_accessed: r.get("last_accessed"),
                    created_at: r.get("created_at"),
                    updated_at: r.get("updated_at"),
                }
            })
            .collect();

        Ok(repositories)
    }

    pub async fn delete_repository(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM repositories WHERE id = ?1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Settings operations
    pub async fn get_settings(&self) -> Result<AppSettings, sqlx::Error> {
        let row = sqlx::query(
            "SELECT id, is_first_time, theme_mode, font_size, font_family, language, settings_json, updated_at FROM app_settings WHERE id = 1"
        )
        .fetch_one(&self.pool)
        .await?;

        let settings_str: String = row.get("settings_json");
        let settings_json = serde_json::from_str(&settings_str).unwrap_or_else(|_| serde_json::json!({}));

        Ok(AppSettings {
            id: Some(row.get("id")),
            is_first_time: row.get("is_first_time"),
            theme_mode: row.get("theme_mode"),
            font_size: row.get("font_size"),
            font_family: row.get("font_family"),
            language: row.get("language"),
            settings_json,
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn update_settings(&self, settings: &AppSettings) -> Result<(), sqlx::Error> {
        let settings_json_str = serde_json::to_string(&settings.settings_json)
            .unwrap_or_else(|_| "{}".to_string());

        sqlx::query(
            r#"
            UPDATE app_settings SET 
                is_first_time = ?1,
                theme_mode = ?2,
                font_size = ?3,
                font_family = ?4,
                language = ?5,
                settings_json = ?6,
                updated_at = ?7
            WHERE id = 1
            "#,
        )
        .bind(settings.is_first_time)
        .bind(&settings.theme_mode)
        .bind(settings.font_size)
        .bind(&settings.font_family)
        .bind(&settings.language)
        .bind(settings_json_str)
        .bind(Utc::now())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn complete_onboarding(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE app_settings SET is_first_time = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = 1"
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}