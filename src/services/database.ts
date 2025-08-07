import { invoke } from '@tauri-apps/api/tauri';

export interface UserInfo {
  id?: number;
  name: string;
  email: string;
  workspace_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  color: string;
  description?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  name: string;
  path: string;
  organization_id?: string;
  remote_url?: string;
  current_branch: string;
  last_commit: string;
  is_dirty: boolean;
  is_favorite: boolean;
  tags: string[];
  last_accessed: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id?: number;
  is_first_time: boolean;
  theme_mode: 'dark' | 'light' | 'auto';
  font_size: number;
  font_family: string;
  language: string;
  settings_json: Record<string, any>;
  updated_at: string;
}

class DatabaseService {
  // Initialize database
  async init(): Promise<void> {
    try {
      await invoke('init_database');
      console.log('🗄️ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  // User operations
  async saveUser(user: UserInfo): Promise<number> {
    try {
      const userId = await invoke<number>('save_user_info', { user });
      console.log('✅ User saved to database:', userId);
      return userId;
    } catch (error) {
      console.error('❌ Failed to save user:', error);
      throw error;
    }
  }

  async getUser(): Promise<UserInfo | null> {
    try {
      const user = await invoke<UserInfo | null>('get_user_info');
      console.log('📖 User loaded from database:', user);
      return user;
    } catch (error) {
      console.error('❌ Failed to get user:', error);
      throw error;
    }
  }

  // Organization operations
  async saveOrganization(organization: Organization): Promise<void> {
    try {
      await invoke('save_organization', { organization });
      console.log('✅ Organization saved:', organization.name);
    } catch (error) {
      console.error('❌ Failed to save organization:', error);
      throw error;
    }
  }

  async getOrganizations(): Promise<Organization[]> {
    try {
      const organizations = await invoke<Organization[]>('get_organizations');
      console.log('📖 Organizations loaded:', organizations.length);
      return organizations;
    } catch (error) {
      console.error('❌ Failed to get organizations:', error);
      throw error;
    }
  }

  async deleteOrganization(id: string): Promise<void> {
    try {
      await invoke('delete_organization', { id });
      console.log('🗑️ Organization deleted:', id);
    } catch (error) {
      console.error('❌ Failed to delete organization:', error);
      throw error;
    }
  }

  // Repository operations
  async saveRepository(repository: Repository): Promise<void> {
    try {
      await invoke('save_repository', { repository });
      console.log('✅ Repository saved:', repository.name);
    } catch (error) {
      console.error('❌ Failed to save repository:', error);
      throw error;
    }
  }

  async getRepositories(): Promise<Repository[]> {
    try {
      const repositories = await invoke<Repository[]>('get_repositories');
      console.log('📖 Repositories loaded:', repositories.length);
      return repositories;
    } catch (error) {
      console.error('❌ Failed to get repositories:', error);
      throw error;
    }
  }

  async deleteRepository(id: string): Promise<void> {
    try {
      await invoke('delete_repository', { id });
      console.log('🗑️ Repository deleted:', id);
    } catch (error) {
      console.error('❌ Failed to delete repository:', error);
      throw error;
    }
  }

  // Settings operations
  async getSettings(): Promise<AppSettings> {
    try {
      const settings = await invoke<AppSettings>('get_app_settings');
      console.log('⚙️ Settings loaded from database');
      return settings;
    } catch (error) {
      console.error('❌ Failed to get settings:', error);
      throw error;
    }
  }

  async updateSettings(settings: AppSettings): Promise<void> {
    try {
      await invoke('update_app_settings', { settings });
      console.log('✅ Settings updated in database');
    } catch (error) {
      console.error('❌ Failed to update settings:', error);
      throw error;
    }
  }

  async completeOnboarding(): Promise<void> {
    try {
      await invoke('complete_onboarding_db');
      console.log('✅ Onboarding completed in database');
    } catch (error) {
      console.error('❌ Failed to complete onboarding:', error);
      throw error;
    }
  }

  // Migration from localStorage
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const localStorageData = localStorage.getItem('codegit_app_state');
      if (localStorageData) {
        const parsedData = JSON.parse(localStorageData);
        await invoke('migrate_from_localstorage', { localStorageData: parsedData });
        console.log('🔄 Data migrated from localStorage to SQLite');
        
        // Clear localStorage after successful migration
        localStorage.removeItem('codegit_app_state');
        console.log('🧹 localStorage cleaned up');
      }
    } catch (error) {
      console.error('❌ Failed to migrate from localStorage:', error);
      throw error;
    }
  }

  // Helper method to check if app is first time
  async isFirstTime(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.is_first_time;
    } catch (error) {
      // If settings don't exist, it's first time
      return true;
    }
  }

  // Debug and verification methods
  async getDatabaseInfo(): Promise<any> {
    try {
      const info = await invoke('get_database_info');
      console.log('📊 Database info:', info);
      return info;
    } catch (error) {
      console.error('❌ Failed to get database info:', error);
      throw error;
    }
  }

  async verifyDataMigration(): Promise<any> {
    try {
      const status = await invoke('verify_data_migration');
      console.log('🔍 Migration status:', status);
      return status;
    } catch (error) {
      console.error('❌ Failed to verify migration:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;