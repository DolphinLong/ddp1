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
exports.ClassManager = void 0;
class ClassManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }
    async getAll() {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll('SELECT * FROM classes WHERE school_type = ? ORDER BY grade ASC, section ASC', [currentSchoolType]);
    }
    async getById(id) {
        return this.dbManager.getOne('SELECT * FROM classes WHERE id = ?', [id]);
    }
    async create(classData) {
        // Check if class already exists
        const existing = await this.dbManager.getOne('SELECT id FROM classes WHERE school_type = ? AND grade = ? AND section = ?', [classData.school_type, classData.grade, classData.section]);
        if (existing) {
            throw new Error(`${classData.school_type} ${classData.grade}/${classData.section} sınıfı zaten mevcut.`);
        }
        const result = await this.dbManager.runSQL('INSERT INTO classes (school_type, grade, section) VALUES (?, ?, ?)', [classData.school_type, classData.grade, classData.section]);
        const newClass = await this.getById(result.lastID);
        if (!newClass) {
            throw new Error('Failed to create class');
        }
        return newClass;
    }
    async update(id, classData) {
        // If school_type and section are being updated, check for duplicates
        if (classData.school_type !== undefined && classData.section !== undefined) {
            const existing = await this.dbManager.getOne('SELECT id FROM classes WHERE school_type = ? AND section = ? AND id != ?', [classData.school_type, classData.section, id]);
            if (existing) {
                throw new Error(`${classData.school_type} ${classData.section} sınıfı zaten mevcut.`);
            }
        }
        // If school_type, grade and section are being updated, check for duplicates
        if (classData.school_type !== undefined && classData.grade !== undefined && classData.section !== undefined) {
            const existing = await this.dbManager.getOne('SELECT id FROM classes WHERE school_type = ? AND grade = ? AND section = ? AND id != ?', [classData.school_type, classData.grade, classData.section, id]);
            if (existing) {
                throw new Error(`${classData.school_type} ${classData.grade}/${classData.section} sınıfı zaten mevcut.`);
            }
        }
        await this.dbManager.runSQL('UPDATE classes SET school_type = ?, grade = ?, section = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [classData.school_type, classData.grade, classData.section, id]);
        const updatedClass = await this.getById(id);
        if (!updatedClass) {
            throw new Error('Class not found after update');
        }
        return updatedClass;
    }
    async delete(id) {
        // Check if class has any schedule assignments
        const scheduleCount = await this.dbManager.getOne('SELECT COUNT(*) as count FROM schedule_items WHERE class_id = ?', [id]);
        if (scheduleCount && scheduleCount.count > 0) {
            throw new Error('Bu sınıfın aktif ders programı bulunmaktadır. Önce ders programından kaldırın.');
        }
        const result = await this.dbManager.runSQL('DELETE FROM classes WHERE id = ?', [id]);
        return result.changes > 0;
    }
    async getByGrade(grade) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll('SELECT * FROM classes WHERE grade = ? AND school_type = ? ORDER BY section ASC', [grade, currentSchoolType]);
    }
    async getBySchoolType(schoolType) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        // Only allow querying for the current school type to maintain data isolation
        if (schoolType !== currentSchoolType) {
            return [];
        }
        return this.dbManager.getAll('SELECT * FROM classes WHERE school_type = ? ORDER BY section ASC', [schoolType]);
    }
    async getGrades() {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        const results = await this.dbManager.getAll('SELECT DISTINCT grade FROM classes WHERE school_type = ? ORDER BY grade ASC', [currentSchoolType]);
        return results.map(r => r.grade);
    }
    async getSchoolTypes() {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        // Only return the current school type to maintain data isolation
        return [currentSchoolType];
    }
    async getClassSchedule(classId) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        // First verify that the class belongs to the current school type
        const classExists = await this.dbManager.getOne('SELECT id FROM classes WHERE id = ? AND school_type = ?', [classId, currentSchoolType]);
        if (!classExists) {
            return []; // Return empty array if class doesn't exist or doesn't belong to current school type
        }
        return this.dbManager.getAll(`
      SELECT 
        si.*,
        t.name as teacher_name,
        t.subject as teacher_subject,
        c.grade as class_grade,
        c.section as class_section,
        l.name as lesson_name,
        l.weekly_hours
      FROM schedule_items si
      JOIN teachers t ON si.teacher_id = t.id
      JOIN classes c ON si.class_id = c.id
      JOIN lessons l ON si.lesson_id = l.id
      WHERE si.class_id = ? AND c.school_type = ?
      ORDER BY si.day_of_week, si.time_slot
    `, [classId, currentSchoolType]);
    }
    async getClassWorkload(classId) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        // First verify that the class belongs to the current school type
        const classExists = await this.dbManager.getOne('SELECT id FROM classes WHERE id = ? AND school_type = ?', [classId, currentSchoolType]);
        if (!classExists) {
            return { total_hours: 0, teacher_count: 0, lesson_count: 0 }; // Return empty data if class doesn't exist or doesn't belong to current school type
        }
        const result = await this.dbManager.getOne(`
      SELECT 
        COUNT(*) as total_hours,
        COUNT(DISTINCT si.teacher_id) as teacher_count,
        COUNT(DISTINCT si.lesson_id) as lesson_count
      FROM schedule_items si
      JOIN classes c ON si.class_id = c.id
      WHERE si.class_id = ? AND c.school_type = ?
    `, [classId, currentSchoolType]);
        return {
            total_hours: result?.total_hours || 0,
            teacher_count: result?.teacher_count || 0,
            lesson_count: result?.lesson_count || 0
        };
    }
    async getClassSummary(classId) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        // First verify that the class belongs to the current school type
        const classInfo = await this.dbManager.getOne('SELECT * FROM classes WHERE id = ? AND school_type = ?', [classId, currentSchoolType]);
        if (!classInfo) {
            throw new Error('Class not found or does not belong to current school type');
        }
        const workload = await this.getClassWorkload(classId);
        const schedule = await this.getClassSchedule(classId);
        // Group schedule by day
        const scheduleByDay = {};
        schedule.forEach(item => {
            if (!scheduleByDay[item.day_of_week]) {
                scheduleByDay[item.day_of_week] = [];
            }
            scheduleByDay[item.day_of_week].push(item);
        });
        return {
            ...classInfo,
            workload,
            schedule: scheduleByDay,
            total_schedule_items: schedule.length
        };
    }
    async searchClasses(query) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll(`
      SELECT * FROM classes 
      WHERE school_type = ? AND (
        school_type LIKE ? 
        OR CAST(grade AS TEXT) LIKE ?
        OR section LIKE ?
      )
      ORDER BY grade ASC, section ASC
    `, [currentSchoolType, `%${query}%`, `%${query}%`, `%${query}%`]);
    }
    async getClassesWithoutSchedule() {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll(`
      SELECT c.* FROM classes c
      LEFT JOIN schedule_items si ON c.id = si.class_id
      WHERE si.class_id IS NULL AND c.school_type = ?
      ORDER BY c.grade ASC, c.section ASC
    `, [currentSchoolType]);
    }
    async getAllClassesForTeacherAssignment() {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll('SELECT * FROM classes WHERE school_type = ? ORDER BY grade ASC, section ASC', [currentSchoolType]);
    }
    async getClassroomUsage() {
        // This method is no longer relevant since we removed the classroom field
        return [];
    }
    async validateClassData(classData) {
        const errors = [];
        if (classData.school_type !== undefined) {
            if (!classData.school_type.trim()) {
                errors.push('Okul türü gereklidir.');
            }
        }
        if (classData.grade !== undefined) {
            if (classData.grade < 1 || classData.grade > 12) {
                errors.push('Sınıf seviyesi 1-12 arasında olmalıdır.');
            }
        }
        if (classData.section !== undefined) {
            if (!classData.section.trim()) {
                errors.push('Şube bilgisi gereklidir.');
            }
        }
        return errors;
    }
    async generateClassName(schoolType, grade, section) {
        return `${schoolType} ${grade}/${section}`;
    }
    async getAllWithGuidanceCounselors() {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        const classes = await this.dbManager.getAll('SELECT * FROM classes WHERE school_type = ? ORDER BY grade ASC, section ASC', [currentSchoolType]);
        const guidanceCounselors = await this.dbManager.getAllGuidanceCounselors();
        // Create a map of class_id to guidance counselor
        const counselorMap = new Map();
        guidanceCounselors.forEach(counselor => {
            counselorMap.set(counselor.class_id, counselor);
        });
        // Add guidance counselor info and assigned hours to each class
        const classesWithDetails = [];
        for (const classItem of classes) {
            const assignedHours = await this.dbManager.getClassAssignedHours(classItem.id);
            classesWithDetails.push({
                ...classItem,
                guidance_counselor: counselorMap.get(classItem.id),
                assigned_hours: assignedHours
            });
        }
        return classesWithDetails;
    }
    async getClassWithGuidanceCounselor(classId) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        const classInfo = await this.dbManager.getOne('SELECT * FROM classes WHERE id = ? AND school_type = ?', [classId, currentSchoolType]);
        if (!classInfo) {
            throw new Error('Class not found or does not belong to current school type');
        }
        const guidanceCounselor = await this.dbManager.getGuidanceCounselorByClass(classId);
        return {
            ...classInfo,
            guidance_counselor: guidanceCounselor
        };
    }
    async getAllClassesWithGuidanceCounselors() {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        const classes = await this.dbManager.getAll('SELECT * FROM classes WHERE school_type = ? ORDER BY grade ASC, section ASC', [currentSchoolType]);
        const guidanceCounselors = await this.dbManager.getAllGuidanceCounselors();
        // Create a map of class_id to guidance counselor
        const counselorMap = new Map();
        guidanceCounselors.forEach(counselor => {
            counselorMap.set(counselor.class_id, counselor);
        });
        // Add guidance counselor info to each class
        return classes.map(classItem => ({
            ...classItem,
            guidance_counselor: counselorMap.get(classItem.id)
        }));
    }
    async assignGuidanceCounselor(teacherId, classId) {
        // Validate that class and teacher exist
        const classExists = await this.getById(classId);
        if (!classExists) {
            throw new Error('Class not found');
        }
        const teacherManager = new (await Promise.resolve().then(() => __importStar(require('./TeacherManager')))).TeacherManager(this.dbManager);
        const teacherExists = await teacherManager.getById(teacherId);
        if (!teacherExists) {
            throw new Error('Teacher not found');
        }
        return await this.dbManager.assignGuidanceCounselor(teacherId, classId);
    }
    async removeGuidanceCounselor(classId) {
        return await this.dbManager.removeGuidanceCounselor(classId);
    }
    async getEmptyTimeSlots(classId) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        // First verify that the class belongs to the current school type
        const classExists = await this.dbManager.getOne('SELECT id FROM classes WHERE id = ? AND school_type = ?', [classId, currentSchoolType]);
        if (!classExists) {
            return []; // Return empty array if class doesn't exist or doesn't belong to current school type
        }
        const allTimeSlots = [];
        // Generate all possible time slots (5 days, 8 periods)
        for (let day = 1; day <= 5; day++) {
            for (let period = 1; period <= 8; period++) {
                allTimeSlots.push({ day_of_week: day, time_slot: period });
            }
        }
        // Get occupied slots
        const occupiedSlots = await this.dbManager.getAll('SELECT day_of_week, time_slot FROM schedule_items si JOIN classes c ON si.class_id = c.id WHERE si.class_id = ? AND c.school_type = ?', [classId, currentSchoolType]);
        // Filter out occupied slots
        return allTimeSlots.filter(slot => !occupiedSlots.some(occupied => occupied.day_of_week === slot.day_of_week &&
            occupied.time_slot === slot.time_slot));
    }
    async getClassLessons() {
        return await this.dbManager.getClassLessons();
    }
    async getClassLessonsByGrade(grade) {
        return await this.dbManager.getClassLessonsByGrade(grade);
    }
    // Method to get assigned teachers for a specific class
    async getAssignedTeachersForClass(classId) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        // First verify that the class belongs to the current school type
        const classExists = await this.dbManager.getOne('SELECT id FROM classes WHERE id = ? AND school_type = ?', [classId, currentSchoolType]);
        if (!classExists) {
            return []; // Return empty array if class doesn't exist or doesn't belong to current school type
        }
        return await this.dbManager.getAssignedTeachersForClass(classId);
    }
    // Method to get all Ortaokul lessons for teacher assignment
    async getAllOrtaokulLessonsForTeacherAssignment() {
        return await this.dbManager.getAllOrtaokulLessonsForTeacherAssignment();
    }
}
exports.ClassManager = ClassManager;
//# sourceMappingURL=ClassManager.js.map