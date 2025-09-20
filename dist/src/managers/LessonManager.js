"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonManager = void 0;
class LessonManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }
    async getAll() {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll('SELECT * FROM lessons WHERE school_type = ? ORDER BY grade ASC, name ASC', [currentSchoolType]);
    }
    async getById(id) {
        return this.dbManager.getOne('SELECT * FROM lessons WHERE id = ?', [id]);
    }
    async create(lessonData) {
        // Check if lesson already exists for this grade
        const existing = await this.dbManager.getOne('SELECT id FROM lessons WHERE name = ? AND grade = ?', [lessonData.name, lessonData.grade || 9] // Default to grade 9 if not provided
        );
        if (existing) {
            throw new Error(`${lessonData.name} dersi ${lessonData.grade || 9}. sınıf için zaten mevcut.`);
        }
        const result = await this.dbManager.runSQL('INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type) VALUES (?, ?, ?, ?, ?)', [lessonData.name, lessonData.grade || 9, lessonData.weekly_hours || 2, lessonData.is_mandatory, lessonData.school_type || 'İlkokul']);
        const newLesson = await this.getById(result.lastID);
        if (!newLesson) {
            throw new Error('Failed to create lesson');
        }
        return newLesson;
    }
    async update(id, lessonData) {
        // If name and grade are being updated, check for duplicates
        if (lessonData.name !== undefined && lessonData.grade !== undefined) {
            const existing = await this.dbManager.getOne('SELECT id FROM lessons WHERE name = ? AND grade = ? AND id != ?', [lessonData.name, lessonData.grade, id]);
            if (existing) {
                throw new Error(`${lessonData.name} dersi ${lessonData.grade}. sınıf için zaten mevcut.`);
            }
        }
        // Build the update query dynamically based on provided fields
        const fields = [];
        const values = [];
        if (lessonData.name !== undefined) {
            fields.push('name = ?');
            values.push(lessonData.name);
        }
        if (lessonData.grade !== undefined) {
            fields.push('grade = ?');
            values.push(lessonData.grade);
        }
        if (lessonData.weekly_hours !== undefined) {
            fields.push('weekly_hours = ?');
            values.push(lessonData.weekly_hours);
        }
        if (lessonData.is_mandatory !== undefined) {
            fields.push('is_mandatory = ?');
            values.push(lessonData.is_mandatory);
        }
        if (lessonData.school_type !== undefined) {
            fields.push('school_type = ?');
            values.push(lessonData.school_type);
        }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        if (fields.length > 1) {
            const query = `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`;
            await this.dbManager.runSQL(query, values);
        }
        const updatedLesson = await this.getById(id);
        if (!updatedLesson) {
            throw new Error('Lesson not found after update');
        }
        return updatedLesson;
    }
    async delete(id) {
        // Check if lesson has any schedule assignments
        const scheduleCount = await this.dbManager.getOne('SELECT COUNT(*) as count FROM schedule_items WHERE lesson_id = ?', [id]);
        if (scheduleCount && scheduleCount.count > 0) {
            throw new Error('Bu dersin aktif ders programı bulunmaktadır. Önce ders programından kaldırın.');
        }
        const result = await this.dbManager.runSQL('DELETE FROM lessons WHERE id = ?', [id]);
        return result.changes > 0;
    }
    async getByGrade(grade) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll('SELECT * FROM lessons WHERE grade = ? AND school_type = ? ORDER BY name ASC', [grade, currentSchoolType]);
    }
    async getBySchoolType(schoolType) {
        return this.dbManager.getAll('SELECT * FROM lessons WHERE school_type = ? ORDER BY grade ASC, name ASC', [schoolType]);
    }
    async getMandatoryLessons(grade) {
        return this.dbManager.getAll('SELECT * FROM lessons WHERE grade = ? AND is_mandatory = 1 ORDER BY name ASC', [grade]);
    }
    async getElectiveLessons(grade) {
        return this.dbManager.getAll('SELECT * FROM lessons WHERE grade = ? AND is_mandatory = 0 ORDER BY name ASC', [grade]);
    }
    async getTotalWeeklyHours(grade) {
        const result = await this.dbManager.getOne('SELECT SUM(weekly_hours) as total FROM lessons WHERE grade = ?', [grade]);
        return result?.total || 0;
    }
    async getLessonStatistics() {
        const totalLessons = await this.dbManager.getOne('SELECT COUNT(*) as count FROM lessons');
        const mandatoryLessons = await this.dbManager.getOne('SELECT COUNT(*) as count FROM lessons WHERE is_mandatory = 1');
        const electiveLessons = await this.dbManager.getOne('SELECT COUNT(*) as count FROM lessons WHERE is_mandatory = 0');
        const gradeDistribution = await this.dbManager.getAll(`
      SELECT grade, COUNT(*) as lesson_count, SUM(weekly_hours) as total_hours
      FROM lessons 
      GROUP BY grade 
      ORDER BY grade
    `);
        const schoolTypeDistribution = await this.dbManager.getAll(`
      SELECT school_type, COUNT(*) as lesson_count
      FROM lessons 
      GROUP BY school_type
    `);
        return {
            total: totalLessons?.count || 0,
            mandatory: mandatoryLessons?.count || 0,
            elective: electiveLessons?.count || 0,
            by_grade: gradeDistribution,
            by_school_type: schoolTypeDistribution
        };
    }
    async searchLessons(query) {
        return this.dbManager.getAll('SELECT * FROM lessons WHERE name LIKE ? ORDER BY grade ASC, name ASC', [`%${query}%`]);
    }
    async getLessonsWithoutTeachers() {
        return this.dbManager.getAll(`
      SELECT l.* FROM lessons l
      LEFT JOIN schedule_items si ON l.id = si.lesson_id
      WHERE si.lesson_id IS NULL
      ORDER BY l.grade ASC, l.name ASC
    `);
    }
    async validateMEBCompliance(grade, schoolType = 'İlkokul') {
        const issues = [];
        const lessons = await this.getByGrade(grade);
        const totalHours = await this.getTotalWeeklyHours(grade);
        // MEB minimum hour requirements by grade and school type
        const requiredHours = {
            'İlkokul': { 1: 25, 2: 25, 3: 25, 4: 25 },
            'Ortaokul': { 5: 30, 6: 30, 7: 30, 8: 30 },
            'Genel Lise': { 9: 40, 10: 40, 11: 40, 12: 40 },
            'Anadolu Lisesi': { 9: 40, 10: 40, 11: 40, 12: 40 },
            'Fen Lisesi': { 9: 40, 10: 40, 11: 40, 12: 40 },
            'Sosyal Bilimler Lisesi': { 9: 40, 10: 40, 11: 40, 12: 40 }
        };
        // Check total hours
        const minHours = requiredHours[schoolType]?.[grade];
        if (minHours && totalHours < minHours) {
            issues.push(`${grade}. sınıf için minimum ${minHours} saat gerekli, mevcut: ${totalHours} saat`);
        }
        // Check mandatory subjects based on school type
        let mandatorySubjects = [];
        if (schoolType === 'İlkokul' && grade >= 1 && grade <= 4) {
            mandatorySubjects = [
                'Türkçe',
                'Matematik',
                'Hayat Bilgisi',
                'Din Kültürü ve Ahlak Bilgisi'
            ];
        }
        else if (schoolType === 'Ortaokul' && grade >= 5 && grade <= 8) {
            mandatorySubjects = [
                'Türkçe',
                'Matematik',
                'Fen Bilimleri',
                'Sosyal Bilgiler',
                'Yabancı Dil',
                'Din Kültürü ve Ahlak Bilgisi',
                'Beden Eğitimi ve Spor',
                'Görsel Sanatlar',
                'Müzik'
            ];
        }
        else if (grade >= 9 && grade <= 12) {
            // High school mandatory subjects
            mandatorySubjects = [
                'Türk Dili ve Edebiyatı',
                'Matematik',
                'Yabancı Dil',
                'Beden Eğitimi ve Spor',
                'Din Kültürü ve Ahlak Bilgisi'
            ];
        }
        const currentSubjects = lessons.filter(l => l.is_mandatory).map(l => l.name);
        for (const subject of mandatorySubjects) {
            if (!currentSubjects.some(s => s.includes(subject))) {
                issues.push(`Zorunlu ders eksik: ${subject}`);
            }
        }
        return {
            isCompliant: issues.length === 0,
            issues
        };
    }
    async createMEBCurriculum(grade, schoolType = 'İlkokul') {
        // Clear existing lessons for this grade and school type
        await this.dbManager.runSQL('DELETE FROM lessons WHERE grade = ? AND school_type = ?', [grade, schoolType]);
        // MEB curriculum data for different school types and grades
        const mebCurriculum = {
            'İlkokul': {
                1: [
                    { name: 'Türkçe', weekly_hours: 8, is_mandatory: 1 },
                    { name: 'Matematik', weekly_hours: 6, is_mandatory: 1 },
                    { name: 'Hayat Bilgisi', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Din Kültürü ve Ahlak Bilgisi', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Beden Eğitimi ve Spor', weekly_hours: 3, is_mandatory: 1 },
                    { name: 'Görsel Sanatlar', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Müzik', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Yabancı Dil', weekly_hours: 2, is_mandatory: 1 }
                ],
                2: [
                    { name: 'Türkçe', weekly_hours: 8, is_mandatory: 1 },
                    { name: 'Matematik', weekly_hours: 6, is_mandatory: 1 },
                    { name: 'Hayat Bilgisi', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Din Kültürü ve Ahlak Bilgisi', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Beden Eğitimi ve Spor', weekly_hours: 3, is_mandatory: 1 },
                    { name: 'Görsel Sanatlar', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Müzik', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Yabancı Dil', weekly_hours: 2, is_mandatory: 1 }
                ],
                3: [
                    { name: 'Türkçe', weekly_hours: 8, is_mandatory: 1 },
                    { name: 'Matematik', weekly_hours: 6, is_mandatory: 1 },
                    { name: 'Hayat Bilgisi', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Din Kültürü ve Ahlak Bilgisi', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Beden Eğitimi ve Spor', weekly_hours: 3, is_mandatory: 1 },
                    { name: 'Görsel Sanatlar', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Müzik', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Yabancı Dil', weekly_hours: 2, is_mandatory: 1 }
                ],
                4: [
                    { name: 'Türkçe', weekly_hours: 8, is_mandatory: 1 },
                    { name: 'Matematik', weekly_hours: 6, is_mandatory: 1 },
                    { name: 'Fen Bilimleri', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Sosyal Bilgiler', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Din Kültürü ve Ahlak Bilgisi', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Beden Eğitimi ve Spor', weekly_hours: 3, is_mandatory: 1 },
                    { name: 'Görsel Sanatlar', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Müzik', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Yabancı Dil', weekly_hours: 2, is_mandatory: 1 }
                ]
            },
            'Ortaokul': {
                5: [
                    { name: 'Türkçe', weekly_hours: 6, is_mandatory: 1 },
                    { name: 'Matematik', weekly_hours: 5, is_mandatory: 1 },
                    { name: 'Fen Bilimleri', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Sosyal Bilgiler', weekly_hours: 3, is_mandatory: 1 },
                    { name: 'Yabancı Dil', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Din Kültürü ve Ahlak Bilgisi', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Beden Eğitimi ve Spor', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Görsel Sanatlar', weekly_hours: 1, is_mandatory: 1 },
                    { name: 'Müzik', weekly_hours: 1, is_mandatory: 1 },
                    { name: 'Teknoloji ve Tasarım', weekly_hours: 2, is_mandatory: 1 }
                ],
                6: [
                    { name: 'Türkçe', weekly_hours: 6, is_mandatory: 1 },
                    { name: 'Matematik', weekly_hours: 5, is_mandatory: 1 },
                    { name: 'Fen Bilimleri', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Sosyal Bilgiler', weekly_hours: 3, is_mandatory: 1 },
                    { name: 'Yabancı Dil', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Din Kültürü ve Ahlak Bilgisi', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Beden Eğitimi ve Spor', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Görsel Sanatlar', weekly_hours: 1, is_mandatory: 1 },
                    { name: 'Müzik', weekly_hours: 1, is_mandatory: 1 },
                    { name: 'Teknoloji ve Tasarım', weekly_hours: 2, is_mandatory: 1 }
                ],
                7: [
                    { name: 'Türkçe', weekly_hours: 5, is_mandatory: 1 },
                    { name: 'Matematik', weekly_hours: 5, is_mandatory: 1 },
                    { name: 'Fen Bilimleri', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Sosyal Bilgiler', weekly_hours: 3, is_mandatory: 1 },
                    { name: 'Yabancı Dil', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Din Kültürü ve Ahlak Bilgisi', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Beden Eğitimi ve Spor', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Görsel Sanatlar', weekly_hours: 1, is_mandatory: 1 },
                    { name: 'Müzik', weekly_hours: 1, is_mandatory: 1 },
                    { name: 'Teknoloji ve Tasarım', weekly_hours: 2, is_mandatory: 1 }
                ],
                8: [
                    { name: 'Türkçe', weekly_hours: 5, is_mandatory: 1 },
                    { name: 'Matematik', weekly_hours: 5, is_mandatory: 1 },
                    { name: 'Fen Bilimleri', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Sosyal Bilgiler', weekly_hours: 3, is_mandatory: 1 },
                    { name: 'Yabancı Dil', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Din Kültürü ve Ahlak Bilgisi', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Beden Eğitimi ve Spor', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Görsel Sanatlar', weekly_hours: 1, is_mandatory: 1 },
                    { name: 'Müzik', weekly_hours: 1, is_mandatory: 1 },
                    { name: 'Teknoloji ve Tasarım', weekly_hours: 2, is_mandatory: 1 }
                ]
            },
            'Genel Lise': {
                9: [
                    { name: 'Türk Dili ve Edebiyatı', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Matematik', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Fizik', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Kimya', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Biyoloji', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Tarih', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Coğrafya', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Felsefe', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Din Kültürü ve Ahlak Bilgisi', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Yabancı Dil (İngilizce)', weekly_hours: 4, is_mandatory: 1 },
                    { name: 'Beden Eğitimi ve Spor', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Görsel Sanatlar', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Müzik', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Sağlık Bilgisi ve Trafik Kültürü', weekly_hours: 1, is_mandatory: 1 },
                    { name: 'Bilgisayar Bilimleri', weekly_hours: 2, is_mandatory: 1 },
                    { name: 'Seçmeli Ders', weekly_hours: 5, is_mandatory: 0 }
                ]
            }
        };
        // For other high school types, use the same curriculum as Genel Lise
        if (schoolType !== 'İlkokul' && schoolType !== 'Ortaokul' && schoolType !== 'Genel Lise') {
            mebCurriculum[schoolType] = mebCurriculum['Genel Lise'];
        }
        const curriculum = mebCurriculum[schoolType]?.[grade];
        if (!curriculum) {
            throw new Error(`${grade}. sınıf için ${schoolType} müfredatı bulunamadı.`);
        }
        // Insert lessons
        for (const lesson of curriculum) {
            await this.dbManager.runSQL('INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type) VALUES (?, ?, ?, ?, ?)', [lesson.name, grade, lesson.weekly_hours, lesson.is_mandatory, schoolType]);
        }
    }
    async getGrades() {
        const results = await this.dbManager.getAll('SELECT DISTINCT grade FROM lessons ORDER BY grade ASC');
        return results.map(r => r.grade);
    }
    async getSchoolTypes() {
        const results = await this.dbManager.getAll('SELECT DISTINCT school_type FROM lessons ORDER BY school_type ASC');
        return results.map(r => r.school_type);
    }
    async duplicateGradeCurriculum(fromGrade, toGrade, schoolType) {
        const lessons = await this.getByGrade(fromGrade);
        for (const lesson of lessons) {
            if (lesson.school_type === schoolType) {
                try {
                    await this.create({
                        name: lesson.name,
                        grade: toGrade,
                        weekly_hours: lesson.weekly_hours,
                        is_mandatory: lesson.is_mandatory,
                        school_type: lesson.school_type
                    });
                }
                catch (error) {
                    // Ignore duplicate errors
                    console.warn(`Could not duplicate lesson ${lesson.name} for grade ${toGrade}:`, error);
                }
            }
        }
    }
    /**
     * Get available elective lessons for a specific grade that are NOT already assigned to any class
     * @param grade The grade level
     * @returns Available elective lessons
     */
    async getAvailableElectiveLessons(grade) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll(`
      SELECT DISTINCT l.* 
      FROM lessons l
      WHERE l.grade = ? 
        AND l.school_type = ?
        AND l.is_mandatory = 0
        AND l.id NOT IN (
          SELECT DISTINCT lesson_id 
          FROM teacher_assignments ta
          JOIN classes c ON ta.class_id = c.id
          WHERE c.grade = ?
        )
      ORDER BY l.name ASC
    `, [grade, currentSchoolType, grade]);
    }
    /**
     * Get assigned elective lessons for a specific grade
     * @param grade The grade level
     * @returns Assigned elective lessons with assignment details
     */
    async getAssignedElectiveLessons(grade) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll(`
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
        AND l.school_type = ?
        AND l.is_mandatory = 0
      ORDER BY l.name ASC, c.section ASC
    `, [grade, currentSchoolType]);
    }
    /**
     * Check if an elective lesson is available for assignment
     * @param lessonId The lesson ID
     * @param grade The grade level
     * @returns True if available, false if already assigned
     */
    async isElectiveLessonAvailable(lessonId, grade) {
        const assignment = await this.dbManager.getOne(`
      SELECT ta.id 
      FROM teacher_assignments ta
      JOIN classes c ON ta.class_id = c.id
      WHERE ta.lesson_id = ? AND c.grade = ?
      LIMIT 1
    `, [lessonId, grade]);
        return !assignment;
    }
    /**
     * Get elective lessons that can be assigned to a specific class
     * (excludes lessons already assigned to other classes of the same grade)
     * @param classId The class ID
     * @returns Available elective lessons for the class
     */
    async getAvailableElectiveLessonsForClass(classId) {
        return this.dbManager.getAll(`
      SELECT DISTINCT l.* 
      FROM lessons l
      JOIN classes c ON l.grade = c.grade
      WHERE c.id = ? 
        AND l.is_mandatory = 0
        AND l.school_type = c.school_type
        AND l.id NOT IN (
          SELECT DISTINCT ta.lesson_id 
          FROM teacher_assignments ta
          JOIN classes c2 ON ta.class_id = c2.id
          WHERE c2.grade = c.grade
            AND ta.class_id != ?
        )
      ORDER BY l.name ASC
    `, [classId, classId]);
    }
    /**
     * Get all elective lessons with their assignment status for a specific grade
     * @param grade The grade level
     * @returns Elective lessons with assignment status
     */
    async getElectiveLessonsWithStatus(grade) {
        const currentSchoolType = this.dbManager.getCurrentSchoolType();
        return this.dbManager.getAll(`
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
      WHERE l.grade = ? AND l.is_mandatory = 0 AND l.school_type = ?
      ORDER BY l.name ASC
    `, [grade, grade, currentSchoolType]);
    }
}
exports.LessonManager = LessonManager;
//# sourceMappingURL=LessonManager.js.map