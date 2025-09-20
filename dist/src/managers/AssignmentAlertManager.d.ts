import { DatabaseManager, AssignmentAlert } from '../database/DatabaseManager';
export declare enum AlertType {
    MISSING_ELECTIVES = "missing_electives",
    OVER_ASSIGNMENT = "over_assignment",
    CONFLICT = "conflict"
}
export declare enum AlertSeverity {
    INFO = "info",
    WARNING = "warning",
    CRITICAL = "critical"
}
export interface AlertWithClassInfo extends AssignmentAlert {
    className: string;
    grade: number;
}
export declare class AssignmentAlertManager {
    private dbManager;
    constructor(dbManager: DatabaseManager);
    /**
     * Creates a new alert for a specific class
     */
    createAlert(classId: number, type: AlertType | string, message: string, severity?: AlertSeverity | string): Promise<number | null>;
    /**
     * Updates the severity of an existing alert
     */
    updateAlertSeverity(alertId: number, severity: AlertSeverity | string): Promise<boolean>;
    /**
     * Resolves an alert by marking it as resolved
     */
    resolveAlert(alertId: number): Promise<boolean>;
    /**
     * Gets all alerts for a specific class
     */
    getAlertsByClass(classId: number): Promise<AlertWithClassInfo[]>;
    /**
     * Gets all critical alerts across all classes
     */
    getCriticalAlerts(): Promise<AlertWithClassInfo[]>;
    /**
     * Gets all active (unresolved) alerts
     */
    getActiveAlerts(): Promise<AlertWithClassInfo[]>;
    /**
     * Gets alerts by severity level
     */
    getAlertsBySeverity(severity: AlertSeverity): Promise<AlertWithClassInfo[]>;
    /**
     * Gets alerts by type
     */
    getAlertsByType(type: AlertType): Promise<AlertWithClassInfo[]>;
    /**
     * Cleans up resolved alerts older than specified days
     */
    cleanupResolvedAlerts(olderThanDays?: number): Promise<number>;
    /**
     * Gets alert statistics
     */
    getAlertStatistics(): Promise<{
        total: number;
        active: number;
        resolved: number;
        critical: number;
        warning: number;
        info: number;
        byType: {
            [key: string]: number;
        };
    }>;
    /**
     * Resolves all alerts for a specific class
     */
    resolveAllAlertsForClass(classId: number): Promise<number>;
    /**
     * Bulk resolve alerts by IDs
     */
    bulkResolveAlerts(alertIds: number[]): Promise<number>;
    /**
     * Creates alerts for all classes with elective assignment issues
     */
    generateAlertsForAllClasses(): Promise<number>;
}
//# sourceMappingURL=AssignmentAlertManager.d.ts.map