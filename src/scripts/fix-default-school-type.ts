import * as path from 'path';
import * as sqlite from 'sqlite';
import * as sqlite3 from 'sqlite3';
import * as os from 'os';

class StandaloneDatabaseManager {
  private db: sqlite.Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'modern-lesson-manager');
    this.dbPath = path.join(userDataPath, 'lesson_manager_ortaokul.db');
  }

  async initialize(): Promise<void> {
    this.db = await sqlite.open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });
    console.log('Connected to SQLite database at:', this.dbPath);
  }

  async runSQL(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run(sql, params);
  }

  async getOne(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.get(sql, params);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

async function fixDefaultSchoolType(): Promise<void> {
  console.log('\n=== Varsayılan Okul Türü Düzeltmesi ===');
  
  const dbManager = new StandaloneDatabaseManager();
  
  try {
    await dbManager.initialize();
    
    // Check current school_type setting
    const currentSetting = await dbManager.getOne(`
      SELECT value FROM settings WHERE key = 'school_type'
    `);
    
    if (currentSetting) {
      console.log(`Mevcut okul türü ayarı: ${currentSetting.value}`);
    } else {
      console.log('Okul türü ayarı bulunamadı.');
    }
    
    // Set school type to Ortaokul
    console.log('Okul türü "Ortaokul" olarak ayarlanıyor...');
    await dbManager.runSQL(`
      INSERT OR REPLACE INTO settings (key, value, created_at, updated_at)
      VALUES ('school_type', 'Ortaokul', datetime('now'), datetime('now'))
    `);
    
    // Verify the change
    const updatedSetting = await dbManager.getOne(`
      SELECT value FROM settings WHERE key = 'school_type'
    `);
    
    if (updatedSetting && updatedSetting.value === 'Ortaokul') {
      console.log('✅ Okul türü başarıyla "Ortaokul" olarak ayarlandı.');
    } else {
      console.log('❌ Okul türü ayarlanamadı.');
    }
    
  } catch (error) {
    console.error('Varsayılan okul türü düzeltilirken hata:', error);
    throw error;
  } finally {
    await dbManager.close();
  }
}

// Main execution
if (require.main === module) {
  fixDefaultSchoolType().catch(console.error);
}

export { fixDefaultSchoolType };