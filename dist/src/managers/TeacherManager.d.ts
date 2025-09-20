import { DatabaseManager, Teacher, TeacherAvailability } from '../database/DatabaseManager';
export declare class TeacherManager {
    private dbManager;
    constructor(dbManager: DatabaseManager);
    getAll(): Promise<Teacher[]>;
    getById(id: number): Promise<Teacher | null>;
    create(teacherData: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>): Promise<Teacher>;
    update(id: number, teacherData: Partial<Teacher>): Promise<Teacher>;
    delete(id: number): Promise<boolean>;
    getAvailability(teacherId: number): Promise<TeacherAvailability[]>;
    setAvailability(teacherId: number, availability: {
        day_of_week: number;
        time_slot: number;
        is_available: boolean;
    }[]): Promise<boolean>;
    isAvailable(teacherId: number, dayOfWeek: number, timeSlot: number): Promise<boolean>;
    getTeacherSchedule(teacherId: number): Promise<any[]>;
    getTeacherLessons(teacherId: number): Promise<any[]>;
    getTeacherWorkload(teacherId: number): Promise<{
        total_hours: number;
        class_count: number;
        lesson_count: number;
    }>;
    private initializeDefaultAvailability;
    searchTeachers(query: string): Promise<Teacher[]>;
    getTeachersWithoutSchedule(): Promise<Teacher[]>;
    assignTeacherToLessonAndClass(teacherId: number, lessonId: number, classId: number): Promise<any>;
    getTeacherAssignments(teacherId: number): Promise<any[]>;
    removeTeacherAssignment(teacherId: number, lessonId: number, classId: number): Promise<boolean>;
    getTotalAssignedHours(teacherId: number): Promise<number>;
}
//# sourceMappingURL=TeacherManager.d.ts.map