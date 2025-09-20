import { DatabaseManager, Lesson } from '../database/DatabaseManager';
export declare class LessonManager {
    private dbManager;
    constructor(dbManager: DatabaseManager);
    getAll(): Promise<Lesson[]>;
    getById(id: number): Promise<Lesson | null>;
    create(lessonData: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>): Promise<Lesson>;
    update(id: number, lessonData: Partial<Lesson>): Promise<Lesson>;
    delete(id: number): Promise<boolean>;
    getByGrade(grade: number): Promise<Lesson[]>;
    getBySchoolType(schoolType: string): Promise<Lesson[]>;
    getMandatoryLessons(grade: number): Promise<Lesson[]>;
    getElectiveLessons(grade: number): Promise<Lesson[]>;
    getTotalWeeklyHours(grade: number): Promise<number>;
    getLessonStatistics(): Promise<any>;
    searchLessons(query: string): Promise<Lesson[]>;
    getLessonsWithoutTeachers(): Promise<Lesson[]>;
    validateMEBCompliance(grade: number, schoolType?: string): Promise<{
        isCompliant: boolean;
        issues: string[];
    }>;
    createMEBCurriculum(grade: number, schoolType?: string): Promise<void>;
    getGrades(): Promise<number[]>;
    getSchoolTypes(): Promise<string[]>;
    duplicateGradeCurriculum(fromGrade: number, toGrade: number, schoolType: string): Promise<void>;
    /**
     * Get available elective lessons for a specific grade that are NOT already assigned to any class
     * @param grade The grade level
     * @returns Available elective lessons
     */
    getAvailableElectiveLessons(grade: number): Promise<Lesson[]>;
    /**
     * Get assigned elective lessons for a specific grade
     * @param grade The grade level
     * @returns Assigned elective lessons with assignment details
     */
    getAssignedElectiveLessons(grade: number): Promise<any[]>;
    /**
     * Check if an elective lesson is available for assignment
     * @param lessonId The lesson ID
     * @param grade The grade level
     * @returns True if available, false if already assigned
     */
    isElectiveLessonAvailable(lessonId: number, grade: number): Promise<boolean>;
    /**
     * Get elective lessons that can be assigned to a specific class
     * (excludes lessons already assigned to other classes of the same grade)
     * @param classId The class ID
     * @returns Available elective lessons for the class
     */
    getAvailableElectiveLessonsForClass(classId: number): Promise<Lesson[]>;
    /**
     * Get all elective lessons with their assignment status for a specific grade
     * @param grade The grade level
     * @returns Elective lessons with assignment status
     */
    getElectiveLessonsWithStatus(grade: number): Promise<any[]>;
}
//# sourceMappingURL=LessonManager.d.ts.map