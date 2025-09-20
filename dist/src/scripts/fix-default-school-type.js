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
exports.fixDefaultSchoolType = fixDefaultSchoolType;
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
    async getOne(sql, params = []) {
        if (!this.db)
            throw new Error('Database not initialized');
        return await this.db.get(sql, params);
    }
    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
    }
}
async function fixDefaultSchoolType() {
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
        }
        else {
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
        }
        else {
            console.log('❌ Okul türü ayarlanamadı.');
        }
    }
    catch (error) {
        console.error('Varsayılan okul türü düzeltilirken hata:', error);
        throw error;
    }
    finally {
        await dbManager.close();
    }
}
// Main execution
if (require.main === module) {
    fixDefaultSchoolType().catch(console.error);
}
//# sourceMappingURL=fix-default-school-type.js.map