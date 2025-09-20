"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectiveTrackerManager = void 0;
class ElectiveTrackerManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }
    /**
     * Updates the elective assignment status for a specific class
     */
    async updateElectiveStatus(classId) {
        // Get class information
        const classInfo = await this.dbManager.getOne('SELECT id, grade, school_type, section FROM classes WHERE id = ?', [classId]);
        if (!classInfo) {
            throw new Error(`Class with id ${classId} not found`);
        }
        // Count assigned elective lessons for this class
        const assignedElectives = await this.dbManager.getOne(`
      SELECT COUNT(*) as count 
      FROM teacher_assignments ta
      JOIN lessons l ON ta.lesson_id = l.id
      WHERE ta.class_id = ? AND l.is_mandatory = 0
    `, [classId]);
        const assignedCount = assignedElectives?.count || 0;
        const requiredElectives = 3; // Default for ortaokul, can be made configurable
        const missingElectives = Math.max(0, requiredElectives - assignedCount);
        let status;
        if (assignedCount === requiredElectives) {
            status = 'complete';
        }
        else if (assignedCount < requiredElectives) {
            status = 'incomplete';
        }
        else {
            status = 'over_assigned';
        }
        // Update or insert the status
        await this.dbManager.runSQL(`
      INSERT OR REPLACE INTO elective_assignment_status 
      (class_id, grade, required_electives, assigned_electives, missing_electives, status, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [classId, classInfo.grade, requiredElectives, assignedCount, missingElectives, status]);
        return {
            classId: classId,
            className: `${classInfo.grade}/${classInfo.section}`,
            grade: classInfo.grade,
            requiredElectives: requiredElectives,
            assignedElectives: assignedCount,
            missingElectives: missingElectives,
            status: status,
            lastUpdated: new Date().toISOString()
        };
    }
    /**
     * Gets the elective assignment status for a specific class
     */
    async getElectiveStatusForClass(classId) {
        const result = await this.dbManager.getOne(`
      SELECT 
        eas.*,
        c.grade,
        c.section
      FROM elective_assignment_status eas
      JOIN classes c ON eas.class_id = c.id
      WHERE eas.class_id = ?
    `, [classId]);
        if (!result) {
            return null;
        }
        return {
            classId: result.class_id,
            className: `${result.grade}/${result.section}`,
            grade: result.grade,
            requiredElectives: result.required_electives,
            assignedElectives: result.assigned_electives,
            missingElectives: result.missing_electives,
            status: result.status,
            lastUpdated: result.last_updated
        };
    }
    /**
     * Gets all elective assignment statuses
     */
    async getAllElectiveStatuses() {
        const results = await this.dbManager.getAll(`
      SELECT 
        eas.*,
        c.grade,
        c.section
      FROM elective_assignment_status eas
      JOIN classes c ON eas.class_id = c.id
      ORDER BY c.grade, c.section
    `);
        return results.map(result => ({
            classId: result.class_id,
            className: `${result.grade}/${result.section}`,
            grade: result.grade,
            requiredElectives: result.required_electives,
            assignedElectives: result.assigned_electives,
            missingElectives: result.missing_electives,
            status: result.status,
            lastUpdated: result.last_updated
        }));
    }
    /**
     * Gets all classes with incomplete elective assignments
     */
    async getIncompleteAssignments() {
        const results = await this.dbManager.getAll(`
      SELECT 
        eas.*,
        c.grade,
        c.section
      FROM elective_assignment_status eas
      JOIN classes c ON eas.class_id = c.id
      WHERE eas.status = 'incomplete'
      ORDER BY eas.missing_electives DESC, c.grade, c.section
    `);
        const incompleteAssignments = [];
        for (const result of results) {
            // Get assigned elective lessons for this class
            const assignedLessons = await this.dbManager.getAll(`
        SELECT l.name
        FROM teacher_assignments ta
        JOIN lessons l ON ta.lesson_id = l.id
        WHERE ta.class_id = ? AND l.is_mandatory = 0
      `, [result.class_id]);
            incompleteAssignments.push({
                classId: result.class_id,
                className: `${result.grade}/${result.section}`,
                grade: result.grade,
                missingCount: result.missing_electives,
                assignedElectives: assignedLessons.map((lesson) => lesson.name)
            });
        }
        return incompleteAssignments;
    }
    /**
     * Generates alerts for elective assignment issues
     */
    async generateAlerts() {
        const alerts = [];
        // Get all classes with issues
        const incompleteClasses = await this.dbManager.getAll(`
      SELECT 
        eas.*,
        c.grade,
        c.section
      FROM elective_assignment_status eas
      JOIN classes c ON eas.class_id = c.id
      WHERE eas.status != 'complete'
    `);
        for (const classItem of incompleteClasses) {
            let alertType;
            let severity;
            let message;
            if (classItem.status === 'incomplete') {
                alertType = 'missing_electives';
                severity = classItem.missing_electives >= 2 ? 'critical' : 'warning';
                message = `${classItem.grade}/${classItem.section} sınıfında ${classItem.missing_electives} seçmeli ders eksik`;
            }
            else {
                alertType = 'over_assignment';
                severity = 'warning';
                message = `${classItem.grade}/${classItem.section} sınıfında fazla seçmeli ders ataması var`;
            }
            // Check if alert already exists and is not resolved
            const existingAlert = await this.dbManager.getOne(`
        SELECT id FROM assignment_alerts 
        WHERE class_id = ? AND alert_type = ? AND is_resolved = 0
      `, [classItem.class_id, alertType]);
            if (!existingAlert) {
                // Create new alert
                const result = await this.dbManager.runSQL(`
          INSERT INTO assignment_alerts (class_id, alert_type, severity, message)
          VALUES (?, ?, ?, ?)
        `, [classItem.class_id, alertType, severity, message]);
                alerts.push({
                    id: result.lastID,
                    class_id: classItem.class_id,
                    alert_type: alertType,
                    severity: severity,
                    message: message,
                    is_resolved: false,
                    created_at: new Date().toISOString()
                });
            }
        }
        return alerts;
    }
    /**
     * Resolves an alert
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
     * Gets all active (unresolved) alerts
     */
    async getActiveAlerts() {
        const results = await this.dbManager.getAll(`
      SELECT * FROM assignment_alerts 
      WHERE is_resolved = 0
      ORDER BY severity DESC, created_at DESC
    `);
        return results.map(result => ({
            id: result.id,
            class_id: result.class_id,
            alert_type: result.alert_type,
            severity: result.severity,
            message: result.message,
            is_resolved: result.is_resolved,
            created_at: result.created_at,
            resolved_at: result.resolved_at
        }));
    }
    /**
     * Gets comprehensive elective statistics
     */
    async getElectiveStatistics() {
        // Get total classes count
        const totalClassesResult = await this.dbManager.getOne('SELECT COUNT(*) as count FROM classes');
        const totalClasses = totalClassesResult?.count || 0;
        // Get completed and incomplete classes
        const statusCounts = await this.dbManager.getOne(`
      SELECT 
        SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'incomplete' THEN 1 ELSE 0 END) as incomplete,
        SUM(missing_electives) as total_missing,
        AVG(assigned_electives) as avg_electives
      FROM elective_assignment_status
    `);
        const completedClasses = statusCounts?.completed || 0;
        const incompleteClasses = statusCounts?.incomplete || 0;
        const totalMissingAssignments = statusCounts?.total_missing || 0;
        const averageElectivesPerClass = Math.round((statusCounts?.avg_electives || 0) * 100) / 100;
        const completionPercentage = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;
        return {
            totalClasses,
            completedClasses,
            incompleteClasses,
            completionPercentage,
            totalMissingAssignments,
            averageElectivesPerClass
        };
    }
    /**
     * Gets completion percentage
     */
    async getCompletionPercentage() {
        const stats = await this.getElectiveStatistics();
        return stats.completionPercentage;
    }
    /**
     * Gets elective lesson distribution across all classes
     */
    async getElectiveDistribution() {
        const results = await this.dbManager.getAll(`
      SELECT 
        l.name as lesson_name,
        COUNT(ta.id) as assignment_count
      FROM lessons l
      LEFT JOIN teacher_assignments ta ON l.id = ta.lesson_id
      WHERE l.is_mandatory = 0
      GROUP BY l.id, l.name
      ORDER BY assignment_count DESC
    `);
        const totalAssignments = results.reduce((sum, item) => sum + item.assignment_count, 0);
        return results.map((result) => ({
            lessonName: result.lesson_name,
            assignmentCount: result.assignment_count,
            percentage: totalAssignments > 0 ? Math.round((result.assignment_count / totalAssignments) * 100) : 0
        }));
    }
    /**
     * Refreshes all elective statuses for all classes
     */
    async refreshAllElectiveStatuses() {
        const classes = await this.dbManager.getAll('SELECT id FROM classes');
        for (const classItem of classes) {
            await this.updateElectiveStatus(classItem.id);
        }
    }
}
exports.ElectiveTrackerManager = ElectiveTrackerManager;
//# sourceMappingURL=ElectiveTrackerManager.js.map