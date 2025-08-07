use crate::database::{Database, UserInfo, Organization, Repository, AppSettings};
use tauri::{State, Manager};
use std::sync::Arc;
use tokio::sync::Mutex;
use sqlx::Row;

pub type DatabaseState = Arc<Mutex<Database>>;

#[tauri::command]
pub async fn init_database(app: tauri::AppHandle) -> Result<(), String> {
    let db = Database::new().await.map_err(|e| format!("Failed to initialize database: {}", e))?;
    app.manage(Arc::new(Mutex::new(db)));
    Ok(())
}

// User commands
#[tauri::command]
pub async fn save_user_info(
    db_state: State<'_, DatabaseState>,
    user: UserInfo,
) -> Result<i64, String> {
    let db = db_state.lock().await;
    db.save_user(&user)
        .await
        .map_err(|e| format!("Failed to save user: {}", e))
}

#[tauri::command]
pub async fn get_user_info(db_state: State<'_, DatabaseState>) -> Result<Option<UserInfo>, String> {
    let db = db_state.lock().await;
    db.get_user()
        .await
        .map_err(|e| format!("Failed to get user: {}", e))
}

// Organization commands
#[tauri::command]
pub async fn save_organization(
    db_state: State<'_, DatabaseState>,
    organization: Organization,
) -> Result<(), String> {
    let db = db_state.lock().await;
    db.save_organization(&organization)
        .await
        .map_err(|e| format!("Failed to save organization: {}", e))
}

#[tauri::command]
pub async fn get_organizations(
    db_state: State<'_, DatabaseState>,
) -> Result<Vec<Organization>, String> {
    let db = db_state.lock().await;
    db.get_organizations()
        .await
        .map_err(|e| format!("Failed to get organizations: {}", e))
}

#[tauri::command]
pub async fn delete_organization(
    db_state: State<'_, DatabaseState>,
    id: String,
) -> Result<(), String> {
    let db = db_state.lock().await;
    db.delete_organization(&id)
        .await
        .map_err(|e| format!("Failed to delete organization: {}", e))
}

// Repository commands
#[tauri::command]
pub async fn save_repository(
    db_state: State<'_, DatabaseState>,
    repository: Repository,
) -> Result<(), String> {
    let db = db_state.lock().await;
    db.save_repository(&repository)
        .await
        .map_err(|e| format!("Failed to save repository: {}", e))
}

#[tauri::command]
pub async fn get_repositories(
    db_state: State<'_, DatabaseState>,
) -> Result<Vec<Repository>, String> {
    let db = db_state.lock().await;
    db.get_repositories()
        .await
        .map_err(|e| format!("Failed to get repositories: {}", e))
}

#[tauri::command]
pub async fn delete_repository(
    db_state: State<'_, DatabaseState>,
    id: String,
) -> Result<(), String> {
    let db = db_state.lock().await;
    db.delete_repository(&id)
        .await
        .map_err(|e| format!("Failed to delete repository: {}", e))
}

// Settings commands
#[tauri::command]
pub async fn get_app_settings(db_state: State<'_, DatabaseState>) -> Result<AppSettings, String> {
    let db = db_state.lock().await;
    db.get_settings()
        .await
        .map_err(|e| format!("Failed to get settings: {}", e))
}

#[tauri::command]
pub async fn update_app_settings(
    db_state: State<'_, DatabaseState>,
    settings: AppSettings,
) -> Result<(), String> {
    let db = db_state.lock().await;
    db.update_settings(&settings)
        .await
        .map_err(|e| format!("Failed to update settings: {}", e))
}

#[tauri::command]
pub async fn complete_onboarding_db(db_state: State<'_, DatabaseState>) -> Result<(), String> {
    let db = db_state.lock().await;
    db.complete_onboarding()
        .await
        .map_err(|e| format!("Failed to complete onboarding: {}", e))
}

