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
exports.testElectiveAvailability = testElectiveAvailability;
const path = __importStar(require("path"));
const sqlite = __importStar(require("sqlite"));
const sqlite3 = __importStar(require("sqlite3"));
const os = __importStar(require("os"));
// Simplified database manager for testing
class TestDatabaseManager {
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
async function testElectiveAvailability() {
    console.log('\n=== Seçmeli Ders Kullanılabilirlik Testi ===');
    const dbManager = new TestDatabaseManager();
    try {
        await dbManager.initialize();
        // Test 1: Get all electives with their status for each grade
        console.log('\n--- Her Sınıf İçin Seçmeli Ders Durumu ---');
        for (const grade of [5, 6, 7, 8]) {
            console.log(`\n${grade}. Sınıf Seçmeli Dersleri:`);
            // Get electives with status
            const electivesWithStatus = await dbManager.getAll(`
        SELECT 
          l.*,
          CASE 
            WHEN ta.lesson_id IS NOT NULL THEN 1 
            ELSE 0 
          END as is_assigned,
          CASE 
            WHEN ta.lesson_id IS NOT NULL THEN (
              SELECT GROUP_CONCAT(c.section, ', ')
              FROM teacher_assignments ta2
              JOIN classes c ON ta2.class_id = c.id
              WHERE ta2.lesson_id = l.id AND c.grade = l.grade
            )
            ELSE NULL 
          END as assigned_to_sections,
          CASE 
            WHEN ta.lesson_id IS NOT NULL THEN (
              SELECT t.name
              FROM teacher_assignments ta2
              JOIN teachers t ON ta2.teacher_id = t.id
              WHERE ta2.lesson_id = l.id AND ta2.class_id IN (
                SELECT id FROM classes WHERE grade = l.grade
              )
              LIMIT 1
            )
            ELSE NULL 
          END as assigned_teacher
        FROM lessons l
        LEFT JOIN (
          SELECT DISTINCT lesson_id
          FROM teacher_assignments ta
          JOIN classes c ON ta.class_id = c.id
          WHERE c.grade = ?
        ) ta ON l.id = ta.lesson_id
        WHERE l.grade = ? AND l.is_mandatory = 0
        ORDER BY l.name ASC
        LIMIT 10
      `, [grade, grade]);
            if (electivesWithStatus.length === 0) {
                console.log('  Hiç seçmeli ders bulunamadı.');
            }
            else {
                electivesWithStatus.forEach(lesson => {
                    const status = lesson.is_assigned ? '🔴 ATANMIŞ' : '🟢 MÜSAİT';
                    const assignment = lesson.is_assigned
                        ? ` (${lesson.assigned_teacher} - ${lesson.assigned_to_sections} şubesi)`
                        : '';
                    console.log(`  ${status} ${lesson.name}${assignment}`);
                });
            }
        }
        // Test 2: Show available electives for each grade
        console.log('\n--- Her Sınıf İçin Müsait Seçmeli Dersler ---');
        for (const grade of [5, 6, 7, 8]) {
            const availableElectives = await dbManager.getAll(`
        SELECT DISTINCT l.* 
        FROM lessons l
        WHERE l.grade = ? 
          AND l.is_mandatory = 0
          AND l.id NOT IN (
            SELECT DISTINCT lesson_id 
            FROM teacher_assignments ta
            JOIN classes c ON ta.class_id = c.id
            WHERE c.grade = ?
          )
        ORDER BY l.name ASC
        LIMIT 10
      `, [grade, grade]);
            console.log(`\n${grade}. sınıf için ${availableElectives.length} müsait seçmeli ders:`);
            availableElectives.forEach(lesson => {
                console.log(`  🟢 ${lesson.name} (${lesson.weekly_hours} saat)`);
            });
        }
        // Test 3: Show assigned electives
        console.log('\n--- Atanmış Seçmeli Dersler ---');
        for (const grade of [5, 6, 7, 8]) {
            const assignedElectives = await dbManager.getAll(`
        SELECT DISTINCT 
          l.*,
          t.name as teacher_name,
          c.grade,
          c.section,
          c.id as class_id
        FROM lessons l
        JOIN teacher_assignments ta ON l.id = ta.lesson_id
        JOIN teachers t ON ta.teacher_id = t.id
        JOIN classes c ON ta.class_id = c.id
        WHERE l.grade = ? 
          AND l.is_mandatory = 0
        ORDER BY l.name ASC, c.section ASC
        LIMIT 10
      `, [grade]);
            if (assignedElectives.length > 0) {
                console.log(`\n${grade}. sınıf atanmış seçmeli dersleri:`);
                assignedElectives.forEach(lesson => {
                    console.log(`  🔴 ${lesson.name} → ${lesson.teacher_name} (${lesson.grade}/${lesson.section})`);
                });
            }
            else {
                console.log(`\n${grade}. sınıf için henüz atanmış seçmeli ders yok.`);
            }
        }
        console.log('\n=== Test Tamamlandı ===');
        console.log('\n💡 Bu sistem sayesinde:');
        console.log('   • Bir seçmeli ders bir sınıfa atandığında, aynı seviyedeki diğer sınıflara gözükmez');
        console.log('   • Öğretmenler sadece müsait seçmeli dersleri görebilir');
        console.log('   • Çakışma engellenmiş olur');
    }
    catch (error) {
        console.error('Test sırasında hata:', error);
        throw error;
    }
    finally {
        await dbManager.close();
    }
}
// Main execution
if (require.main === module) {
    testElectiveAvailability().catch(console.error);
}
//# sourceMappingURL=test-elective-availability.js.map