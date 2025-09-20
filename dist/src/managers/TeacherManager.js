"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherManager = void 0;
class TeacherManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }
    async getAll() {
        return this.dbManager.getAll('SELECT * FROM teachers ORDER BY name ASC');
    }
    async getById(id) {
        return this.dbManager.getOne('SELECT * FROM teachers WHERE id = ?', [id]);
    }
    async create(teacherData) {
        const result = await this.dbManager.runSQL('INSERT INTO teachers (name, subject, email, phone) VALUES (?, ?, ?, ?)', [teacherData.name, teacherData.subject, teacherData.email, teacherData.phone]);
        const newTeacher = await this.getById(result.lastID);
        if (!newTeacher) {
            throw new Error('Failed to create teacher');
        }
        // Initialize default availability (available all times)
        await this.initializeDefaultAvailability(result.lastID);
        return newTeacher;
    }
    async update(id, teacherData) {
        await this.dbManager.runSQL('UPDATE teachers SET name = ?, subject = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [teacherData.name, teacherData.subject, teacherData.email, teacherData.phone, id]);
        const updatedTeacher = await this.getById(id);
        if (!updatedTeacher) {
            throw new Error('Teacher not found after update');
        }
        return updatedTeacher;
    }
    async delete(id) {
        // Check if teacher has any schedule assignments
        const scheduleCount = await this.dbManager.getOne('SELECT COUNT(*) as count FROM schedule_items WHERE teacher_id = ?', [id]);
        if (scheduleCount && scheduleCount.count > 0) {
            throw new Error('Bu öğretmenin aktif ders programı bulunmaktadır. Önce ders programından kaldırın.');
        }
        const result = await this.dbManager.runSQL('DELETE FROM teachers WHERE id = ?', [id]);
        return result.changes > 0;
    }
    async getAvailability(teacherId) {
        return this.dbManager.getAll('SELECT * FROM teacher_availability WHERE teacher_id = ? ORDER BY day_of_week, time_slot', [teacherId]);
    }
    async setAvailability(teacherId, availability) {
        try {
            // Clear existing availability
            await this.dbManager.runSQL('DELETE FROM teacher_availability WHERE teacher_id = ?', [teacherId]);
            // Insert new availability
            for (const slot of availability) {
                await this.dbManager.runSQL('INSERT INTO teacher_availability (teacher_id, day_of_week, time_slot, is_available) VALUES (?, ?, ?, ?)', [teacherId, slot.day_of_week, slot.time_slot, slot.is_available]);
            }
            return true;
        }
        catch (error) {
            console.error('Error setting teacher availability:', error);
            return false;
        }
    }
    async isAvailable(teacherId, dayOfWeek, timeSlot) {
        const availability = await this.dbManager.getOne('SELECT is_available FROM teacher_availability WHERE teacher_id = ? AND day_of_week = ? AND time_slot = ?', [teacherId, dayOfWeek, timeSlot]);
        // If no record exists, assume available
        return availability ? availability.is_available : true;
    }
    async getTeacherSchedule(teacherId) {
        return this.dbManager.getAll(`
      SELECT 
        si.*,
        t.name as teacher_name,
        c.grade as class_grade,
        c.section as class_section,
        l.name as lesson_name,
        l.weekly_hours
      FROM schedule_items si
      JOIN teachers t ON si.teacher_id = t.id
      JOIN classes c ON si.class_id = c.id
      JOIN lessons l ON si.lesson_id = l.id
      WHERE si.teacher_id = ?
      ORDER BY si.day_of_week, si.time_slot
    `, [teacherId]);
    }
    async getTeacherLessons(teacherId) {
        return this.dbManager.getAll(`
      SELECT DISTINCT l.*, si.class_id, c.grade, c.section
      FROM schedule_items si
      JOIN lessons l ON si.lesson_id = l.id
      JOIN classes c ON si.class_id = c.id
      WHERE si.teacher_id = ?
      ORDER BY l.grade, l.name
    `, [teacherId]);
    }
    async getTeacherWorkload(teacherId) {
        const result = await this.dbManager.getOne(`
      SELECT 
        COUNT(*) as total_hours,
        COUNT(DISTINCT si.class_id) as class_count,
        COUNT(DISTINCT si.lesson_id) as lesson_count
      FROM schedule_items si
      WHERE si.teacher_id = ?
    `, [teacherId]);
        return {
            total_hours: result?.total_hours || 0,
            class_count: result?.class_count || 0,
            lesson_count: result?.lesson_count || 0
        };
    }
    async initializeDefaultAvailability(teacherId) {
        // Create default availability: Monday to Friday, 8 periods per day
        const defaultAvailability = [];
        for (let day = 1; day <= 5; day++) { // Monday to Friday
            for (let period = 1; period <= 8; period++) { // 8 periods per day
                defaultAvailability.push({
                    day_of_week: day,
                    time_slot: period,
                    is_available: true
                });
            }
        }
        await this.setAvailability(teacherId, defaultAvailability);
    }
    async searchTeachers(query) {
        return this.dbManager.getAll('SELECT * FROM teachers WHERE name LIKE ? ORDER BY name ASC', [`%${query}%`]);
    }
    async getTeachersWithoutSchedule() {
        return this.dbManager.getAll(`
      SELECT t.* FROM teachers t
      LEFT JOIN schedule_items si ON t.id = si.teacher_id
      WHERE si.teacher_id IS NULL
      ORDER BY t.name ASC
    `);
    }
    // Teacher assignment methods
    async assignTeacherToLessonAndClass(teacherId, lessonId, classId) {
        return this.dbManager.assignTeacherToLessonAndClass(teacherId, lessonId, classId);
    }
    async getTeacherAssignments(teacherId) {
        return this.dbManager.getTeacherAssignments(teacherId);
    }
    async removeTeacherAssignment(teacherId, lessonId, classId) {
        return this.dbManager.removeTeacherAssignment(teacherId, lessonId, classId);
    }
    async getTotalAssignedHours(teacherId) {
        const assignments = await this.getTeacherAssignments(teacherId);
        // Calculate total hours by summing the weekly_hours for each lesson-class assignment
        let totalHours = 0;
        for (const assignment of assignments) {
            // Get the lesson to get its weekly hours for each assignment
            const lesson = await this.dbManager.getOne('SELECT weekly_hours FROM lessons WHERE id = ?', [assignment.lesson_id]);
            if (lesson) {
                // Add hours for each class assignment (same lesson taught to different classes)
                totalHours += lesson.weekly_hours || 0;
                console.log(`Assignment: Teacher ${teacherId}, Lesson ${assignment.lesson_id}, Class ${assignment.class_id}, Hours: ${lesson.weekly_hours}`);
            }
        }
        console.log(`Total calculated hours for teacher ${teacherId}: ${totalHours}`);
        return totalHours;
    }
}
exports.TeacherManager = TeacherManager;
//# sourceMappingURL=TeacherManager.js.map