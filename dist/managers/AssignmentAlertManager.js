"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentAlertManager = exports.AlertSeverity = exports.AlertType = void 0;
// Enum definitions for alert types and severity levels
var AlertType;
(function (AlertType) {
    AlertType["MISSING_ELECTIVES"] = "missing_electives";
    AlertType["OVER_ASSIGNMENT"] = "over_assignment";
    AlertType["CONFLICT"] = "conflict";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "info";
    AlertSeverity["WARNING"] = "warning";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
class AssignmentAlertManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }
    /**
     * Creates a new alert for a specific class
     */
    async createAlert(classId, type, message, severity = AlertSeverity.WARNING) {
        try {
            // Check if similar alert already exists and is not resolved
            const existingAlert = await this.dbManager.getOne(`
        SELECT id FROM assignment_alerts 
        WHERE class_id = ? AND alert_type = ? AND is_resolved = 0
      `, [classId, type]);
            if (existingAlert) {
                // Update existing alert instead of creating duplicate
                await this.dbManager.runSQL(`
          UPDATE assignment_alerts 
          SET message = ?, severity = ?, created_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [message, severity, existingAlert.id]);
                return existingAlert.id;
            }
            // Create new alert
            const result = await this.dbManager.runSQL(`
        INSERT INTO assignment_alerts (class_id, alert_type, severity, message)
        VALUES (?, ?, ?, ?)
      `, [classId, type, severity, message]);
            return result.lastID;
        }
        catch (error) {
            console.error('Error creating alert:', error);
            throw error;
        }
    }
    /**
     * Updates the severity of an existing alert
     */
    async updateAlertSeverity(alertId, severity) {
        try {
            const result = await this.dbManager.runSQL(`
        UPDATE assignment_alerts 
        SET severity = ?
        WHERE id = ? AND is_resolved = 0
      `, [severity, alertId]);
            return result.changes > 0;
        }
        catch (error) {
            console.error('Error updating alert severity:', error);
            return false;
        }
    }
    /**
     * Resolves an alert by marking it as resolved
     */
    async resolveAlert(alertId) {
        try {
            const result = await this.dbManager.runSQL(`
        UPDATE assignment_alerts 
        SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [alertId]);
            return result.changes > 0;
        }
        catch (error) {
            console.error('Error resolving alert:', error);
            return false;
        }
    }
    /**
     * Gets all alerts for a specific class
     */
    async getAlertsByClass(classId) {
        const results = await this.dbManager.getAll(`
      SELECT 
        aa.*,
        c.grade,
        c.section
      FROM assignment_alerts aa
      JOIN classes c ON aa.class_id = c.id
      WHERE aa.class_id = ?
      ORDER BY aa.created_at DESC
    `, [classId]);
        return results.map(result => ({
            id: result.id,
            class_id: result.class_id,
            alert_type: result.alert_type,
            severity: result.severity,
            message: result.message,
            is_resolved: result.is_resolved,
            created_at: result.created_at,
            resolved_at: result.resolved_at,
            className: `${result.grade}/${result.section}`,
            grade: result.grade
        }));
    }
    /**
     * Gets all critical alerts across all classes
     */
    async getCriticalAlerts() {
        const results = await this.dbManager.getAll(`
      SELECT 
        aa.*,
        c.grade,
        c.section
      FROM assignment_alerts aa
      JOIN classes c ON aa.class_id = c.id
      WHERE aa.severity = 'critical' AND aa.is_resolved = 0
      ORDER BY aa.created_at DESC
    `);
        return results.map(result => ({
            id: result.id,
            class_id: result.class_id,
            alert_type: result.alert_type,
            severity: result.severity,
            message: result.message,
            is_resolved: result.is_resolved,
            created_at: result.created_at,
            resolved_at: result.resolved_at,
            className: `${result.grade}/${result.section}`,
            grade: result.grade
        }));
    }
    /**
     * Gets all active (unresolved) alerts
     */
    async getActiveAlerts() {
        const results = await this.dbManager.getAll(`
      SELECT 
        aa.*,
        c.grade,
        c.section
      FROM assignment_alerts aa
      JOIN classes c ON aa.class_id = c.id
      WHERE aa.is_resolved = 0
      ORDER BY 
        CASE aa.severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          WHEN 'info' THEN 3 
        END,
        aa.created_at DESC
    `);
        return results.map(result => ({
            id: result.id,
            class_id: result.class_id,
            alert_type: result.alert_type,
            severity: result.severity,
            message: result.message,
            is_resolved: result.is_resolved,
            created_at: result.created_at,
            resolved_at: result.resolved_at,
            className: `${result.grade}/${result.section}`,
            grade: result.grade
        }));
    }
    /**
     * Gets alerts by severity level
     */
    async getAlertsBySeverity(severity) {
        const results = await this.dbManager.getAll(`
      SELECT 
        aa.*,
        c.grade,
        c.section
      FROM assignment_alerts aa
      JOIN classes c ON aa.class_id = c.id
      WHERE aa.severity = ? AND aa.is_resolved = 0
      ORDER BY aa.created_at DESC
    `, [severity]);
        return results.map(result => ({
            id: result.id,
            class_id: result.class_id,
            alert_type: result.alert_type,
            severity: result.severity,
            message: result.message,
            is_resolved: result.is_resolved,
            created_at: result.created_at,
            resolved_at: result.resolved_at,
            className: `${result.grade}/${result.section}`,
            grade: result.grade
        }));
    }
    /**
     * Gets alerts by type
     */
    async getAlertsByType(type) {
        const results = await this.dbManager.getAll(`
      SELECT 
        aa.*,
        c.grade,
        c.section
      FROM assignment_alerts aa
      JOIN classes c ON aa.class_id = c.id
      WHERE aa.alert_type = ? AND aa.is_resolved = 0
      ORDER BY aa.created_at DESC
    `, [type]);
        return results.map(result => ({
            id: result.id,
            class_id: result.class_id,
            alert_type: result.alert_type,
            severity: result.severity,
            message: result.message,
            is_resolved: result.is_resolved,
            created_at: result.created_at,
            resolved_at: result.resolved_at,
            className: `${result.grade}/${result.section}`,
            grade: result.grade
        }));
    }
    /**
     * Cleans up resolved alerts older than specified days
     */
    async cleanupResolvedAlerts(olderThanDays = 30) {
        try {
            const result = await this.dbManager.runSQL(`
        DELETE FROM assignment_alerts 
        WHERE is_resolved = 1 
        AND resolved_at < datetime('now', '-${olderThanDays} days')
      `);
            return result.changes;
        }
        catch (error) {
            console.error('Error cleaning up resolved alerts:', error);
            return 0;
        }
    }
    /**
     * Gets alert statistics
     */
    async getAlertStatistics() {
        // Get total counts
        const totalResult = await this.dbManager.getOne('SELECT COUNT(*) as count FROM assignment_alerts');
        const activeResult = await this.dbManager.getOne('SELECT COUNT(*) as count FROM assignment_alerts WHERE is_resolved = 0');
        const resolvedResult = await this.dbManager.getOne('SELECT COUNT(*) as count FROM assignment_alerts WHERE is_resolved = 1');
        // Get counts by severity
        const severityCounts = await this.dbManager.getAll(`
      SELECT severity, COUNT(*) as count 
      FROM assignment_alerts 
      WHERE is_resolved = 0
      GROUP BY severity
    `);
        // Get counts by type
        const typeCounts = await this.dbManager.getAll(`
      SELECT alert_type, COUNT(*) as count 
      FROM assignment_alerts 
      WHERE is_resolved = 0
      GROUP BY alert_type
    `);
        const severityMap = { critical: 0, warning: 0, info: 0 };
        severityCounts.forEach((item) => {
            severityMap[item.severity] = item.count;
        });
        const typeMap = {};
        typeCounts.forEach((item) => {
            typeMap[item.alert_type] = item.count;
        });
        return {
            total: totalResult?.count || 0,
            active: activeResult?.count || 0,
            resolved: resolvedResult?.count || 0,
            critical: severityMap.critical,
            warning: severityMap.warning,
            info: severityMap.info,
            byType: typeMap
        };
    }
    /**
     * Resolves all alerts for a specific class
     */
    async resolveAllAlertsForClass(classId) {
        try {
            const result = await this.dbManager.runSQL(`
        UPDATE assignment_alerts 
        SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
        WHERE class_id = ? AND is_resolved = 0
      `, [classId]);
            return result.changes;
        }
        catch (error) {
            console.error('Error resolving all alerts for class:', error);
            return 0;
        }
    }
    /**
     * Bulk resolve alerts by IDs
     */
    async bulkResolveAlerts(alertIds) {
        if (alertIds.length === 0)
            return 0;
        try {
            const placeholders = alertIds.map(() => '?').join(',');
            const result = await this.dbManager.runSQL(`
        UPDATE assignment_alerts 
        SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders}) AND is_resolved = 0
      `, alertIds);
            return result.changes;
        }
        catch (error) {
            console.error('Error bulk resolving alerts:', error);
            return 0;
        }
    }
    /**
     * Creates alerts for all classes with elective assignment issues
     */
    async generateAlertsForAllClasses() {
        let alertsCreated = 0;
        try {
            // Get all classes with elective assignment issues
            const classesWithIssues = await this.dbManager.getAll(`
        SELECT 
          eas.*,
          c.grade,
          c.section
        FROM elective_assignment_status eas
        JOIN classes c ON eas.class_id = c.id
        WHERE eas.status != 'complete'
      `);
            for (const classItem of classesWithIssues) {
                let alertType;
                let severity;
                let message;
                if (classItem.status === 'incomplete') {
                    alertType = AlertType.MISSING_ELECTIVES;
                    severity = classItem.missing_electives >= 2 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
                    message = `${classItem.grade}/${classItem.section} sınıfında ${classItem.missing_electives} seçmeli ders eksik`;
                }
                else if (classItem.status === 'over_assigned') {
                    alertType = AlertType.OVER_ASSIGNMENT;
                    severity = AlertSeverity.WARNING;
                    message = `${classItem.grade}/${classItem.section} sınıfında fazla seçmeli ders ataması var`;
                }
                else {
                    continue; // Skip if no issue
                }
                await this.createAlert(classItem.class_id, alertType, message, severity);
                alertsCreated++;
            }
            return alertsCreated;
        }
        catch (error) {
            console.error('Error generating alerts for all classes:', error);
            return alertsCreated;
        }
    }
}
exports.AssignmentAlertManager = AssignmentAlertManager;
//# sourceMappingURL=AssignmentAlertManager.js.map