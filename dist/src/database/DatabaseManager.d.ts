export interface Teacher {
    id?: number;
    name: string;
    subject?: string;
    email?: string;
    phone?: string;
    created_at?: string;
    updated_at?: string;
}
export interface Class {
    id?: number;
    school_type: string;
    grade: number;
    section: string;
    created_at?: string;
    updated_at?: string;
}
export interface Lesson {
    id?: number;
    name: string;
    grade?: number;
    weekly_hours?: number;
    is_mandatory: boolean;
    school_type?: string;
    created_at?: string;
    updated_at?: string;
}
export interface ScheduleItem {
    id?: number;
    class_id: number;
    teacher_id: number;
    lesson_id: number;
    day_of_week: number;
    time_slot: number;
    created_at?: string;
    updated_at?: string;
}
export interface TeacherAvailability {
    id?: number;
    teacher_id: number;
    day_of_week: number;
    time_slot: number;
    is_available: boolean;
    created_at?: string;
    updated_at?: string;
}
export interface GuidanceCounselor {
    id?: number;
    teacher_id: number;
    class_id: number;
    created_at?: string;
    updated_at?: string;
}
export interface TeacherAssignment {
    id?: number;
    teacher_id: number;
    lesson_id: number;
    class_id: number;
    created_at?: string;
    updated_at?: string;
}
export interface ElectiveAssignmentStatus {
    id?: number;
    class_id: number;
    grade: number;
    required_electives: number;
    assigned_electives: number;
    missing_electives: number;
    status: 'complete' | 'incomplete' | 'over_assigned';
    last_updated?: string;
}
export interface AssignmentAlert {
    id?: number;
    class_id: number;
    alert_type: 'missing_electives' | 'over_assignment' | 'conflict';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    is_resolved: boolean;
    created_at?: string;
    resolved_at?: string;
}
export interface ElectiveSuggestion {
    id?: number;
    class_id: number;
    lesson_id: number;
    teacher_id: number;
    suggestion_score: number;
    reasoning: string;
    is_applied: boolean;
    created_at?: string;
}
export declare class DatabaseManager {
    private db;
    private dbPath;
    private currentSchoolType;
    private sectionCounters;
    private insertLocks;
    constructor(schoolType?: string);
    private static resolveUserDataPath;
    private isHighSchoolType;
    switchDatabase(schoolType: string): Promise<void>;
    getCurrentSchoolType(): string;
    getWeeklyHourLimit(): number;
    initialize(): Promise<void>;
    private createTables;
    private migrateClassesTable;
    private migrateTeachersTable;
    private migrateElectiveTrackingTables;
    private seedDefaultData;
    private initializeElectiveAssignmentStatus;
    runSQL(sql: string, params?: any[]): Promise<any>;
    run(sql: string, params?: any[]): Promise<any>;
    all(sql: string, params?: any[]): Promise<any[]>;
    getAll(sql: string, params?: any[]): Promise<any[]>;
    getOne(sql: string, params?: any[]): Promise<any>;
    get(sql: string, params?: any[]): Promise<any>;
    getCount(table: string): Promise<number>;
    backup(filePath: string): Promise<boolean>;
    restore(filePath: string): Promise<boolean>;
    close(): Promise<void>;
    migrateDataFrom(sourceDbPath: string): Promise<boolean>;
    static getDatabasePathForSchoolType(schoolType: string): string;
    getGuidanceCounselorByClass(classId: number): Promise<any>;
    getGuidanceCounselorByTeacher(teacherId: number): Promise<any[]>;
    getAllGuidanceCounselors(): Promise<any[]>;
    assignGuidanceCounselor(teacherId: number, classId: number): Promise<any>;
    removeGuidanceCounselor(classId: number): Promise<boolean>;
    getClassAssignedHours(classId: number): Promise<number>;
    assignTeacherToLessonAndClass(teacherId: number, lessonId: number, classId: number): Promise<TeacherAssignment>;
    getTeacherAssignments(teacherId: number): Promise<TeacherAssignment[]>;
    removeTeacherAssignment(teacherId: number, lessonId: number, classId: number): Promise<boolean>;
    getTeachersForLessonAndClass(lessonId: number, classId: number): Promise<Teacher[]>;
    getSetting(key: string): Promise<string | null>;
    setSetting(key: string, value: string): Promise<boolean>;
    getAllSettings(): Promise<any[]>;
    getClassLessons(): Promise<any[]>;
    getClassLessonsByGrade(grade: number): Promise<any[]>;
    getAssignedTeachersForClass(classId: number): Promise<any[]>;
    getAllClassesForTeacherAssignment(): Promise<any[]>;
    getAllOrtaokulLessonsForTeacherAssignment(): Promise<Lesson[]>;
    removeDuplicateClasses(): Promise<number>;
    removeDuplicateLessons(): Promise<number>;
    removeDuplicateTeachers(): Promise<number>;
    cleanupDatabase(): Promise<{
        classes: number;
        lessons: number;
        teachers: number;
    }>;
    private cache;
    private readonly DEFAULT_CACHE_TTL;
    /**
     * Get data from cache or execute query if not cached
     */
    getCached<T>(key: string, queryFn: () => Promise<T>, ttl?: number): Promise<T>;
    /**
     * Clear cache for specific key or all cache
     */
    clearCache(key?: string): void;
    /**
     * Create database indexes for better performance
     */
    createPerformanceIndexes(): Promise<void>;
    /**
     * Optimize database with VACUUM and ANALYZE
     */
    optimizeDatabase(): Promise<void>;
    /**
     * Get database statistics for monitoring
     */
    getDatabaseStats(): Promise<{
        tables: {
            name: string;
            rowCount: number;
            size: string;
        }[];
        indexes: {
            name: string;
            table: string;
        }[];
        cacheStats: {
            size: number;
            hitRate: number;
        };
    }>;
    /**
     * Format bytes to human readable format
     */
    private formatBytes;
    /**
     * Cached version of frequently used queries
     */
    getCachedElectiveStatuses(): Promise<any[]>;
    getCachedActiveAlerts(): Promise<any[]>;
    getCachedElectiveDistribution(): Promise<any[]>;
    /**
     * Initialize performance optimizations
     */
    initializePerformanceOptimizations(): Promise<void>;
}
//# sourceMappingURL=DatabaseManager.d.ts.map