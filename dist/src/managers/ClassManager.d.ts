import { DatabaseManager, Class } from '../database/DatabaseManager';
export declare class ClassManager {
    private dbManager;
    constructor(dbManager: DatabaseManager);
    getAll(): Promise<Class[]>;
    getById(id: number): Promise<Class | null>;
    create(classData: Omit<Class, 'id' | 'created_at' | 'updated_at'>): Promise<Class>;
    update(id: number, classData: Partial<Class>): Promise<Class>;
    delete(id: number): Promise<boolean>;
    getByGrade(grade: number): Promise<Class[]>;
    getBySchoolType(schoolType: string): Promise<Class[]>;
    getGrades(): Promise<number[]>;
    getSchoolTypes(): Promise<string[]>;
    getClassSchedule(classId: number): Promise<any[]>;
    getClassWorkload(classId: number): Promise<{
        total_hours: number;
        teacher_count: number;
        lesson_count: number;
    }>;
    getClassSummary(classId: number): Promise<any>;
    searchClasses(query: string): Promise<Class[]>;
    getClassesWithoutSchedule(): Promise<Class[]>;
    getAllClassesForTeacherAssignment(): Promise<Class[]>;
    getClassroomUsage(): Promise<any[]>;
    validateClassData(classData: Partial<Class>): Promise<string[]>;
    generateClassName(schoolType: string, grade: number, section: string): Promise<string>;
    getAllWithGuidanceCounselors(): Promise<any[]>;
    getClassWithGuidanceCounselor(classId: number): Promise<any>;
    getAllClassesWithGuidanceCounselors(): Promise<any[]>;
    assignGuidanceCounselor(teacherId: number, classId: number): Promise<any>;
    removeGuidanceCounselor(classId: number): Promise<boolean>;
    getEmptyTimeSlots(classId: number): Promise<any[]>;
    getClassLessons(): Promise<any[]>;
    getClassLessonsByGrade(grade: number): Promise<any[]>;
    getAssignedTeachersForClass(classId: number): Promise<any[]>;
    getAllOrtaokulLessonsForTeacherAssignment(): Promise<any[]>;
}
//# sourceMappingURL=ClassManager.d.ts.map