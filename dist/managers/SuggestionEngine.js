"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestionEngine = void 0;
class SuggestionEngine {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }
    /**
     * Generates elective assignment suggestions for a specific class
     */
    async generateSuggestions(classId, criteria = {}) {
        const defaultCriteria = {
            classId,
            preferTeachersWithLowWorkload: true,
            preferPopularElectives: true,
            avoidScheduleConflicts: true,
            maxSuggestions: 10
        };
        const finalCriteria = { ...defaultCriteria, ...criteria };
        // Get class information
        const classInfo = await this.dbManager.getOne('SELECT id, grade, section FROM classes WHERE id = ?', [classId]);
        if (!classInfo) {
            throw new Error(`Class with id ${classId} not found`);
        }
        // Get available elective lessons for this grade
        const availableElectives = await this.getAvailableElectiveLessons(classInfo.grade);
        // Get already assigned electives for this class
        const assignedElectives = await this.dbManager.getAll(`
      SELECT lesson_id 
      FROM teacher_assignments ta
      JOIN lessons l ON ta.lesson_id = l.id
      WHERE ta.class_id = ? AND l.is_mandatory = 0
    `, [classId]);
        const assignedLessonIds = assignedElectives.map((item) => item.lesson_id);
        // Filter out already assigned electives
        const unassignedElectives = availableElectives.filter(lesson => !assignedLessonIds.includes(lesson.lessonId));
        const suggestions = [];
        for (const lesson of unassignedElectives) {
            // Get teachers who can teach this lesson
            const availableTeachers = await this.getTeachersForLesson(lesson.lessonId);
            for (const teacher of availableTeachers) {
                // Calculate suggestion score
                const score = await this.scoreSuggestion(classId, lesson.lessonId, teacher.teacherId, finalCriteria);
                if (score > 0) {
                    // Generate reasoning
                    const reasoning = await this.generateReasoning(classId, lesson.lessonId, teacher.teacherId, score);
                    suggestions.push({
                        id: undefined,
                        class_id: classId,
                        lesson_id: lesson.lessonId,
                        teacher_id: teacher.teacherId,
                        suggestion_score: score,
                        reasoning: reasoning,
                        is_applied: false,
                        created_at: new Date().toISOString(),
                        lessonName: lesson.lessonName,
                        teacherName: teacher.teacherName,
                        className: `${classInfo.grade}/${classInfo.section}`,
                        grade: classInfo.grade
                    });
                }
            }
        }
        // Sort by score and limit results
        suggestions.sort((a, b) => b.suggestion_score - a.suggestion_score);
        const topSuggestions = suggestions.slice(0, finalCriteria.maxSuggestions);
        // Cache suggestions in database
        await this.cacheSuggestions(topSuggestions);
        return topSuggestions;
    }
    /**
     * Calculates a score for a specific lesson-teacher-class combination
     */
    async scoreSuggestion(classId, lessonId, teacherId, criteria) {
        let score = 0;
        const maxScore = 100;
        try {
            // Base score for valid combination
            score += 20;
            // Teacher workload factor (30 points max)
            if (criteria.preferTeachersWithLowWorkload) {
                const workload = await this.calculateTeacherWorkload(teacherId);
                const workloadScore = Math.max(0, 30 - (workload * 30 / 100));
                score += workloadScore;
            }
            // Lesson popularity factor (25 points max)
            if (criteria.preferPopularElectives) {
                const popularity = await this.getLessonPopularity(lessonId);
                score += popularity * 25 / 100;
            }
            // Schedule conflict penalty (-50 points if conflicts exist)
            if (criteria.avoidScheduleConflicts) {
                const hasConflicts = await this.checkScheduleConflicts(classId, teacherId);
                if (hasConflicts) {
                    score -= 50;
                }
                else {
                    score += 15; // Bonus for no conflicts
                }
            }
            // Teacher subject match bonus (10 points max)
            const subjectMatch = await this.checkTeacherSubjectMatch(teacherId, lessonId);
            if (subjectMatch) {
                score += 10;
            }
            // Ensure score is within valid range
            score = Math.max(0, Math.min(maxScore, score));
            return Math.round(score * 100) / 100; // Round to 2 decimal places
        }
        catch (error) {
            console.error('Error calculating suggestion score:', error);
            return 0;
        }
    }
    /**
     * Applies a suggestion by creating the teacher assignment
     */
    async applySuggestion(suggestionId) {
        try {
            // Get suggestion details
            const suggestion = await this.dbManager.getOne('SELECT * FROM elective_suggestions WHERE id = ?', [suggestionId]);
            if (!suggestion || suggestion.is_applied) {
                return false;
            }
            // Create teacher assignment
            await this.dbManager.runSQL(`
        INSERT INTO teacher_assignments (teacher_id, lesson_id, class_id)
        VALUES (?, ?, ?)
      `, [suggestion.teacher_id, suggestion.lesson_id, suggestion.class_id]);
            // Mark suggestion as applied
            await this.dbManager.runSQL(`
        UPDATE elective_suggestions 
        SET is_applied = 1 
        WHERE id = ?
      `, [suggestionId]);
            return true;
        }
        catch (error) {
            console.error('Error applying suggestion:', error);
            return false;
        }
    }
    /**
     * Refreshes the suggestion cache for all classes
     */
    async refreshSuggestionCache() {
        // Clear old suggestions
        await this.dbManager.runSQL('DELETE FROM elective_suggestions WHERE is_applied = 0');
        // Get all classes with incomplete elective assignments
        const incompleteClasses = await this.dbManager.getAll(`
      SELECT class_id 
      FROM elective_assignment_status 
      WHERE status = 'incomplete'
    `);
        // Generate new suggestions for each incomplete class
        for (const classItem of incompleteClasses) {
            await this.generateSuggestions(classItem.class_id);
        }
    }
    /**
     * Calculates teacher workload as percentage of maximum hours
     */
    async calculateTeacherWorkload(teacherId) {
        try {
            // Get teacher's current assigned hours
            const currentHours = await this.dbManager.getOne(`
        SELECT SUM(l.weekly_hours) as total_hours
        FROM teacher_assignments ta
        JOIN lessons l ON ta.lesson_id = l.id
        WHERE ta.teacher_id = ?
      `, [teacherId]);
            const assignedHours = currentHours?.total_hours || 0;
            // Get weekly hour limit based on school type
            const weeklyLimit = this.dbManager.getWeeklyHourLimit();
            // Calculate workload percentage
            const workloadPercentage = (assignedHours / weeklyLimit) * 100;
            return Math.min(100, Math.max(0, workloadPercentage));
        }
        catch (error) {
            console.error('Error calculating teacher workload:', error);
            return 100; // Return high workload on error to avoid assignment
        }
    }
    /**
     * Checks for schedule conflicts between class and teacher
     */
    async checkScheduleConflicts(classId, teacherId) {
        try {
            // Get class schedule
            const classSchedule = await this.dbManager.getAll(`
        SELECT day_of_week, time_slot 
        FROM schedule_items 
        WHERE class_id = ?
      `, [classId]);
            // Get teacher schedule
            const teacherSchedule = await this.dbManager.getAll(`
        SELECT day_of_week, time_slot 
        FROM schedule_items 
        WHERE teacher_id = ?
      `, [teacherId]);
            // Check for overlapping time slots
            for (const classSlot of classSchedule) {
                for (const teacherSlot of teacherSchedule) {
                    if (classSlot.day_of_week === teacherSlot.day_of_week &&
                        classSlot.time_slot === teacherSlot.time_slot) {
                        return true; // Conflict found
                    }
                }
            }
            return false; // No conflicts
        }
        catch (error) {
            console.error('Error checking schedule conflicts:', error);
            return true; // Return true on error to be safe
        }
    }
    /**
     * Gets lesson popularity based on assignment frequency
     */
    async getLessonPopularity(lessonId) {
        try {
            // Count how many times this lesson has been assigned
            const assignmentCount = await this.dbManager.getOne(`
        SELECT COUNT(*) as count 
        FROM teacher_assignments 
        WHERE lesson_id = ?
      `, [lessonId]);
            // Get total number of classes for normalization
            const totalClasses = await this.dbManager.getOne('SELECT COUNT(*) as count FROM classes');
            const assignments = assignmentCount?.count || 0;
            const classes = totalClasses?.count || 1;
            // Calculate popularity as percentage
            const popularity = Math.min(100, (assignments / classes) * 100);
            return popularity;
        }
        catch (error) {
            console.error('Error calculating lesson popularity:', error);
            return 0;
        }
    }
    /**
     * Gets available elective lessons for a specific grade
     */
    async getAvailableElectiveLessons(grade) {
        const lessons = await this.dbManager.getAll(`
      SELECT id, name 
      FROM lessons 
      WHERE grade = ? AND is_mandatory = 0
      ORDER BY name
    `, [grade]);
        return lessons.map((lesson) => ({
            lessonId: lesson.id,
            lessonName: lesson.name
        }));
    }
    /**
     * Gets teachers who can teach a specific lesson
     */
    async getTeachersForLesson(lessonId) {
        // Get lesson information
        const lesson = await this.dbManager.getOne('SELECT name FROM lessons WHERE id = ?', [lessonId]);
        if (!lesson) {
            return [];
        }
        // Find teachers whose subject matches the lesson or who have taught this lesson before
        const teachers = await this.dbManager.getAll(`
      SELECT DISTINCT t.id, t.name
      FROM teachers t
      WHERE t.subject LIKE '%' || ? || '%'
         OR t.id IN (
           SELECT DISTINCT teacher_id 
           FROM teacher_assignments ta
           JOIN lessons l ON ta.lesson_id = l.id
           WHERE l.name = ?
         )
      ORDER BY t.name
    `, [lesson.name, lesson.name]);
        return teachers.map((teacher) => ({
            teacherId: teacher.id,
            teacherName: teacher.name
        }));
    }
    /**
     * Checks if teacher's subject matches the lesson
     */
    async checkTeacherSubjectMatch(teacherId, lessonId) {
        try {
            const teacher = await this.dbManager.getOne('SELECT subject FROM teachers WHERE id = ?', [teacherId]);
            const lesson = await this.dbManager.getOne('SELECT name FROM lessons WHERE id = ?', [lessonId]);
            if (!teacher || !lesson || !teacher.subject) {
                return false;
            }
            // Simple subject matching - can be made more sophisticated
            const subjectLower = teacher.subject.toLowerCase();
            const lessonLower = lesson.name.toLowerCase();
            return subjectLower.includes(lessonLower) || lessonLower.includes(subjectLower);
        }
        catch (error) {
            console.error('Error checking teacher subject match:', error);
            return false;
        }
    }
    /**
     * Generates human-readable reasoning for a suggestion
     */
    async generateReasoning(classId, lessonId, teacherId, score) {
        try {
            const teacher = await this.dbManager.getOne('SELECT name, subject FROM teachers WHERE id = ?', [teacherId]);
            const lesson = await this.dbManager.getOne('SELECT name FROM lessons WHERE id = ?', [lessonId]);
            const workload = await this.calculateTeacherWorkload(teacherId);
            const hasConflicts = await this.checkScheduleConflicts(classId, teacherId);
            let reasoning = `${teacher.name} öğretmeni ${lesson.name} dersi için önerilmektedir. `;
            if (workload < 70) {
                reasoning += `Öğretmenin ders yükü düşük (%${Math.round(workload)}). `;
            }
            else if (workload > 90) {
                reasoning += `Öğretmenin ders yükü yüksek (%${Math.round(workload)}). `;
            }
            if (!hasConflicts) {
                reasoning += `Program çakışması bulunmamaktadır. `;
            }
            else {
                reasoning += `Program çakışması riski vardır. `;
            }
            if (teacher.subject && lesson.name.toLowerCase().includes(teacher.subject.toLowerCase())) {
                reasoning += `Öğretmenin branşı dersle uyumludur. `;
            }
            reasoning += `Öneri skoru: ${score}/100`;
            return reasoning;
        }
        catch (error) {
            console.error('Error generating reasoning:', error);
            return `Öneri skoru: ${score}/100`;
        }
    }
    /**
     * Caches suggestions in the database
     */
    async cacheSuggestions(suggestions) {
        for (const suggestion of suggestions) {
            try {
                await this.dbManager.runSQL(`
          INSERT OR REPLACE INTO elective_suggestions 
          (class_id, lesson_id, teacher_id, suggestion_score, reasoning, is_applied)
          VALUES (?, ?, ?, ?, ?, 0)
        `, [
                    suggestion.class_id,
                    suggestion.lesson_id,
                    suggestion.teacher_id,
                    suggestion.suggestion_score,
                    suggestion.reasoning
                ]);
            }
            catch (error) {
                console.error('Error caching suggestion:', error);
            }
        }
    }
    /**
     * Gets cached suggestions for a class
     */
    async getCachedSuggestions(classId) {
        const results = await this.dbManager.getAll(`
      SELECT 
        es.*,
        l.name as lesson_name,
        t.name as teacher_name,
        c.grade,
        c.section
      FROM elective_suggestions es
      JOIN lessons l ON es.lesson_id = l.id
      JOIN teachers t ON es.teacher_id = t.id
      JOIN classes c ON es.class_id = c.id
      WHERE es.class_id = ? AND es.is_applied = 0
      ORDER BY es.suggestion_score DESC
    `, [classId]);
        return results.map((result) => ({
            id: result.id,
            class_id: result.class_id,
            lesson_id: result.lesson_id,
            teacher_id: result.teacher_id,
            suggestion_score: result.suggestion_score,
            reasoning: result.reasoning,
            is_applied: result.is_applied,
            created_at: result.created_at,
            lessonName: result.lesson_name,
            teacherName: result.teacher_name,
            className: `${result.grade}/${result.section}`,
            grade: result.grade
        }));
    }
}
exports.SuggestionEngine = SuggestionEngine;
//# sourceMappingURL=SuggestionEngine.js.map