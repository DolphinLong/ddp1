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

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

async function fix8thGradeHours(): Promise<void> {
  console.log('\n=== 8. Sınıf Ders Saatleri Düzeltmesi ===');
  
  const dbManager = new StandaloneDatabaseManager();
  
  try {
    await dbManager.initialize();
    
    // Increase Turkish to 7 hours to get total 30 mandatory hours
    console.log('8. sınıf için Türkçe dersini 3 saatten 7 saate çıkarılıyor...');
    await dbManager.runSQL(`
      UPDATE lessons 
      SET weekly_hours = 7, updated_at = datetime('now')
      WHERE name = 'Türkçe' AND grade = 8 AND school_type = 'Ortaokul'
    `);
    
    console.log('✅ 8. sınıf Türkçe dersi saati güncellendi.');
    console.log('Artık 8. sınıfta 30 saat zorunlu + 1 saat rehberlik = 31 saat toplam olacak.');
    
  } catch (error) {
    console.error('8. sınıf ders saatleri düzeltilirken hata:', error);
    throw error;
  } finally {
    await dbManager.close();
  }
}

// Main execution
if (require.main === module) {
  fix8thGradeHours().catch(console.error);
}

export { fix8thGradeHours };