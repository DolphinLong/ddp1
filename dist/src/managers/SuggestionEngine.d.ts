import { DatabaseManager, ElectiveSuggestion } from '../database/DatabaseManager';
export interface SuggestionWithDetails extends ElectiveSuggestion {
    lessonName: string;
    teacherName: string;
    className: string;
    grade: number;
}
export interface LessonPreference {
    lessonId: number;
    lessonName: string;
    preferenceScore: number;
    popularity: number;
}
export interface TeacherWorkload {
    teacherId: number;
    teacherName: string;
    currentHours: number;
    maxHours: number;
    availableHours: number;
    workloadPercentage: number;
}
export interface SuggestionCriteria {
    classId: number;
    preferTeachersWithLowWorkload: boolean;
    preferPopularElectives: boolean;
    avoidScheduleConflicts: boolean;
    maxSuggestions: number;
}
export declare class SuggestionEngine {
    private dbManager;
    constructor(dbManager: DatabaseManager);
    /**
     * Generates elective assignment suggestions for a specific class
     */
    generateSuggestions(classId: number, criteria?: Partial<SuggestionCriteria>): Promise<SuggestionWithDetails[]>;
    /**
     * Calculates a score for a specific lesson-teacher-class combination
     */
    scoreSuggestion(classId: number, lessonId: number, teacherId: number, criteria: SuggestionCriteria): Promise<number>;
    /**
     * Applies a suggestion by creating the teacher assignment
     */
    applySuggestion(suggestionId: number): Promise<boolean>;
    /**
     * Refreshes the suggestion cache for all classes
     */
    refreshSuggestionCache(): Promise<void>;
    /**
     * Calculates teacher workload as percentage of maximum hours
     */
    private calculateTeacherWorkload;
    /**
     * Checks for schedule conflicts between class and teacher
     */
    private checkScheduleConflicts;
    /**
     * Gets lesson popularity based on assignment frequency
     */
    private getLessonPopularity;
    /**
     * Gets available elective lessons for a specific grade
     */
    private getAvailableElectiveLessons;
    /**
     * Gets teachers who can teach a specific lesson
     */
    private getTeachersForLesson;
    /**
     * Checks if teacher's subject matches the lesson
     */
    private checkTeacherSubjectMatch;
    /**
     * Generates human-readable reasoning for a suggestion
     */
    private generateReasoning;
    /**
     * Caches suggestions in the database
     */
    private cacheSuggestions;
    /**
     * Gets cached suggestions for a class
     */
    getCachedSuggestions(classId: number): Promise<SuggestionWithDetails[]>;
}
//# sourceMappingURL=SuggestionEngine.d.ts.map