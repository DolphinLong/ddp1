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
exports.fix8thGradeHours = fix8thGradeHours;
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
async function fix8thGradeHours() {
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
    }
    catch (error) {
        console.error('8. sınıf ders saatleri düzeltilirken hata:', error);
        throw error;
    }
    finally {
        await dbManager.close();
    }
}
// Main execution
if (require.main === module) {
    fix8thGradeHours().catch(console.error);
}
//# sourceMappingURL=fix-8th-grade-hours.js.map