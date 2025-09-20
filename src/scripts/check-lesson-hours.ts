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

  async getAll(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.all(sql, params);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

async function checkLessonHours(): Promise<void> {
  console.log('\n=== Mevcut Ders Saatleri Kontrolü ===');
  
  const dbManager = new StandaloneDatabaseManager();
  
  try {
    await dbManager.initialize();
    
    for (const grade of [5, 6, 7, 8]) {
      console.log(`\n--- ${grade}. Sınıf Dersleri ---`);
      
      // Get all lessons for this grade
      const lessons = await dbManager.getAll(`
        SELECT name, weekly_hours, is_mandatory 
        FROM lessons 
        WHERE grade = ? AND school_type = 'Ortaokul'
        ORDER BY is_mandatory DESC, name ASC
      `, [grade]);
      
      let mandatoryHours = 0;
      let electiveHours = 0;
      let guidanceHours = 0;
      
      lessons.forEach(lesson => {
        console.log(`- ${lesson.name}: ${lesson.weekly_hours} saat/hafta (${lesson.is_mandatory ? 'Zorunlu' : 'Seçmeli'})`);
        
        if (lesson.is_mandatory) {
          if (lesson.name === 'Rehberlik ve Yönlendirme') {
            guidanceHours += lesson.weekly_hours;
          } else {
            mandatoryHours += lesson.weekly_hours;
          }
        } else {
          electiveHours += lesson.weekly_hours;
        }
      });
      
      console.log(`\nToplam Zorunlu Dersler: ${mandatoryHours} saat`);
      console.log(`Rehberlik ve Yönlendirme: ${guidanceHours} saat`);
      console.log(`Seçmeli Dersler: ${electiveHours} saat`);
      console.log(`GENEL TOPLAM: ${mandatoryHours + guidanceHours + electiveHours} saat`);
      console.log(`Hedef: 30 zorunlu + 1 rehberlik + 5 seçmeli = 36 saat`);
    }
    
  } catch (error) {
    console.error('Ders saatleri kontrol edilirken hata:', error);
    throw error;
  } finally {
    await dbManager.close();
  }
}

// Main execution
if (require.main === module) {
  checkLessonHours().catch(console.error);
}

export { checkLessonHours };