"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleManager = void 0;
const TeacherManager_1 = require("./TeacherManager");
const ClassManager_1 = require("./ClassManager");
const LessonManager_1 = require("./LessonManager");
class ScheduleManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.teacherManager = new TeacherManager_1.TeacherManager(dbManager);
        this.classManager = new ClassManager_1.ClassManager(dbManager);
        this.lessonManager = new LessonManager_1.LessonManager(dbManager);
    }
    async getClassSchedule(classId) {
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
      WHERE si.class_id = ?
      ORDER BY si.day_of_week, si.time_slot
    `, [classId]);
    }
    async getTeacherSchedule(teacherId) {
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
      WHERE si.teacher_id = ?
      ORDER BY si.day_of_week, si.time_slot
    `, [teacherId]);
    }
    async createScheduleItem(scheduleItem) {
        // Check for conflicts before creating
        const conflicts = await this.detectScheduleItemConflicts(scheduleItem);
        if (conflicts.length > 0) {
            throw new Error(`Çakışma tespit edildi: ${conflicts.map(c => c.message).join(', ')}`);
        }
        const result = await this.dbManager.runSQL('INSERT INTO schedule_items (class_id, teacher_id, lesson_id, day_of_week, time_slot) VALUES (?, ?, ?, ?, ?)', [scheduleItem.class_id, scheduleItem.teacher_id, scheduleItem.lesson_id, scheduleItem.day_of_week, scheduleItem.time_slot]);
        const newItem = await this.dbManager.getOne('SELECT * FROM schedule_items WHERE id = ?', [result.lastID]);
        if (!newItem) {
            throw new Error('Failed to create schedule item');
        }
        return newItem;
    }
    async updateScheduleItem(id, scheduleItem) {
        // Get current item
        const currentItem = await this.dbManager.getOne('SELECT * FROM schedule_items WHERE id = ?', [id]);
        if (!currentItem) {
            throw new Error('Schedule item not found');
        }
        // Create updated item for conflict checking
        const updatedItem = { ...currentItem, ...scheduleItem };
        delete updatedItem.id;
        delete updatedItem.created_at;
        delete updatedItem.updated_at;
        // Check for conflicts (excluding current item)
        const conflicts = await this.detectScheduleItemConflicts(updatedItem, id);
        if (conflicts.length > 0) {
            throw new Error(`Çakışma tespit edildi: ${conflicts.map(c => c.message).join(', ')}`);
        }
        await this.dbManager.runSQL('UPDATE schedule_items SET class_id = ?, teacher_id = ?, lesson_id = ?, day_of_week = ?, time_slot = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [updatedItem.class_id, updatedItem.teacher_id, updatedItem.lesson_id, updatedItem.day_of_week, updatedItem.time_slot, id]);
        const updated = await this.dbManager.getOne('SELECT * FROM schedule_items WHERE id = ?', [id]);
        return updated;
    }
    async deleteScheduleItem(id) {
        const result = await this.dbManager.runSQL('DELETE FROM schedule_items WHERE id = ?', [id]);
        return result.changes > 0;
    }
    async detectConflicts() {
        const conflicts = [];
        // 1. Teacher double booking conflicts
        const teacherConflicts = await this.dbManager.getAll(`
      SELECT 
        si1.teacher_id,
        si1.day_of_week,
        si1.time_slot,
        GROUP_CONCAT(si1.id) as schedule_ids,
        t.name as teacher_name,
        COUNT(*) as conflict_count
      FROM schedule_items si1
      JOIN teachers t ON si1.teacher_id = t.id
      WHERE (si1.teacher_id, si1.day_of_week, si1.time_slot) IN (
        SELECT teacher_id, day_of_week, time_slot
        FROM schedule_items
        GROUP BY teacher_id, day_of_week, time_slot
        HAVING COUNT(*) > 1
      )
      GROUP BY si1.teacher_id, si1.day_of_week, si1.time_slot
    `);
        teacherConflicts.forEach(conflict => {
            conflicts.push({
                type: 'teacher_double_booking',
                message: `${conflict.teacher_name} öğretmeni ${this.getDayName(conflict.day_of_week)} günü ${conflict.time_slot}. saatte ${conflict.conflict_count} farklı derse atanmış`,
                schedule_items: conflict.schedule_ids.split(',').map((id) => parseInt(id)),
                severity: 'high'
            });
        });
        // 2. Class schedule conflicts (same class, same time)
        const classConflicts = await this.dbManager.getAll(`
      SELECT 
        si1.class_id,
        si1.day_of_week,
        si1.time_slot,
        GROUP_CONCAT(si1.id) as schedule_ids,
        c.grade,
        c.section,
        COUNT(*) as conflict_count
      FROM schedule_items si1
      JOIN classes c ON si1.class_id = c.id
      WHERE (si1.class_id, si1.day_of_week, si1.time_slot) IN (
        SELECT class_id, day_of_week, time_slot
        FROM schedule_items
        GROUP BY class_id, day_of_week, time_slot
        HAVING COUNT(*) > 1
      )
      GROUP BY si1.class_id, si1.day_of_week, si1.time_slot
    `);
        classConflicts.forEach(conflict => {
            conflicts.push({
                type: 'classroom_conflict',
                message: `${conflict.grade}/${conflict.section} sınıfı ${this.getDayName(conflict.day_of_week)} günü ${conflict.time_slot}. saatte ${conflict.conflict_count} farklı derse atanmış`,
                schedule_items: conflict.schedule_ids.split(',').map((id) => parseInt(id)),
                severity: 'high'
            });
        });
        // 3. Teacher availability conflicts
        const availabilityConflicts = await this.dbManager.getAll(`
      SELECT 
        si.id,
        si.teacher_id,
        si.day_of_week,
        si.time_slot,
        t.name as teacher_name
      FROM schedule_items si
      JOIN teachers t ON si.teacher_id = t.id
      LEFT JOIN teacher_availability ta ON (
        ta.teacher_id = si.teacher_id AND 
        ta.day_of_week = si.day_of_week AND 
        ta.time_slot = si.time_slot AND 
        ta.is_available = 0
      )
      WHERE ta.id IS NOT NULL
    `);
        availabilityConflicts.forEach(conflict => {
            conflicts.push({
                type: 'teacher_unavailable',
                message: `${conflict.teacher_name} öğretmeni ${this.getDayName(conflict.day_of_week)} günü ${conflict.time_slot}. saatte müsait değil`,
                schedule_items: [conflict.id],
                severity: 'medium'
            });
        });
        return conflicts;
    }
    async detectScheduleItemConflicts(scheduleItem, excludeId) {
        const conflicts = [];
        const { class_id, teacher_id, lesson_id, day_of_week, time_slot } = scheduleItem;
        // Check teacher double booking
        const teacherConflict = await this.dbManager.getOne(`
      SELECT si.*, t.name as teacher_name
      FROM schedule_items si
      JOIN teachers t ON si.teacher_id = t.id
      WHERE si.teacher_id = ? AND si.day_of_week = ? AND si.time_slot = ?
      ${excludeId ? 'AND si.id != ?' : ''}
    `, excludeId ? [teacher_id, day_of_week, time_slot, excludeId] : [teacher_id, day_of_week, time_slot]);
        if (teacherConflict) {
            conflicts.push({
                type: 'teacher_double_booking',
                message: `${teacherConflict.teacher_name} öğretmeni bu saatte başka bir derse atanmış`,
                schedule_items: [teacherConflict.id],
                severity: 'high'
            });
        }
        // Check class double booking
        const classConflict = await this.dbManager.getOne(`
      SELECT si.*, c.grade, c.section
      FROM schedule_items si
      JOIN classes c ON si.class_id = c.id
      WHERE si.class_id = ? AND si.day_of_week = ? AND si.time_slot = ?
      ${excludeId ? 'AND si.id != ?' : ''}
    `, excludeId ? [class_id, day_of_week, time_slot, excludeId] : [class_id, day_of_week, time_slot]);
        if (classConflict) {
            conflicts.push({
                type: 'classroom_conflict',
                message: `${classConflict.grade}/${classConflict.section} sınıfının bu saatte başka dersi var`,
                schedule_items: [classConflict.id],
                severity: 'high'
            });
        }
        // Check teacher availability
        const isAvailable = await this.teacherManager.isAvailable(teacher_id, day_of_week, time_slot);
        if (!isAvailable) {
            conflicts.push({
                type: 'teacher_unavailable',
                message: 'Öğretmen bu saatte müsait değil',
                schedule_items: [],
                severity: 'medium'
            });
        }
        return conflicts;
    }
    async generateSchedule(config) {
        const defaultConfig = {
            start_time: '08:00',
            end_time: '16:00',
            break_duration: 10,
            lunch_break_start: '12:00',
            lunch_break_duration: 60,
            avoid_first_last_period: ['Beden Eğitimi ve Spor'],
            max_consecutive_lessons: 2,
            preferred_days: [1, 2, 3, 4, 5] // Monday to Friday
        };
        const scheduleConfig = { ...defaultConfig, ...config };
        try {
            // Clear existing schedule
            await this.dbManager.runSQL('DELETE FROM schedule_items');
            // Get all classes, teachers, and lessons
            const classes = await this.classManager.getAll();
            const teachers = await this.dbManager.getAll('SELECT * FROM teachers');
            const lessons = await this.dbManager.getAll('SELECT * FROM lessons');
            // Get current school type to determine daily periods
            const schoolType = this.dbManager.getCurrentSchoolType();
            const dailyPeriods = schoolType === 'Ortaokul' ? 7 : 8;
            let scheduledItems = 0;
            let failedItems = 0;
            // For each class, schedule their lessons
            for (const classItem of classes) {
                const classLessons = lessons.filter(l => l.grade === classItem.grade);
                // Determine daily periods based on grade level
                // For Ortaokul (grades 5-8), use 7 periods
                // For high schools (grades 9-12), use 8 periods
                const classDailyPeriods = (classItem.grade >= 5 && classItem.grade <= 8) ? 7 : 8;
                // Get the guidance counselor for this class if exists
                const guidanceCounselor = await this.dbManager.getGuidanceCounselorByClass(classItem.id);
                for (const lesson of classLessons) {
                    // Special handling for "Rehberlik ve Yönlendirme" lesson
                    if (lesson.name === 'Rehberlik ve Yönlendirme') {
                        // If this class has a guidance counselor, assign them to teach this lesson
                        if (guidanceCounselor) {
                            try {
                                const scheduleItem = {
                                    class_id: classItem.id,
                                    teacher_id: guidanceCounselor.teacher_id,
                                    lesson_id: lesson.id,
                                    day_of_week: 1, // Default to Monday
                                    time_slot: classDailyPeriods // Default to last period
                                };
                                // Try to find a suitable time slot
                                let scheduled = false;
                                for (const day of scheduleConfig.preferred_days) {
                                    for (let timeSlot = 1; timeSlot <= classDailyPeriods - 1; timeSlot++) { // -1 to allow for consecutive periods
                                        // Skip lunch break period
                                        if (timeSlot === 5 || timeSlot + 1 === 5)
                                            continue;
                                        const testScheduleItem1 = {
                                            ...scheduleItem,
                                            day_of_week: day,
                                            time_slot: timeSlot
                                        };
                                        const testScheduleItem2 = {
                                            ...scheduleItem,
                                            day_of_week: day,
                                            time_slot: timeSlot + 1
                                        };
                                        // Check if both slots are available
                                        const conflicts1 = await this.detectScheduleItemConflicts(testScheduleItem1);
                                        const conflicts2 = await this.detectScheduleItemConflicts(testScheduleItem2);
                                        if (conflicts1.length === 0 && conflicts2.length === 0) {
                                            await this.createScheduleItem(testScheduleItem1);
                                            await this.createScheduleItem(testScheduleItem2);
                                            scheduledItems += 2;
                                            scheduled = true;
                                            break;
                                        }
                                    }
                                    if (scheduled)
                                        break;
                                }
                                if (!scheduled) {
                                    failedItems += 2;
                                }
                            }
                            catch (error) {
                                failedItems += 2;
                            }
                            // Continue to next lesson since we've handled this one
                            continue;
                        }
                    }
                    // Find suitable teachers for this lesson (excluding guidance counseling lesson if no counselor)
                    const suitableTeachers = teachers.filter(t => t.subject?.toLowerCase().includes(lesson.name.toLowerCase()) ||
                        lesson.name.toLowerCase().includes(t.subject?.toLowerCase() || ''));
                    if (suitableTeachers.length === 0) {
                        failedItems += lesson.weekly_hours;
                        continue;
                    }
                    // Schedule lessons using 2+2+1 distribution for better spacing
                    let hoursScheduled = 0;
                    const daysUsed = new Set();
                    // For 5-hour lessons, use 2+2+1 distribution on 3 different days
                    if (lesson.weekly_hours === 5) {
                        let scheduled221 = false;
                        // Try to find 3 different days for 2+2+1 distribution
                        const availableDays = [...scheduleConfig.preferred_days];
                        for (let i = 0; i < availableDays.length && !scheduled221; i++) {
                            for (let j = i + 1; j < availableDays.length && !scheduled221; j++) {
                                for (let k = j + 1; k < availableDays.length && !scheduled221; k++) {
                                    const day1 = availableDays[i]; // 2 hours
                                    const day2 = availableDays[j]; // 2 hours  
                                    const day3 = availableDays[k]; // 1 hour
                                    // Try to find time slots for all three days
                                    for (let timeSlot1 = 1; timeSlot1 <= classDailyPeriods - 1 && !scheduled221; timeSlot1++) {
                                        if (timeSlot1 === 5 || timeSlot1 + 1 === 5)
                                            continue; // Skip lunch break
                                        for (let timeSlot2 = 1; timeSlot2 <= classDailyPeriods - 1 && !scheduled221; timeSlot2++) {
                                            if (timeSlot2 === 5 || timeSlot2 + 1 === 5)
                                                continue; // Skip lunch break
                                            for (let timeSlot3 = 1; timeSlot3 <= classDailyPeriods && !scheduled221; timeSlot3++) {
                                                if (timeSlot3 === 5)
                                                    continue; // Skip lunch break
                                                // Try each suitable teacher
                                                for (const teacher of suitableTeachers) {
                                                    try {
                                                        // Day 1: 2 consecutive hours
                                                        const scheduleItem1 = {
                                                            class_id: classItem.id,
                                                            teacher_id: teacher.id,
                                                            lesson_id: lesson.id,
                                                            day_of_week: day1,
                                                            time_slot: timeSlot1
                                                        };
                                                        const scheduleItem2 = {
                                                            class_id: classItem.id,
                                                            teacher_id: teacher.id,
                                                            lesson_id: lesson.id,
                                                            day_of_week: day1,
                                                            time_slot: timeSlot1 + 1
                                                        };
                                                        // Day 2: 2 consecutive hours
                                                        const scheduleItem3 = {
                                                            class_id: classItem.id,
                                                            teacher_id: teacher.id,
                                                            lesson_id: lesson.id,
                                                            day_of_week: day2,
                                                            time_slot: timeSlot2
                                                        };
                                                        const scheduleItem4 = {
                                                            class_id: classItem.id,
                                                            teacher_id: teacher.id,
                                                            lesson_id: lesson.id,
                                                            day_of_week: day2,
                                                            time_slot: timeSlot2 + 1
                                                        };
                                                        // Day 3: 1 hour
                                                        const scheduleItem5 = {
                                                            class_id: classItem.id,
                                                            teacher_id: teacher.id,
                                                            lesson_id: lesson.id,
                                                            day_of_week: day3,
                                                            time_slot: timeSlot3
                                                        };
                                                        // Check if all slots are available
                                                        const conflicts1 = await this.detectScheduleItemConflicts(scheduleItem1);
                                                        const conflicts2 = await this.detectScheduleItemConflicts(scheduleItem2);
                                                        const conflicts3 = await this.detectScheduleItemConflicts(scheduleItem3);
                                                        const conflicts4 = await this.detectScheduleItemConflicts(scheduleItem4);
                                                        const conflicts5 = await this.detectScheduleItemConflicts(scheduleItem5);
                                                        if (conflicts1.length === 0 && conflicts2.length === 0 &&
                                                            conflicts3.length === 0 && conflicts4.length === 0 &&
                                                            conflicts5.length === 0) {
                                                            await this.createScheduleItem(scheduleItem1);
                                                            await this.createScheduleItem(scheduleItem2);
                                                            await this.createScheduleItem(scheduleItem3);
                                                            await this.createScheduleItem(scheduleItem4);
                                                            await this.createScheduleItem(scheduleItem5);
                                                            scheduledItems += 5;
                                                            hoursScheduled = 5;
                                                            daysUsed.add(day1);
                                                            daysUsed.add(day2);
                                                            daysUsed.add(day3);
                                                            scheduled221 = true;
                                                            break;
                                                        }
                                                    }
                                                    catch (error) {
                                                        // Continue trying other options
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (!scheduled221) {
                            failedItems += lesson.weekly_hours;
                        }
                    }
                    else {
                        // For other lessons, use the existing logic with 2-hour blocks
                        while (hoursScheduled + 2 <= lesson.weekly_hours) {
                            let pairScheduled = false;
                            // Try to find two different days for the pair
                            const availableDays = scheduleConfig.preferred_days.filter(day => !daysUsed.has(day));
                            // If we don't have enough unused days, we can reuse days
                            const daysToTry = availableDays.length >= 2 ? availableDays : scheduleConfig.preferred_days;
                            // Try each combination of two different days
                            for (let i = 0; i < daysToTry.length && !pairScheduled; i++) {
                                for (let j = i + 1; j < daysToTry.length && !pairScheduled; j++) {
                                    const day1 = daysToTry[i];
                                    const day2 = daysToTry[j];
                                    // Try to find time slots for both days
                                    for (let timeSlot1 = 1; timeSlot1 <= classDailyPeriods - 1 && !pairScheduled; timeSlot1++) {
                                        if (timeSlot1 === 5 || timeSlot1 + 1 === 5)
                                            continue; // Skip lunch break
                                        for (let timeSlot2 = 1; timeSlot2 <= classDailyPeriods - 1 && !pairScheduled; timeSlot2++) {
                                            if (timeSlot2 === 5 || timeSlot2 + 1 === 5)
                                                continue; // Skip lunch break
                                            // Try each suitable teacher
                                            for (const teacher of suitableTeachers) {
                                                try {
                                                    const scheduleItem1 = {
                                                        class_id: classItem.id,
                                                        teacher_id: teacher.id,
                                                        lesson_id: lesson.id,
                                                        day_of_week: day1,
                                                        time_slot: timeSlot1
                                                    };
                                                    const scheduleItem2 = {
                                                        class_id: classItem.id,
                                                        teacher_id: teacher.id,
                                                        lesson_id: lesson.id,
                                                        day_of_week: day1,
                                                        time_slot: timeSlot1 + 1
                                                    };
                                                    const scheduleItem3 = {
                                                        class_id: classItem.id,
                                                        teacher_id: teacher.id,
                                                        lesson_id: lesson.id,
                                                        day_of_week: day2,
                                                        time_slot: timeSlot2
                                                    };
                                                    const scheduleItem4 = {
                                                        class_id: classItem.id,
                                                        teacher_id: teacher.id,
                                                        lesson_id: lesson.id,
                                                        day_of_week: day2,
                                                        time_slot: timeSlot2 + 1
                                                    };
                                                    // Check if all slots are available
                                                    const conflicts1 = await this.detectScheduleItemConflicts(scheduleItem1);
                                                    const conflicts2 = await this.detectScheduleItemConflicts(scheduleItem2);
                                                    const conflicts3 = await this.detectScheduleItemConflicts(scheduleItem3);
                                                    const conflicts4 = await this.detectScheduleItemConflicts(scheduleItem4);
                                                    if (conflicts1.length === 0 && conflicts2.length === 0 &&
                                                        conflicts3.length === 0 && conflicts4.length === 0) {
                                                        await this.createScheduleItem(scheduleItem1);
                                                        await this.createScheduleItem(scheduleItem2);
                                                        await this.createScheduleItem(scheduleItem3);
                                                        await this.createScheduleItem(scheduleItem4);
                                                        scheduledItems += 4;
                                                        hoursScheduled += 4;
                                                        daysUsed.add(day1);
                                                        daysUsed.add(day2);
                                                        pairScheduled = true;
                                                        break;
                                                    }
                                                }
                                                catch (error) {
                                                    // Continue trying other options
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // If we couldn't schedule a pair, break to avoid infinite loop
                            if (!pairScheduled) {
                                failedItems += (lesson.weekly_hours - hoursScheduled);
                                break;
                            }
                        }
                    }
                    // Handle any remaining hours if weekly_hours is odd
                    const remainingHours = lesson.weekly_hours - hoursScheduled;
                    if (remainingHours > 0) {
                        // Try to schedule the remaining hours (1 or 2)
                        let remainingScheduled = 0;
                        for (const day of scheduleConfig.preferred_days) {
                            if (remainingScheduled >= remainingHours)
                                break;
                            for (let timeSlot = 1; timeSlot <= classDailyPeriods && remainingScheduled < remainingHours; timeSlot++) {
                                if (timeSlot === 5)
                                    continue; // Skip lunch break
                                if (remainingHours - remainingScheduled >= 2) {
                                    // Try to schedule 2 consecutive hours if we have at least 2 remaining
                                    if (timeSlot < classDailyPeriods && timeSlot + 1 !== 5) {
                                        // Try each suitable teacher
                                        for (const teacher of suitableTeachers) {
                                            try {
                                                const scheduleItem1 = {
                                                    class_id: classItem.id,
                                                    teacher_id: teacher.id,
                                                    lesson_id: lesson.id,
                                                    day_of_week: day,
                                                    time_slot: timeSlot
                                                };
                                                const scheduleItem2 = {
                                                    class_id: classItem.id,
                                                    teacher_id: teacher.id,
                                                    lesson_id: lesson.id,
                                                    day_of_week: day,
                                                    time_slot: timeSlot + 1
                                                };
                                                // Check if both slots are available
                                                const conflicts1 = await this.detectScheduleItemConflicts(scheduleItem1);
                                                const conflicts2 = await this.detectScheduleItemConflicts(scheduleItem2);
                                                if (conflicts1.length === 0 && conflicts2.length === 0) {
                                                    await this.createScheduleItem(scheduleItem1);
                                                    await this.createScheduleItem(scheduleItem2);
                                                    scheduledItems += 2;
                                                    remainingScheduled += 2;
                                                    break;
                                                }
                                            }
                                            catch (error) {
                                                // Continue trying other options
                                            }
                                        }
                                    }
                                }
                                else {
                                    // Schedule single hour
                                    for (const teacher of suitableTeachers) {
                                        try {
                                            const scheduleItem = {
                                                class_id: classItem.id,
                                                teacher_id: teacher.id,
                                                lesson_id: lesson.id,
                                                day_of_week: day,
                                                time_slot: timeSlot
                                            };
                                            // Check if this slot is available
                                            const conflicts = await this.detectScheduleItemConflicts(scheduleItem);
                                            if (conflicts.length === 0) {
                                                await this.createScheduleItem(scheduleItem);
                                                scheduledItems++;
                                                remainingScheduled++;
                                                break;
                                            }
                                        }
                                        catch (error) {
                                            // Continue trying other options
                                        }
                                    }
                                }
                            }
                        }
                        // Count any remaining hours as failed
                        failedItems += (remainingHours - remainingScheduled);
                    }
                }
            }
            // Detect remaining conflicts
            const remainingConflicts = await this.detectConflicts();
            return {
                success: failedItems === 0 && remainingConflicts.length === 0,
                message: `Program oluşturuldu. ${scheduledItems} ders başarıyla atandı, ${failedItems} ders atanamadı. ${remainingConflicts.length} çakışma tespit edildi.`,
                conflicts: remainingConflicts
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Program oluşturma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
                conflicts: []
            };
        }
    }
    async saveSchedule(scheduleData) {
        // This method can be used to save/export schedule data
        // Implementation depends on the specific requirements
        try {
            // For now, just return true as the schedule is already saved in the database
            return true;
        }
        catch (error) {
            console.error('Error saving schedule:', error);
            return false;
        }
    }
    async getScheduleStatistics() {
        const totalItems = await this.dbManager.getOne('SELECT COUNT(*) as count FROM schedule_items');
        const classesWithSchedule = await this.dbManager.getOne(`
      SELECT COUNT(DISTINCT class_id) as count FROM schedule_items
    `);
        const teachersWithSchedule = await this.dbManager.getOne(`
      SELECT COUNT(DISTINCT teacher_id) as count FROM schedule_items
    `);
        const conflicts = await this.detectConflicts();
        const dailyDistribution = await this.dbManager.getAll(`
      SELECT day_of_week, COUNT(*) as lesson_count
      FROM schedule_items
      GROUP BY day_of_week
      ORDER BY day_of_week
    `);
        const hourlyDistribution = await this.dbManager.getAll(`
      SELECT time_slot, COUNT(*) as lesson_count
      FROM schedule_items
      GROUP BY time_slot
      ORDER BY time_slot
    `);
        return {
            total_items: totalItems?.count || 0,
            classes_with_schedule: classesWithSchedule?.count || 0,
            teachers_with_schedule: teachersWithSchedule?.count || 0,
            conflicts: conflicts.length,
            daily_distribution: dailyDistribution,
            hourly_distribution: hourlyDistribution
        };
    }
    getDayName(dayOfWeek) {
        const days = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        return days[dayOfWeek] || 'Bilinmeyen';
    }
    async getEmptySlots() {
        const allSlots = [];
        // Get all classes to determine the maximum daily periods needed
        const classes = await this.classManager.getAll();
        let maxDailyPeriods = 8; // Default to 8 periods
        // Determine the maximum daily periods based on class grades
        if (classes.some(c => c.grade >= 5 && c.grade <= 8)) {
            // If we have Ortaokul classes (grades 5-8), we need to consider 7 periods
            maxDailyPeriods = Math.max(maxDailyPeriods, 7);
        }
        if (classes.some(c => c.grade >= 9 && c.grade <= 12)) {
            // If we have high school classes (grades 9-12), we need to consider 8 periods
            maxDailyPeriods = Math.max(maxDailyPeriods, 8);
        }
        // Generate all possible slots (5 days, maxDailyPeriods periods)
        for (let day = 1; day <= 5; day++) {
            for (let period = 1; period <= maxDailyPeriods; period++) {
                if (period !== 5) { // Skip lunch break
                    allSlots.push({ day_of_week: day, time_slot: period });
                }
            }
        }
        const occupiedSlots = await this.dbManager.getAll('SELECT DISTINCT day_of_week, time_slot FROM schedule_items');
        return allSlots.filter(slot => !occupiedSlots.some(occupied => occupied.day_of_week === slot.day_of_week &&
            occupied.time_slot === slot.time_slot));
    }
    async optimizeSchedule() {
        // Basic optimization: try to reduce teacher movement between classrooms
        // This is a simplified version - a full implementation would be much more complex
        try {
            const conflicts = await this.detectConflicts();
            // Try to resolve conflicts by moving schedule items to empty slots
            for (const conflict of conflicts.filter(c => c.severity === 'high')) {
                // Implementation would depend on specific optimization strategies
                // For now, just log the conflicts
                console.log('Optimization needed for:', conflict.message);
            }
            return {
                success: true,
                message: 'Program optimizasyonu tamamlandı'
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Optimizasyon hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
            };
        }
    }
}
exports.ScheduleManager = ScheduleManager;
//# sourceMappingURL=ScheduleManager.js.map