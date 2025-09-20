import { DatabaseManager, AssignmentAlert } from '../database/DatabaseManager';
export interface ElectiveStatus {
    classId: number;
    className: string;
    grade: number;
    requiredElectives: number;
    assignedElectives: number;
    missingElectives: number;
    status: 'complete' | 'incomplete' | 'over_assigned';
    lastUpdated: string;
}
export interface IncompleteAssignment {
    classId: number;
    className: string;
    grade: number;
    missingCount: number;
    assignedElectives: string[];
}
export interface ElectiveStatistics {
    totalClasses: number;
    completedClasses: number;
    incompleteClasses: number;
    completionPercentage: number;
    totalMissingAssignments: number;
    averageElectivesPerClass: number;
    total_classes?: number;
    complete_classes?: number;
    incomplete_classes?: number;
    completion_percentage?: number;
    total_missing_assignments?: number;
    average_electives_per_class?: number;
}
export interface ElectiveDistribution {
    lessonName: string;
    assignmentCount: number;
    percentage: number;
}
export declare class ElectiveTrackerManager {
    private dbManager;
    constructor(dbManager: DatabaseManager);
    /**
     * Updates the elective assignment status for a specific class
     */
    updateElectiveStatus(classId: number): Promise<ElectiveStatus | null>;
    /**
     * Gets the elective assignment status for a specific class
     */
    getElectiveStatusForClass(classId: number): Promise<any | null>;
    /**
     * Gets all elective assignment statuses
     */
    getAllElectiveStatuses(): Promise<ElectiveStatus[]>;
    /**
     * Gets all classes with incomplete elective assignments
     */
    getIncompleteAssignments(): Promise<IncompleteAssignment[]>;
    /**
     * Generates alerts for elective assignment issues
     */
    generateAlerts(): Promise<AssignmentAlert[]>;
    /**
     * Resolves an alert
     */
    resolveAlert(alertId: number): Promise<boolean>;
    /**
     * Gets all active (unresolved) alerts
     */
    getActiveAlerts(): Promise<AssignmentAlert[]>;
    /**
     * Gets comprehensive elective statistics
     */
    getElectiveStatistics(): Promise<ElectiveStatistics>;
    /**
     * Gets completion percentage
     */
    getCompletionPercentage(): Promise<number>;
    /**
     * Gets elective lesson distribution across all classes
     */
    getElectiveDistribution(): Promise<ElectiveDistribution[]>;
    /**
     * Refreshes all elective statuses for all classes
     */
    refreshAllElectiveStatuses(): Promise<void>;
}
//# sourceMappingURL=ElectiveTrackerManager.d.ts.map