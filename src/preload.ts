import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Class management
  class: {
    getAll: () => ipcRenderer.invoke('class:getAll'),
    getById: (id: number) => ipcRenderer.invoke('class:getById', id),
    getByGrade: (grade: number) => ipcRenderer.invoke('class:getByGrade', grade),
    getAllWithGuidanceCounselors: () => ipcRenderer.invoke('class:getAllWithGuidanceCounselors'),
    create: (data: any) => ipcRenderer.invoke('class:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('class:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('class:delete', id),
    assignGuidanceCounselor: (teacherId: number, classId: number) => 
      ipcRenderer.invoke('class:assignGuidanceCounselor', teacherId, classId),
    removeGuidanceCounselor: (classId: number) => 
      ipcRenderer.invoke('class:removeGuidanceCounselor', classId),
    getGuidanceCounselorByClass: (classId: number) => 
      ipcRenderer.invoke('class:getGuidanceCounselorByClass', classId),
    getClassLessons: () => ipcRenderer.invoke('class:getClassLessons'),
    getClassLessonsByGrade: (grade: number) => ipcRenderer.invoke('class:getClassLessonsByGrade', grade),
    getAssignedTeachersForClass: (classId: number) => ipcRenderer.invoke('class:getAssignedTeachersForClass', classId),
    getAllClassesForTeacherAssignment: () => ipcRenderer.invoke('class:getAllClassesForTeacherAssignment'),
    getAllOrtaokulLessonsForTeacherAssignment: () => ipcRenderer.invoke('class:getAllOrtaokulLessonsForTeacherAssignment')
  },

  // Teacher management
  teacher: {
    getAll: () => ipcRenderer.invoke('teacher:getAll'),
    getById: (id: number) => ipcRenderer.invoke('teacher:getById', id),
    create: (data: any) => ipcRenderer.invoke('teacher:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('teacher:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('teacher:delete', id),
    getAvailability: (id: number) => ipcRenderer.invoke('teacher:getAvailability', id),
    setAvailability: (id: number, availability: any) => 
      ipcRenderer.invoke('teacher:setAvailability', id, availability),
    getLessons: (teacherId: number) => ipcRenderer.invoke('teacher:getLessons', teacherId),
    assignToLessonAndClass: (teacherId: number, lessonId: number, classId: number) => 
      ipcRenderer.invoke('teacher:assignToLessonAndClass', teacherId, lessonId, classId),
    getAssignments: (teacherId: number) => ipcRenderer.invoke('teacher:getAssignments', teacherId),
    removeAssignment: (teacherId: number, lessonId: number, classId: number) => 
      ipcRenderer.invoke('teacher:removeAssignment', teacherId, lessonId, classId),
    getTotalAssignedHours: (teacherId: number) => ipcRenderer.invoke('teacher:getTotalAssignedHours', teacherId)
  },

  // Lesson management
  lesson: {
    getAll: () => ipcRenderer.invoke('lesson:getAll'),
    getById: (id: number) => ipcRenderer.invoke('lesson:getById', id),
    getByGrade: (grade: number) => ipcRenderer.invoke('lesson:getByGrade', grade),
    create: (data: any) => ipcRenderer.invoke('lesson:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('lesson:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('lesson:delete', id),
    
    // Elective lesson availability management
    getAvailableElectives: (grade: number) => ipcRenderer.invoke('lesson:getAvailableElectives', grade),
    getAssignedElectives: (grade: number) => ipcRenderer.invoke('lesson:getAssignedElectives', grade),
    isElectiveAvailable: (lessonId: number, grade: number) => ipcRenderer.invoke('lesson:isElectiveAvailable', lessonId, grade),
    getAvailableElectivesForClass: (classId: number) => ipcRenderer.invoke('lesson:getAvailableElectivesForClass', classId),
    getElectivesWithStatus: (grade: number) => ipcRenderer.invoke('lesson:getElectivesWithStatus', grade)
  },

  // Schedule management
  schedule: {
    generate: (config: any) => ipcRenderer.invoke('schedule:generate', config),
    getForClass: (classId: number) => ipcRenderer.invoke('schedule:getForClass', classId),
    getForTeacher: (teacherId: number) => ipcRenderer.invoke('schedule:getForTeacher', teacherId),
    detectConflicts: () => ipcRenderer.invoke('schedule:detectConflicts'),
    save: (scheduleData: any) => ipcRenderer.invoke('schedule:save', scheduleData)
  },

  // Settings management
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getSchoolSettings: () => ipcRenderer.invoke('settings:getSchoolSettings'),
    updateSchoolSettings: (settings: any) => ipcRenderer.invoke('settings:updateSchoolSettings', settings)
  },

  // Elective Tracker Management
  electiveTracker: {
    updateStatus: (classId: number) => ipcRenderer.invoke('electiveTracker:updateStatus', classId),
    getStatusForClass: (classId: number) => ipcRenderer.invoke('electiveTracker:getStatusForClass', classId),
    getAllStatuses: () => ipcRenderer.invoke('electiveTracker:getAllStatuses'),
    getIncompleteAssignments: () => ipcRenderer.invoke('electiveTracker:getIncompleteAssignments'),
    getStatistics: () => ipcRenderer.invoke('electiveTracker:getStatistics'),
    getCompletionPercentage: () => ipcRenderer.invoke('electiveTracker:getCompletionPercentage'),
    getElectiveDistribution: () => ipcRenderer.invoke('electiveTracker:getElectiveDistribution'),
    refreshAllStatuses: () => ipcRenderer.invoke('electiveTracker:refreshAllStatuses')
  },

  // Assignment Alert Management
  assignmentAlert: {
    createAlert: (classId: number, type: string, message: string, severity?: string) => 
      ipcRenderer.invoke('assignmentAlert:createAlert', classId, type, message, severity),
    updateSeverity: (alertId: number, severity: string) => 
      ipcRenderer.invoke('assignmentAlert:updateSeverity', alertId, severity),
    resolveAlert: (alertId: number) => ipcRenderer.invoke('assignmentAlert:resolveAlert', alertId),
    getAlertsByClass: (classId: number) => ipcRenderer.invoke('assignmentAlert:getAlertsByClass', classId),
    getCriticalAlerts: () => ipcRenderer.invoke('assignmentAlert:getCriticalAlerts'),
    getActiveAlerts: () => ipcRenderer.invoke('assignmentAlert:getActiveAlerts'),
    getAlertsBySeverity: (severity: string) => ipcRenderer.invoke('assignmentAlert:getAlertsBySeverity', severity),
    getAlertsByType: (type: string) => ipcRenderer.invoke('assignmentAlert:getAlertsByType', type),
    cleanupResolvedAlerts: (olderThanDays?: number) => 
      ipcRenderer.invoke('assignmentAlert:cleanupResolvedAlerts', olderThanDays),
    getAlertStatistics: () => ipcRenderer.invoke('assignmentAlert:getAlertStatistics'),
    resolveAllForClass: (classId: number) => ipcRenderer.invoke('assignmentAlert:resolveAllForClass', classId),
    bulkResolveAlerts: (alertIds: number[]) => ipcRenderer.invoke('assignmentAlert:bulkResolveAlerts', alertIds),
    generateAlertsForAllClasses: () => ipcRenderer.invoke('assignmentAlert:generateAlertsForAllClasses')
  },

  // Suggestion Engine
  suggestionEngine: {
    generateSuggestions: (classId: number, criteria?: any) => 
      ipcRenderer.invoke('suggestionEngine:generateSuggestions', classId, criteria),
    scoreSuggestion: (classId: number, lessonId: number, teacherId: number, criteria: any) => 
      ipcRenderer.invoke('suggestionEngine:scoreSuggestion', classId, lessonId, teacherId, criteria),
    applySuggestion: (suggestionId: number) => ipcRenderer.invoke('suggestionEngine:applySuggestion', suggestionId),
    refreshCache: () => ipcRenderer.invoke('suggestionEngine:refreshCache'),
    getCachedSuggestions: (classId: number) => ipcRenderer.invoke('suggestionEngine:getCachedSuggestions', classId)
  },

  // Elective system initialization
  elective: {
    initializeData: () => ipcRenderer.invoke('elective:initializeData')
  },

  // Database operations
  database: {
    backup: () => ipcRenderer.invoke('db:backup'),
    restore: () => ipcRenderer.invoke('db:restore')
  },

  // Database utilities
  db: {
    cleanup: () => ipcRenderer.invoke('db:cleanup')
  },

  // Menu events
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu:new-schedule', () => callback('new-schedule'));
    ipcRenderer.on('menu:open-schedule', () => callback('open-schedule'));
    ipcRenderer.on('menu:save-schedule', () => callback('save-schedule'));
    ipcRenderer.on('menu:backup-db', () => callback('backup-db'));
    ipcRenderer.on('menu:restore-db', () => callback('restore-db'));
  },

  // Utility functions
  platform: process.platform,
  version: process.versions.electron
});

// Define the API type for TypeScript
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
    
    // Elective lesson availability management
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
    cleanup: () => Promise<{ classes: number; lessons: number; teachers: number }>;
  };
  onMenuAction: (callback: (action: string) => void) => void;
  platform: string;
  version: string;
}

// Global type declaration
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}