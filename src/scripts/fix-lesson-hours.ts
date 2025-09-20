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

async function fixLessonHours(): Promise<void> {
  console.log('\n=== Ders Saatleri Düzeltmesi ===');
  
  const dbManager = new StandaloneDatabaseManager();
  
  try {
    await dbManager.initialize();
    
    // Fix 5th and 6th grade - need to add 1 hour to reach 30 mandatory
    console.log('\n--- 5. ve 6. Sınıf Düzeltmeleri ---');
    for (const grade of [5, 6]) {
      console.log(`${grade}. sınıf için Türkçe dersini 6 saatten 7 saate çıkarılıyor...`);
      await dbManager.runSQL(`
        UPDATE lessons 
        SET weekly_hours = 7, updated_at = datetime('now')
        WHERE name = 'Türkçe' AND grade = ? AND school_type = 'Ortaokul'
      `, [grade]);
    }
    
    // Fix 7th grade - need to add 1 hour to reach 30 mandatory  
    console.log('\n--- 7. Sınıf Düzeltmeleri ---');
    console.log('7. sınıf için Türkçe dersini 5 saatten 6 saate çıkarılıyor...');
    await dbManager.runSQL(`
      UPDATE lessons 
      SET weekly_hours = 6, updated_at = datetime('now')
      WHERE name = 'Türkçe' AND grade = 7 AND school_type = 'Ortaokul'
    `);
    
    // Fix 8th grade - remove duplicate English lesson and adjust hours
    console.log('\n--- 8. Sınıf Düzeltmeleri ---');
    
    // First, check if there are duplicate English lessons
    const duplicateEnglish = await dbManager.getAll(`
      SELECT * FROM lessons 
      WHERE grade = 8 AND school_type = 'Ortaokul' 
      AND (name = 'İngilizce' OR name = 'Yabancı Dil (İngilizce)')
      AND is_mandatory = 1
    `);
    
    console.log(`8. sınıfta ${duplicateEnglish.length} adet zorunlu İngilizce dersi bulundu.`);
    
    if (duplicateEnglish.length > 1) {
      // Remove the duplicate 'İngilizce' lesson, keep 'Yabancı Dil (İngilizce)'
      console.log('Tekrarlanan "İngilizce" dersi siliniyor...');
      await dbManager.runSQL(`
        DELETE FROM lessons 
        WHERE name = 'İngilizce' AND grade = 8 AND school_type = 'Ortaokul' AND is_mandatory = 1
      `);
    }
    
    // Now reduce Türkçe from 5 to 3 hours to get total 30 mandatory hours
    console.log('8. sınıf için Türkçe dersini 5 saatten 3 saate düşürülüyor...');
    await dbManager.runSQL(`
      UPDATE lessons 
      SET weekly_hours = 3, updated_at = datetime('now')
      WHERE name = 'Türkçe' AND grade = 8 AND school_type = 'Ortaokul'
    `);
    
    console.log('\n=== Düzeltmeler Tamamlandı ===');
    
    // Verify the results
    console.log('\n=== Sonuç Kontrolü ===');
    for (const grade of [5, 6, 7, 8]) {
      const mandatoryLessons = await dbManager.getAll(`
        SELECT name, weekly_hours 
        FROM lessons 
        WHERE grade = ? AND school_type = 'Ortaokul' AND is_mandatory = 1
        AND name != 'Rehberlik ve Yönlendirme'
        ORDER BY name
      `, [grade]);
      
      const guidanceLesson = await dbManager.getOne(`
        SELECT weekly_hours 
        FROM lessons 
        WHERE grade = ? AND school_type = 'Ortaokul' AND name = 'Rehberlik ve Yönlendirme'
      `, [grade]);
      
      let totalMandatory = 0;
      mandatoryLessons.forEach(lesson => {
        totalMandatory += lesson.weekly_hours;
      });
      
      const guidanceHours = guidanceLesson ? guidanceLesson.weekly_hours : 0;
      
      console.log(`${grade}. sınıf: ${totalMandatory} zorunlu + ${guidanceHours} rehberlik = ${totalMandatory + guidanceHours} toplam`);
      
      if (totalMandatory === 30 && guidanceHours === 1) {
        console.log(`✅ ${grade}. sınıf hedef saatlere uygun (30+1)`);
      } else {
        console.log(`❌ ${grade}. sınıf hedef saatlere uygun değil!`);
      }
    }
    
  } catch (error) {
    console.error('Ders saatleri düzeltilirken hata:', error);
    throw error;
  } finally {
    await dbManager.close();
  }
}

// Main execution
if (require.main === module) {
  fixLessonHours().catch(console.error);
}

export { fixLessonHours };