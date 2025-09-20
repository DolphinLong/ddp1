import { DatabaseManager } from '../database/DatabaseManager';

export class SettingsManager {
  constructor(private dbManager: DatabaseManager) {}

  async getSetting(key: string): Promise<string | null> {
    return this.dbManager.getSetting(key);
  }

  async setSetting(key: string, value: string): Promise<boolean> {
    return this.dbManager.setSetting(key, value);
  }

  async getAllSettings(): Promise<any[]> {
    return this.dbManager.getAllSettings();
  }

  async getSchoolSettings(): Promise<any> {
    const settings = await this.getAllSettings();
    const settingsObj: any = {};
    
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    // Add weekly hour limit based on current school type
    settingsObj.weekly_hour_limit = this.dbManager.getWeeklyHourLimit();
    
    return settingsObj;
  }

  // Get daily periods based on school type
  getDailyPeriodsForSchoolType(schoolType: string): number {
    if (schoolType === 'Ortaokul') {
      return 7;
    } else if (['Genel Lise', 'Anadolu Lisesi', 'Fen Lisesi', 'Sosyal Bilimler Lisesi'].includes(schoolType)) {
      return 8;
    }
    return 8; // Default
  }

  async updateSchoolSettings(settings: any): Promise<boolean> {
    try {
      // Check if school type is being changed
      if (settings.school_type && settings.school_type !== this.dbManager.getCurrentSchoolType()) {
        // Switch database to the new school type
        await this.dbManager.switchDatabase(settings.school_type);
      }
      
      // Update all settings
      for (const key in settings) {
        // Skip school_type as it's handled by database switching
        if (key !== 'school_type') {
          await this.setSetting(key, settings[key]);
        }
      }
      
      // Update school_type setting separately
      if (settings.school_type) {
        await this.setSetting('school_type', settings.school_type);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  }
  
  // Method to initialize with the correct school type from settings
  async initializeWithSchoolType(): Promise<void> {
    try {
      const schoolType = await this.getSetting('school_type');
      if (schoolType) {
        await this.dbManager.switchDatabase(schoolType);
      }
    } catch (error) {
      console.error('Error initializing with school type:', error);
      // This might happen if the database is not yet initialized, which is OK
    }
  }
}