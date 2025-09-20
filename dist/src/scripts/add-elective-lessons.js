"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.addElectiveLessons = addElectiveLessons;
const path = __importStar(require("path"));
const sqlite = __importStar(require("sqlite"));
const sqlite3 = __importStar(require("sqlite3"));
const os = __importStar(require("os"));
class StandaloneDatabaseManager {
    constructor() {
        this.db = null;
        // Use the same path as Electron would use
        const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'modern-lesson-manager');
        this.dbPath = path.join(userDataPath, 'lesson_manager_ortaokul.db');
    }
    async initialize() {
        this.db = await sqlite.open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
        console.log('Connected to SQLite database at:', this.dbPath);
    }
    async getOne(sql, params = []) {
        if (!this.db)
            throw new Error('Database not initialized');
        return await this.db.get(sql, params);
    }
    async runSQL(sql, params = []) {
        if (!this.db)
            throw new Error('Database not initialized');
        await this.db.run(sql, params);
    }
    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
    }
}
async function addElectiveLessons() {
    console.log('\n=== Seçmeli Dersler Ekleniyor ===');
    const dbManager = new StandaloneDatabaseManager();
    try {
        await dbManager.initialize();
        // Ortaokul seçmeli dersleri - MEB 2023-2024 müfredatı baz alınarak
        const electiveLessons = [
            // 5-6. Sınıf Seçmeli Dersleri (2 saat versiyonlar)
            { name: 'Bilim Uygulamaları', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
            { name: 'Proje Tasarım ve Yönetimi', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
            { name: 'İnsan Hakları, Yurttaşlık ve Demokrasi', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
            { name: 'Oyun ve Fiziki Etkinlikler', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
            { name: 'Kur\'an-ı Kerim', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
            { name: 'Peygamberimizin Hayatı', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
            { name: 'Temel Dini Bilgiler', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
            // 7-8. Sınıf Seçmeli Dersleri (2 saat versiyonlar)
            { name: 'Matematik Uygulamaları', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Fen Uygulamaları', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Robotik ve Kodlama', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Araştırma Projeleri', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Spor ve Fiziki Etkinlikler', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Oyun ve Fiziki Etkinlikler', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Kur\'an-ı Kerim', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Peygamberimizin Hayatı', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Temel Dini Bilgiler', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Hz. Muhammed\'in Hayatı', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
            // Tüm Sınıflar için Ortak Seçmeli Dersler (2 saat versiyonlar)
            { name: 'Yaratici Drama', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Zeka Oyunları', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Yarışmacı Matematik', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Bilişim Teknolojileri', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'İkinci Yabancı Dil (Almanca)', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'İkinci Yabancı Dil (Fransızca)', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Okuma Becerileri', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Yazarlık ve Yazma Becerileri', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Halk Kültürü', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'İş Güvenliği ve Sağlığı', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Türkiye Coğrafyası', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Aile Eğitimi', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Çevre Eğitimi', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Medya Okur Yazarlığı', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            { name: 'Girişimcilik', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            // 1 saatlik seçmeli dersler (2+2+1 yapısı için)
            { name: 'Rehberlik ve Yönlendirme', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
            { name: 'Okuma Becerileri (1 saat)', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
            { name: 'Zeka Oyunları (1 saat)', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
            { name: 'Yaratıcı Drama (1 saat)', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
            { name: 'Çevre Eğitimi (1 saat)', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
            { name: 'Medya Okur Yazarlığı (1 saat)', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
            { name: 'İş Güvenliği ve Sağlığı (1 saat)', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
            { name: 'Yarışmacı Matematik (1 saat)', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
            { name: 'Bilişim Teknolojileri (1 saat)', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
            { name: 'Halk Kültürü (1 saat)', grades: [5, 6, 7, 8], hours: 1, school_type: 'Ortaokul' },
        ];
        let addedCount = 0;
        for (const lesson of electiveLessons) {
            for (const grade of lesson.grades) {
                // Bu ders bu sınıfta var mı kontrol et
                const existingLesson = await dbManager.getOne(`
          SELECT * FROM lessons 
          WHERE name = ? AND grade = ? AND school_type = ?
        `, [lesson.name, grade, lesson.school_type]);
                if (!existingLesson) {
                    console.log(`${grade}. sınıf seçmeli dersi ekleniyor: ${lesson.name} (${lesson.hours} saat)`);
                    await dbManager.runSQL(`
            INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type, created_at, updated_at)
            VALUES (?, ?, ?, 0, ?, datetime('now'), datetime('now'))
          `, [lesson.name, grade, lesson.hours, lesson.school_type]);
                    addedCount++;
                }
            }
        }
        console.log(`\n${addedCount} adet seçmeli ders eklendi!`);
        console.log('Seçmeli dersler ekleme işlemi tamamlandı!');
    }
    catch (error) {
        console.error('Seçmeli dersler eklenirken hata:', error);
        throw error;
    }
    finally {
        await dbManager.close();
    }
}
// Main execution
if (require.main === module) {
    addElectiveLessons().catch(console.error);
}
//# sourceMappingURL=add-elective-lessons.js.map