// Debug and verification commands
#[tauri::command]
pub async fn get_database_info(db_state: State<'_, DatabaseState>) -> Result<serde_json::Value, String> {
    let db = db_state.lock().await;
    
    let user_count = sqlx::query("SELECT COUNT(*) as count FROM users")
        .fetch_one(db.pool())
        .await
        .map_err(|e| format!("Failed to count users: {}", e))?
        .get::<i64, _>("count");
        
    let org_count = sqlx::query("SELECT COUNT(*) as count FROM organizations")
        .fetch_one(db.pool())
        .await
        .map_err(|e| format!("Failed to count organizations: {}", e))?
        .get::<i64, _>("count");
        
    let repo_count = sqlx::query("SELECT COUNT(*) as count FROM repositories")
        .fetch_one(db.pool())
        .await
        .map_err(|e| format!("Failed to count repositories: {}", e))?
        .get::<i64, _>("count");
        
    let settings_exists = sqlx::query("SELECT COUNT(*) as count FROM app_settings")
        .fetch_one(db.pool())
        .await
        .map_err(|e| format!("Failed to check settings: {}", e))?
        .get::<i64, _>("count") > 0;
    
    // Get actual database path
    let data_dir = tauri::api::path::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let db_path = data_dir.join("codegit").join("database.sqlite");
    
    Ok(serde_json::json!({
        "database_path": db_path.to_string_lossy(),
        "database_exists": db_path.exists(),
        "database_size": db_path.metadata().map(|m| m.len()).unwrap_or(0),
        "tables": {
            "users": user_count,
            "organizations": org_count,
            "repositories": repo_count,
            "settings_configured": settings_exists
        },
        "total_records": user_count + org_count + repo_count,
        "embedded_sqlite": true
    }))
}

#[tauri::command] 
pub async fn verify_data_migration(db_state: State<'_, DatabaseState>) -> Result<serde_json::Value, String> {
    let db = db_state.lock().await;
    
    // Check if we have actual user data (not just defaults)
    let user_data = db.get_user().await.map_err(|e| format!("Failed to get user: {}", e))?;
    let orgs = db.get_organizations().await.map_err(|e| format!("Failed to get orgs: {}", e))?;
    let settings = db.get_settings().await.map_err(|e| format!("Failed to get settings: {}", e))?;
    
    let has_user_data = user_data.is_some() && 
        user_data.as_ref().unwrap().name.len() > 0 &&
        user_data.as_ref().unwrap().email.len() > 0;
    
    let has_organizations = !orgs.is_empty();
    let onboarding_completed = !settings.is_first_time;
    
    Ok(serde_json::json!({
        "migration_status": {
            "has_user_data": has_user_data,
            "has_organizations": has_organizations,
            "onboarding_completed": onboarding_completed,
            "migration_complete": has_user_data && onboarding_completed
        },
        "data": {
            "user": user_data,
            "organization_count": orgs.len(),
            "is_first_time": settings.is_first_time
        }
    }))
}

// Migration commands
#[tauri::command]
pub async fn migrate_from_localstorage(
    db_state: State<'_, DatabaseState>,
    local_storage_data: serde_json::Value,
) -> Result<(), String> {
    let db = db_state.lock().await;

    // Parse localStorage data and migrate to SQLite
    if let Some(state) = local_storage_data.get("state") {
        // Migrate user data
        if let Some(user_data) = state.get("user") {
            let user_info = UserInfo {
                id: None,
                name: user_data
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                email: user_data
                    .get("email")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                workspace_name: user_data
                    .get("workspace_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                created_at: chrono::Utc::now(),
                updated_at: None,
            };
            
            if !user_info.name.is_empty() && !user_info.email.is_empty() {
                db.save_user(&user_info)
                    .await
                    .map_err(|e| format!("Failed to migrate user: {}", e))?;
            }
        }

        // Migrate organizations
        if let Some(workspaces) = state.get("workspaces") {
            for (_, workspace) in workspaces.as_object().unwrap_or(&serde_json::Map::new()) {
                if let Some(organizations) = workspace.get("organizations") {
                    if let Some(orgs_array) = organizations.as_array() {
                        for org_value in orgs_array {
                            let org = Organization {
                                id: org_value
                                    .get("id")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                name: org_value
                                    .get("name")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                color: org_value
                                    .get("color")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("#3b82f6")
                                    .to_string(),
                                description: org_value
                                    .get("description")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string()),
                                avatar: org_value
                                    .get("avatar")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string()),
                                created_at: chrono::Utc::now(),
                                updated_at: chrono::Utc::now(),
                            };
                            
                            if !org.id.is_empty() && !org.name.is_empty() {
                                db.save_organization(&org)
                                    .await
                                    .map_err(|e| format!("Failed to migrate organization: {}", e))?;
                            }
                        }
                    }
                }
            }
        }

        // Update onboarding status
        let is_first_time = state
            .get("is_first_time")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);
            
        if !is_first_time {
            db.complete_onboarding()
                .await
                .map_err(|e| format!("Failed to update onboarding status: {}", e))?;
        }
    }

    Ok(())
}