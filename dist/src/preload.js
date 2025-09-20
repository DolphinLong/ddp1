"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Class management
    class: {
        getAll: () => electron_1.ipcRenderer.invoke('class:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('class:getById', id),
        getByGrade: (grade) => electron_1.ipcRenderer.invoke('class:getByGrade', grade),
        getAllWithGuidanceCounselors: () => electron_1.ipcRenderer.invoke('class:getAllWithGuidanceCounselors'),
        create: (data) => electron_1.ipcRenderer.invoke('class:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('class:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('class:delete', id),
        assignGuidanceCounselor: (teacherId, classId) => electron_1.ipcRenderer.invoke('class:assignGuidanceCounselor', teacherId, classId),
        removeGuidanceCounselor: (classId) => electron_1.ipcRenderer.invoke('class:removeGuidanceCounselor', classId),
        getGuidanceCounselorByClass: (classId) => electron_1.ipcRenderer.invoke('class:getGuidanceCounselorByClass', classId),
        getClassLessons: () => electron_1.ipcRenderer.invoke('class:getClassLessons'),
        getClassLessonsByGrade: (grade) => electron_1.ipcRenderer.invoke('class:getClassLessonsByGrade', grade),
        getAssignedTeachersForClass: (classId) => electron_1.ipcRenderer.invoke('class:getAssignedTeachersForClass', classId),
        getAllClassesForTeacherAssignment: () => electron_1.ipcRenderer.invoke('class:getAllClassesForTeacherAssignment'),
        getAllOrtaokulLessonsForTeacherAssignment: () => electron_1.ipcRenderer.invoke('class:getAllOrtaokulLessonsForTeacherAssignment')
    },
    // Teacher management
    teacher: {
        getAll: () => electron_1.ipcRenderer.invoke('teacher:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('teacher:getById', id),
        create: (data) => electron_1.ipcRenderer.invoke('teacher:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('teacher:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('teacher:delete', id),
        getAvailability: (id) => electron_1.ipcRenderer.invoke('teacher:getAvailability', id),
        setAvailability: (id, availability) => electron_1.ipcRenderer.invoke('teacher:setAvailability', id, availability),
        getLessons: (teacherId) => electron_1.ipcRenderer.invoke('teacher:getLessons', teacherId),
        assignToLessonAndClass: (teacherId, lessonId, classId) => electron_1.ipcRenderer.invoke('teacher:assignToLessonAndClass', teacherId, lessonId, classId),
        getAssignments: (teacherId) => electron_1.ipcRenderer.invoke('teacher:getAssignments', teacherId),
        removeAssignment: (teacherId, lessonId, classId) => electron_1.ipcRenderer.invoke('teacher:removeAssignment', teacherId, lessonId, classId),
        getTotalAssignedHours: (teacherId) => electron_1.ipcRenderer.invoke('teacher:getTotalAssignedHours', teacherId)
    },
    // Lesson management
    lesson: {
        getAll: () => electron_1.ipcRenderer.invoke('lesson:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('lesson:getById', id),
        getByGrade: (grade) => electron_1.ipcRenderer.invoke('lesson:getByGrade', grade),
        create: (data) => electron_1.ipcRenderer.invoke('lesson:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('lesson:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('lesson:delete', id),
        // Elective lesson availability management
        getAvailableElectives: (grade) => electron_1.ipcRenderer.invoke('lesson:getAvailableElectives', grade),
        getAssignedElectives: (grade) => electron_1.ipcRenderer.invoke('lesson:getAssignedElectives', grade),
        isElectiveAvailable: (lessonId, grade) => electron_1.ipcRenderer.invoke('lesson:isElectiveAvailable', lessonId, grade),
        getAvailableElectivesForClass: (classId) => electron_1.ipcRenderer.invoke('lesson:getAvailableElectivesForClass', classId),
        getElectivesWithStatus: (grade) => electron_1.ipcRenderer.invoke('lesson:getElectivesWithStatus', grade)
    },
    // Schedule management
    schedule: {
        generate: (config) => electron_1.ipcRenderer.invoke('schedule:generate', config),
        getForClass: (classId) => electron_1.ipcRenderer.invoke('schedule:getForClass', classId),
        getForTeacher: (teacherId) => electron_1.ipcRenderer.invoke('schedule:getForTeacher', teacherId),
        detectConflicts: () => electron_1.ipcRenderer.invoke('schedule:detectConflicts'),
        save: (scheduleData) => electron_1.ipcRenderer.invoke('schedule:save', scheduleData)
    },
    // Settings management
    settings: {
        getAll: () => electron_1.ipcRenderer.invoke('settings:getAll'),
        get: (key) => electron_1.ipcRenderer.invoke('settings:get', key),
        set: (key, value) => electron_1.ipcRenderer.invoke('settings:set', key, value),
        getSchoolSettings: () => electron_1.ipcRenderer.invoke('settings:getSchoolSettings'),
        updateSchoolSettings: (settings) => electron_1.ipcRenderer.invoke('settings:updateSchoolSettings', settings)
    },
    // Elective Tracker Management
    electiveTracker: {
        updateStatus: (classId) => electron_1.ipcRenderer.invoke('electiveTracker:updateStatus', classId),
        getStatusForClass: (classId) => electron_1.ipcRenderer.invoke('electiveTracker:getStatusForClass', classId),
        getAllStatuses: () => electron_1.ipcRenderer.invoke('electiveTracker:getAllStatuses'),
        getIncompleteAssignments: () => electron_1.ipcRenderer.invoke('electiveTracker:getIncompleteAssignments'),
        getStatistics: () => electron_1.ipcRenderer.invoke('electiveTracker:getStatistics'),
        getCompletionPercentage: () => electron_1.ipcRenderer.invoke('electiveTracker:getCompletionPercentage'),
        getElectiveDistribution: () => electron_1.ipcRenderer.invoke('electiveTracker:getElectiveDistribution'),
        refreshAllStatuses: () => electron_1.ipcRenderer.invoke('electiveTracker:refreshAllStatuses')
    },
    // Assignment Alert Management
    assignmentAlert: {
        createAlert: (classId, type, message, severity) => electron_1.ipcRenderer.invoke('assignmentAlert:createAlert', classId, type, message, severity),
        updateSeverity: (alertId, severity) => electron_1.ipcRenderer.invoke('assignmentAlert:updateSeverity', alertId, severity),
        resolveAlert: (alertId) => electron_1.ipcRenderer.invoke('assignmentAlert:resolveAlert', alertId),
        getAlertsByClass: (classId) => electron_1.ipcRenderer.invoke('assignmentAlert:getAlertsByClass', classId),
        getCriticalAlerts: () => electron_1.ipcRenderer.invoke('assignmentAlert:getCriticalAlerts'),
        getActiveAlerts: () => electron_1.ipcRenderer.invoke('assignmentAlert:getActiveAlerts'),
        getAlertsBySeverity: (severity) => electron_1.ipcRenderer.invoke('assignmentAlert:getAlertsBySeverity', severity),
        getAlertsByType: (type) => electron_1.ipcRenderer.invoke('assignmentAlert:getAlertsByType', type),
        cleanupResolvedAlerts: (olderThanDays) => electron_1.ipcRenderer.invoke('assignmentAlert:cleanupResolvedAlerts', olderThanDays),
        getAlertStatistics: () => electron_1.ipcRenderer.invoke('assignmentAlert:getAlertStatistics'),
        resolveAllForClass: (classId) => electron_1.ipcRenderer.invoke('assignmentAlert:resolveAllForClass', classId),
        bulkResolveAlerts: (alertIds) => electron_1.ipcRenderer.invoke('assignmentAlert:bulkResolveAlerts', alertIds),
        generateAlertsForAllClasses: () => electron_1.ipcRenderer.invoke('assignmentAlert:generateAlertsForAllClasses')
    },
    // Suggestion Engine
    suggestionEngine: {
        generateSuggestions: (classId, criteria) => electron_1.ipcRenderer.invoke('suggestionEngine:generateSuggestions', classId, criteria),
        scoreSuggestion: (classId, lessonId, teacherId, criteria) => electron_1.ipcRenderer.invoke('suggestionEngine:scoreSuggestion', classId, lessonId, teacherId, criteria),
        applySuggestion: (suggestionId) => electron_1.ipcRenderer.invoke('suggestionEngine:applySuggestion', suggestionId),
        refreshCache: () => electron_1.ipcRenderer.invoke('suggestionEngine:refreshCache'),
        getCachedSuggestions: (classId) => electron_1.ipcRenderer.invoke('suggestionEngine:getCachedSuggestions', classId)
    },
    // Elective system initialization
    elective: {
        initializeData: () => electron_1.ipcRenderer.invoke('elective:initializeData')
    },
    // Database operations
    database: {
        backup: () => electron_1.ipcRenderer.invoke('db:backup'),
        restore: () => electron_1.ipcRenderer.invoke('db:restore')
    },
    // Database utilities
    db: {
        cleanup: () => electron_1.ipcRenderer.invoke('db:cleanup')
    },
    // Menu events
    onMenuAction: (callback) => {
        electron_1.ipcRenderer.on('menu:new-schedule', () => callback('new-schedule'));
        electron_1.ipcRenderer.on('menu:open-schedule', () => callback('open-schedule'));
        electron_1.ipcRenderer.on('menu:save-schedule', () => callback('save-schedule'));
        electron_1.ipcRenderer.on('menu:backup-db', () => callback('backup-db'));
        electron_1.ipcRenderer.on('menu:restore-db', () => callback('restore-db'));
    },
    // Utility functions
    platform: process.platform,
    version: process.versions.electron
});
//# sourceMappingURL=preload.js.map