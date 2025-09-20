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
exports.checkLessonHours = checkLessonHours;
const path = __importStar(require("path"));
const sqlite = __importStar(require("sqlite"));
const sqlite3 = __importStar(require("sqlite3"));
const os = __importStar(require("os"));
class StandaloneDatabaseManager {
    constructor() {
        this.db = null;
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
    async getAll(sql, params = []) {
        if (!this.db)
            throw new Error('Database not initialized');
        return await this.db.all(sql, params);
    }
    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
    }
}
async function checkLessonHours() {
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
                    }
                    else {
                        mandatoryHours += lesson.weekly_hours;
                    }
                }
                else {
                    electiveHours += lesson.weekly_hours;
                }
            });
            console.log(`\nToplam Zorunlu Dersler: ${mandatoryHours} saat`);
            console.log(`Rehberlik ve Yönlendirme: ${guidanceHours} saat`);
            console.log(`Seçmeli Dersler: ${electiveHours} saat`);
            console.log(`GENEL TOPLAM: ${mandatoryHours + guidanceHours + electiveHours} saat`);
            console.log(`Hedef: 30 zorunlu + 1 rehberlik + 5 seçmeli = 36 saat`);
        }
    }
    catch (error) {
        console.error('Ders saatleri kontrol edilirken hata:', error);
        throw error;
    }
    finally {
        await dbManager.close();
    }
}
// Main execution
if (require.main === module) {
    checkLessonHours().catch(console.error);
}
//# sourceMappingURL=check-lesson-hours.js.map