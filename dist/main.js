"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const DatabaseManager_1 = require("./database/DatabaseManager");
const ScheduleManager_1 = require("./managers/ScheduleManager");
const TeacherManager_1 = require("./managers/TeacherManager");
const ClassManager_1 = require("./managers/ClassManager");
const LessonManager_1 = require("./managers/LessonManager");
const SettingsManager_1 = require("./managers/SettingsManager");
const ElectiveTrackerManager_1 = require("./managers/ElectiveTrackerManager");
const AssignmentAlertManager_1 = require("./managers/AssignmentAlertManager");
const SuggestionEngine_1 = require("./managers/SuggestionEngine");
const fix_8th_grade_curriculum_1 = require("./scripts/fix-8th-grade-curriculum");
class ModernLessonManager {
    constructor() {
        this.mainWindow = null;
        // Initialize with default school type, will be updated based on settings
        this.dbManager = new DatabaseManager_1.DatabaseManager();
        this.scheduleManager = new ScheduleManager_1.ScheduleManager(this.dbManager);
        this.teacherManager = new TeacherManager_1.TeacherManager(this.dbManager);
        this.classManager = new ClassManager_1.ClassManager(this.dbManager);
        this.lessonManager = new LessonManager_1.LessonManager(this.dbManager);
        this.settingsManager = new SettingsManager_1.SettingsManager(this.dbManager);
        this.electiveTrackerManager = new ElectiveTrackerManager_1.ElectiveTrackerManager(this.dbManager);
        this.assignmentAlertManager = new AssignmentAlertManager_1.AssignmentAlertManager(this.dbManager);
        this.suggestionEngine = new SuggestionEngine_1.SuggestionEngine(this.dbManager);
    }
    async initialize() {
        await electron_1.app.whenReady();
        // Initialize database with the correct school type from settings
        await this.initializeDatabaseWithSchoolType();
        this.createWindow();
        this.setupIPC();
        this.setupMenu();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                electron_1.app.quit();
            }
        });
    }
    async initializeDatabaseWithSchoolType() {
        try {
            // First initialize with default database
            await this.dbManager.initialize();
            // Then try to get school type from settings and switch if needed
            let schoolType = await this.settingsManager.getSetting('school_type');
            if (schoolType) {
                await this.dbManager.switchDatabase(schoolType);
            }
            else {
                // Persist default to Ortaokul if not set, to avoid logic mismatches
                await this.settingsManager.setSetting('school_type', 'Ortaokul');
                await this.dbManager.switchDatabase('Ortaokul');
                schoolType = 'Ortaokul';
            }
            // Apply curriculum fixes for ortaokul
            const currentSchoolType = this.dbManager.getCurrentSchoolType();
            if (currentSchoolType === 'Ortaokul') {
                console.log('Running curriculum fix for Ortaokul...');
                await (0, fix_8th_grade_curriculum_1.runCurriculumFix)(this.dbManager);
            }
        }
        catch (error) {
            console.error('Error initializing database with school type:', error);
            // Fallback to default initialization
            try {
                await this.dbManager.initialize();
            }
            catch (fallbackError) {
                console.error('Error during fallback initialization:', fallbackError);
            }
        }
    }
    createWindow() {
        this.mainWindow = new electron_1.BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1200,
            minHeight: 700,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: path.join(__dirname, '../assets/icon.png'),
            titleBarStyle: 'default',
            show: false
        });
        // Load the main window
        this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
            if (process.env.NODE_ENV === 'development') {
                this.mainWindow?.webContents.openDevTools();
            }
        });
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }
    setupIPC() {
        // Teacher management
        electron_1.ipcMain.handle('teacher:getAll', () => this.teacherManager.getAll());
        electron_1.ipcMain.handle('teacher:create', (_, data) => this.teacherManager.create(data));
        electron_1.ipcMain.handle('teacher:update', (_, id, data) => this.teacherManager.update(id, data));
        electron_1.ipcMain.handle('teacher:delete', (_, id) => this.teacherManager.delete(id));
        electron_1.ipcMain.handle('teacher:getAvailability', (_, id) => this.teacherManager.getAvailability(id));
        electron_1.ipcMain.handle('teacher:setAvailability', (_, id, availability) => this.teacherManager.setAvailability(id, availability));
        electron_1.ipcMain.handle('teacher:getLessons', (_, teacherId) => this.teacherManager.getTeacherLessons(teacherId));
        electron_1.ipcMain.handle('teacher:assignToLessonAndClass', (_, teacherId, lessonId, classId) => this.teacherManager.assignTeacherToLessonAndClass(teacherId, lessonId, classId));
        electron_1.ipcMain.handle('teacher:getAssignments', (_, teacherId) => this.teacherManager.getTeacherAssignments(teacherId));
        electron_1.ipcMain.handle('teacher:removeAssignment', (_, teacherId, lessonId, classId) => this.teacherManager.removeTeacherAssignment(teacherId, lessonId, classId));
        electron_1.ipcMain.handle('teacher:getTotalAssignedHours', (_, teacherId) => this.teacherManager.getTotalAssignedHours(teacherId));
        // Class management
        electron_1.ipcMain.handle('class:getAll', () => this.classManager.getAll());
        electron_1.ipcMain.handle('class:getAllWithGuidanceCounselors', () => this.classManager.getAllWithGuidanceCounselors());
        electron_1.ipcMain.handle('class:create', (_, data) => this.classManager.create(data));
        electron_1.ipcMain.handle('class:update', (_, id, data) => this.classManager.update(id, data));
        electron_1.ipcMain.handle('class:delete', (_, id) => this.classManager.delete(id));
        electron_1.ipcMain.handle('class:assignGuidanceCounselor', (_, teacherId, classId) => this.classManager.assignGuidanceCounselor(teacherId, classId));
        electron_1.ipcMain.handle('class:removeGuidanceCounselor', (_, classId) => this.classManager.removeGuidanceCounselor(classId));
        electron_1.ipcMain.handle('class:getGuidanceCounselorByClass', (_, classId) => this.dbManager.getGuidanceCounselorByClass(classId));
        electron_1.ipcMain.handle('class:getClassLessons', () => this.classManager.getClassLessons());
        electron_1.ipcMain.handle('class:getClassLessonsByGrade', (_, grade) => this.classManager.getClassLessonsByGrade(grade));
        electron_1.ipcMain.handle('class:getAssignedTeachersForClass', (_, classId) => this.classManager.getAssignedTeachersForClass(classId));
        electron_1.ipcMain.handle('class:getAllClassesForTeacherAssignment', () => this.classManager.getAllClassesForTeacherAssignment());
        electron_1.ipcMain.handle('class:getAllOrtaokulLessonsForTeacherAssignment', () => this.classManager.getAllOrtaokulLessonsForTeacherAssignment());
        // Lesson management
        electron_1.ipcMain.handle('lesson:getAll', () => this.lessonManager.getAll());
        electron_1.ipcMain.handle('lesson:getByGrade', (_, grade) => this.lessonManager.getByGrade(grade));
        electron_1.ipcMain.handle('lesson:create', (_, data) => this.lessonManager.create(data));
        electron_1.ipcMain.handle('lesson:update', (_, id, data) => this.lessonManager.update(id, data));
        electron_1.ipcMain.handle('lesson:delete', (_, id) => this.lessonManager.delete(id));
        // Elective lesson availability management
        electron_1.ipcMain.handle('lesson:getAvailableElectives', (_, grade) => this.lessonManager.getAvailableElectiveLessons(grade));
        electron_1.ipcMain.handle('lesson:getAssignedElectives', (_, grade) => this.lessonManager.getAssignedElectiveLessons(grade));
        electron_1.ipcMain.handle('lesson:isElectiveAvailable', (_, lessonId, grade) => this.lessonManager.isElectiveLessonAvailable(lessonId, grade));
        electron_1.ipcMain.handle('lesson:getAvailableElectivesForClass', (_, classId) => this.lessonManager.getAvailableElectiveLessonsForClass(classId));
        electron_1.ipcMain.handle('lesson:getElectivesWithStatus', (_, grade) => this.lessonManager.getElectiveLessonsWithStatus(grade));
        // Schedule management
        electron_1.ipcMain.handle('schedule:generate', (_, config) => this.scheduleManager.generateSchedule(config));
        electron_1.ipcMain.handle('schedule:getForClass', (_, classId) => this.scheduleManager.getClassSchedule(classId));
        electron_1.ipcMain.handle('schedule:getForTeacher', (_, teacherId) => this.scheduleManager.getTeacherSchedule(teacherId));
        electron_1.ipcMain.handle('schedule:detectConflicts', () => this.scheduleManager.detectConflicts());
        electron_1.ipcMain.handle('schedule:save', (_, scheduleData) => this.scheduleManager.saveSchedule(scheduleData));
        // Settings management
        electron_1.ipcMain.handle('settings:getAll', () => this.settingsManager.getAllSettings());
        electron_1.ipcMain.handle('settings:get', (_, key) => this.settingsManager.getSetting(key));
        electron_1.ipcMain.handle('settings:set', (_, key, value) => this.settingsManager.setSetting(key, value));
        electron_1.ipcMain.handle('settings:getSchoolSettings', () => this.settingsManager.getSchoolSettings());
        electron_1.ipcMain.handle('settings:updateSchoolSettings', (_, settings) => this.settingsManager.updateSchoolSettings(settings));
        // Database operations
        electron_1.ipcMain.handle('db:backup', async () => {
            const result = await electron_1.dialog.showSaveDialog(this.mainWindow, {
                title: 'Veritabanı Yedekle',
                defaultPath: `lesson-backup-${new Date().toISOString().split('T')[0]}.db`,
                filters: [{ name: 'Database Files', extensions: ['db'] }]
            });
            if (!result.canceled && result.filePath) {
                return this.dbManager.backup(result.filePath);
            }
            return false;
        });
        electron_1.ipcMain.handle('db:restore', async () => {
            const result = await electron_1.dialog.showOpenDialog(this.mainWindow, {
                title: 'Veritabanı Geri Yükle',
                filters: [{ name: 'Database Files', extensions: ['db'] }],
                properties: ['openFile']
            });
            if (!result.canceled && result.filePaths.length > 0) {
                return this.dbManager.restore(result.filePaths[0]);
            }
            return false;
        });
        // Get weekly hour limit based on current school type
        electron_1.ipcMain.handle('settings:getWeeklyHourLimit', () => this.dbManager.getWeeklyHourLimit());
        // Database cleanup
        electron_1.ipcMain.handle('db:cleanup', () => this.dbManager.cleanupDatabase());
        // Elective Tracker Management
        electron_1.ipcMain.handle('electiveTracker:updateStatus', (_, classId) => this.electiveTrackerManager.updateElectiveStatus(classId));
        electron_1.ipcMain.handle('electiveTracker:getStatusForClass', (_, classId) => this.electiveTrackerManager.getElectiveStatusForClass(classId));
        electron_1.ipcMain.handle('electiveTracker:getAllStatuses', () => this.electiveTrackerManager.getAllElectiveStatuses());
        electron_1.ipcMain.handle('electiveTracker:getIncompleteAssignments', () => this.electiveTrackerManager.getIncompleteAssignments());
        electron_1.ipcMain.handle('electiveTracker:getStatistics', () => this.electiveTrackerManager.getElectiveStatistics());
        electron_1.ipcMain.handle('electiveTracker:getCompletionPercentage', () => this.electiveTrackerManager.getCompletionPercentage());
        electron_1.ipcMain.handle('electiveTracker:getElectiveDistribution', () => this.electiveTrackerManager.getElectiveDistribution());
        electron_1.ipcMain.handle('electiveTracker:refreshAllStatuses', () => this.electiveTrackerManager.refreshAllElectiveStatuses());
        // Assignment Alert Management
        electron_1.ipcMain.handle('assignmentAlert:createAlert', (_, classId, type, message, severity) => this.assignmentAlertManager.createAlert(classId, type, message, severity));
        electron_1.ipcMain.handle('assignmentAlert:updateSeverity', (_, alertId, severity) => this.assignmentAlertManager.updateAlertSeverity(alertId, severity));
        electron_1.ipcMain.handle('assignmentAlert:resolveAlert', (_, alertId) => this.assignmentAlertManager.resolveAlert(alertId));
        electron_1.ipcMain.handle('assignmentAlert:getAlertsByClass', (_, classId) => this.assignmentAlertManager.getAlertsByClass(classId));
        electron_1.ipcMain.handle('assignmentAlert:getCriticalAlerts', () => this.assignmentAlertManager.getCriticalAlerts());
        electron_1.ipcMain.handle('assignmentAlert:getActiveAlerts', () => this.assignmentAlertManager.getActiveAlerts());
        electron_1.ipcMain.handle('assignmentAlert:getAlertsBySeverity', (_, severity) => this.assignmentAlertManager.getAlertsBySeverity(severity));
        electron_1.ipcMain.handle('assignmentAlert:getAlertsByType', (_, type) => this.assignmentAlertManager.getAlertsByType(type));
        electron_1.ipcMain.handle('assignmentAlert:cleanupResolvedAlerts', (_, olderThanDays) => this.assignmentAlertManager.cleanupResolvedAlerts(olderThanDays));
        electron_1.ipcMain.handle('assignmentAlert:getAlertStatistics', () => this.assignmentAlertManager.getAlertStatistics());
        electron_1.ipcMain.handle('assignmentAlert:resolveAllForClass', (_, classId) => this.assignmentAlertManager.resolveAllAlertsForClass(classId));
        electron_1.ipcMain.handle('assignmentAlert:bulkResolveAlerts', (_, alertIds) => this.assignmentAlertManager.bulkResolveAlerts(alertIds));
        electron_1.ipcMain.handle('assignmentAlert:generateAlertsForAllClasses', () => this.assignmentAlertManager.generateAlertsForAllClasses());
        // Suggestion Engine
        electron_1.ipcMain.handle('suggestionEngine:generateSuggestions', (_, classId, criteria) => this.suggestionEngine.generateSuggestions(classId, criteria));
        electron_1.ipcMain.handle('suggestionEngine:scoreSuggestion', (_, classId, lessonId, teacherId, criteria) => this.suggestionEngine.scoreSuggestion(classId, lessonId, teacherId, criteria));
        electron_1.ipcMain.handle('suggestionEngine:applySuggestion', (_, suggestionId) => this.suggestionEngine.applySuggestion(suggestionId));
        electron_1.ipcMain.handle('suggestionEngine:refreshCache', () => this.suggestionEngine.refreshSuggestionCache());
        electron_1.ipcMain.handle('suggestionEngine:getCachedSuggestions', (_, classId) => this.suggestionEngine.getCachedSuggestions(classId));
        // Initialize elective data on startup
        electron_1.ipcMain.handle('elective:initializeData', async () => {
            try {
                console.log('Initializing elective data...');
                await this.electiveTrackerManager.refreshAllElectiveStatuses();
                await this.assignmentAlertManager.generateAlertsForAllClasses();
                console.log('Elective data initialization completed');
                return true;
            }
            catch (error) {
                console.error('Error initializing elective data:', error);
                return false;
            }
        });
    }
    setupMenu() {
        const template = [
            {
                label: 'Dosya',
                submenu: [
                    {
                        label: 'Yeni Program',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => this.mainWindow?.webContents.send('menu:new-schedule')
                    },
                    {
                        label: 'Program Aç',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => this.mainWindow?.webContents.send('menu:open-schedule')
                    },
                    {
                        label: 'Kaydet',
                        accelerator: 'CmdOrCtrl+S',
                        click: () => this.mainWindow?.webContents.send('menu:save-schedule')
                    },
                    { type: 'separator' },
                    {
                        label: 'Veritabanı Yedekle',
                        click: () => this.mainWindow?.webContents.send('menu:backup-db')
                    },
                    {
                        label: 'Veritabanı Geri Yükle',
                        click: () => this.mainWindow?.webContents.send('menu:restore-db')
                    },
                    { type: 'separator' },
                    {
                        label: 'Çıkış',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => electron_1.app.quit()
                    }
                ]
            },
            {
                label: 'Düzenle',
                submenu: [
                    { label: 'Geri Al', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                    { label: 'Yinele', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
                    { type: 'separator' },
                    { label: 'Kes', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                    { label: 'Kopyala', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                    { label: 'Yapıştır', accelerator: 'CmdOrCtrl+V', role: 'paste' }
                ]
            },
            {
                label: 'Görünüm',
                submenu: [
                    { label: 'Yenile', accelerator: 'CmdOrCtrl+R', role: 'reload' },
                    { label: 'Geliştirici Araçları', accelerator: 'F12', role: 'toggleDevTools' },
                    { type: 'separator' },
                    { label: 'Tam Ekran', accelerator: 'F11', role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Yardım',
                submenu: [
                    {
                        label: 'Hakkında',
                        click: () => {
                            electron_1.dialog.showMessageBox(this.mainWindow, {
                                type: 'info',
                                title: 'Modern Ders Yönetim Sistemi Hakkında',
                                message: 'Modern Lesson Manager v1.0.0',
                                detail: 'MEB müfredatına uygun modern ders programı yönetim sistemi.'
                            });
                        }
                    }
                ]
            }
        ];
        const menu = electron_1.Menu.buildFromTemplate(template);
        electron_1.Menu.setApplicationMenu(menu);
    }
}
// Initialize the application
const lessonManager = new ModernLessonManager();
lessonManager.initialize().catch(console.error);
// Handle app events
electron_1.app.on('before-quit', () => {
    // Cleanup operations
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    electron_1.dialog.showErrorBox('Beklenmeyen Hata', error.message);
});
//# sourceMappingURL=main.js.map