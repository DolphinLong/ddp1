export interface ElectronAPI {
    class: {
        getAll: () => Promise<any[]>;
        getById: (id: number) => Promise<any>;
        getByGrade: (grade: number) => Promise<any[]>;
        getAllWithGuidanceCounselors: () => Promise<any[]>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<boolean>;
        assignGuidanceCounselor: (teacherId: number, classId: number) => Promise<any>;
        removeGuidanceCounselor: (classId: number) => Promise<boolean>;
        getGuidanceCounselorByClass: (classId: number) => Promise<any>;
        getClassLessons: () => Promise<any[]>;
        getClassLessonsByGrade: (grade: number) => Promise<any[]>;
        getAssignedTeachersForClass: (classId: number) => Promise<any[]>;
        getAllClassesForTeacherAssignment: () => Promise<any[]>;
        getAllOrtaokulLessonsForTeacherAssignment: () => Promise<any[]>;
    };
    teacher: {
        getAll: () => Promise<any[]>;
        getById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<boolean>;
        getAvailability: (id: number) => Promise<any>;
        setAvailability: (id: number, availability: any) => Promise<boolean>;
        getLessons: (teacherId: number) => Promise<any[]>;
        assignToLessonAndClass: (teacherId: number, lessonId: number, classId: number) => Promise<any>;
        getAssignments: (teacherId: number) => Promise<any[]>;
        removeAssignment: (teacherId: number, lessonId: number, classId: number) => Promise<boolean>;
        getTotalAssignedHours: (teacherId: number) => Promise<number>;
    };
    lesson: {
        getAll: () => Promise<any[]>;
        getById: (id: number) => Promise<any>;
        getByGrade: (grade: number) => Promise<any[]>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<boolean>;
        getAvailableElectives: (grade: number) => Promise<any[]>;
        getAssignedElectives: (grade: number) => Promise<any[]>;
        isElectiveAvailable: (lessonId: number, grade: number) => Promise<boolean>;
        getAvailableElectivesForClass: (classId: number) => Promise<any[]>;
        getElectivesWithStatus: (grade: number) => Promise<any[]>;
    };
    schedule: {
        generate: (config: any) => Promise<any>;
        getForClass: (classId: number) => Promise<any[]>;
        getForTeacher: (teacherId: number) => Promise<any[]>;
        detectConflicts: () => Promise<any[]>;
        save: (scheduleData: any) => Promise<boolean>;
    };
    settings: {
        getAll: () => Promise<any[]>;
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
        getSchoolSettings: () => Promise<any>;
        updateSchoolSettings: (settings: any) => Promise<boolean>;
    };
    electiveTracker: {
        updateStatus: (classId: number) => Promise<any>;
        getStatusForClass: (classId: number) => Promise<any>;
        getAllStatuses: () => Promise<any[]>;
        getIncompleteAssignments: () => Promise<any[]>;
        getStatistics: () => Promise<any>;
        getCompletionPercentage: () => Promise<number>;
        getElectiveDistribution: () => Promise<any[]>;
        refreshAllStatuses: () => Promise<void>;
    };
    assignmentAlert: {
        createAlert: (classId: number, type: string, message: string, severity?: string) => Promise<number>;
        updateSeverity: (alertId: number, severity: string) => Promise<boolean>;
        resolveAlert: (alertId: number) => Promise<boolean>;
        getAlertsByClass: (classId: number) => Promise<any[]>;
        getCriticalAlerts: () => Promise<any[]>;
        getActiveAlerts: () => Promise<any[]>;
        getAlertsBySeverity: (severity: string) => Promise<any[]>;
        getAlertsByType: (type: string) => Promise<any[]>;
        cleanupResolvedAlerts: (olderThanDays?: number) => Promise<number>;
        getAlertStatistics: () => Promise<any>;
        resolveAllForClass: (classId: number) => Promise<number>;
        bulkResolveAlerts: (alertIds: number[]) => Promise<number>;
        generateAlertsForAllClasses: () => Promise<number>;
    };
    suggestionEngine: {
        generateSuggestions: (classId: number, criteria?: any) => Promise<any[]>;
        scoreSuggestion: (classId: number, lessonId: number, teacherId: number, criteria: any) => Promise<number>;
        applySuggestion: (suggestionId: number) => Promise<boolean>;
        refreshCache: () => Promise<void>;
        getCachedSuggestions: (classId: number) => Promise<any[]>;
    };
    elective: {
        initializeData: () => Promise<boolean>;
    };
    database: {
        backup: () => Promise<boolean>;
        restore: () => Promise<boolean>;
    };
    db: {
        cleanup: () => Promise<{
            classes: number;
            lessons: number;
            teachers: number;
        }>;
    };
    onMenuAction: (callback: (action: string) => void) => void;
    platform: string;
    version: string;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
//# sourceMappingURL=preload.d.ts.map