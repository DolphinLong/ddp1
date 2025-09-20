import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { DatabaseManager } from './database/DatabaseManager';
import { ScheduleManager } from './managers/ScheduleManager';
import { TeacherManager } from './managers/TeacherManager';
import { ClassManager } from './managers/ClassManager';
import { LessonManager } from './managers/LessonManager';
import { SettingsManager } from './managers/SettingsManager';
import { ElectiveTrackerManager } from './managers/ElectiveTrackerManager';
import { AssignmentAlertManager } from './managers/AssignmentAlertManager';
import { SuggestionEngine } from './managers/SuggestionEngine';
import { runCurriculumFix } from './scripts/fix-8th-grade-curriculum';

class ModernLessonManager {
  private mainWindow: BrowserWindow | null = null;
  private dbManager: DatabaseManager;
  private scheduleManager: ScheduleManager;
  private teacherManager: TeacherManager;
  private classManager: ClassManager;
  private lessonManager: LessonManager;
  private settingsManager: SettingsManager;
  private electiveTrackerManager: ElectiveTrackerManager;
  private assignmentAlertManager: AssignmentAlertManager;
  private suggestionEngine: SuggestionEngine;

  constructor() {
    // Initialize with default school type, will be updated based on settings
    this.dbManager = new DatabaseManager();
    this.scheduleManager = new ScheduleManager(this.dbManager);
    this.teacherManager = new TeacherManager(this.dbManager);
    this.classManager = new ClassManager(this.dbManager);
    this.lessonManager = new LessonManager(this.dbManager);
    this.settingsManager = new SettingsManager(this.dbManager);
    this.electiveTrackerManager = new ElectiveTrackerManager(this.dbManager);
    this.assignmentAlertManager = new AssignmentAlertManager(this.dbManager);
    this.suggestionEngine = new SuggestionEngine(this.dbManager);
  }

  async initialize() {
    await app.whenReady();
    
    // Initialize database with the correct school type from settings
    await this.initializeDatabaseWithSchoolType();
    
    this.createWindow();
    this.setupIPC();
    this.setupMenu();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private async initializeDatabaseWithSchoolType() {
    try {
      // First initialize with default database
      await this.dbManager.initialize();
      
      // Then try to get school type from settings and switch if needed
      let schoolType = await this.settingsManager.getSetting('school_type');
      if (schoolType) {
        await this.dbManager.switchDatabase(schoolType);
      } else {
        // Persist default to Ortaokul if not set, to avoid logic mismatches
        await this.settingsManager.setSetting('school_type', 'Ortaokul');
        await this.dbManager.switchDatabase('Ortaokul');
        schoolType = 'Ortaokul';
      }
      
      // Apply curriculum fixes for ortaokul
      const currentSchoolType = this.dbManager.getCurrentSchoolType();
      if (currentSchoolType === 'Ortaokul') {
        console.log('Running curriculum fix for Ortaokul...');
        await runCurriculumFix(this.dbManager);
      }
      
    } catch (error) {
      console.error('Error initializing database with school type:', error);
      // Fallback to default initialization
      try {
        await this.dbManager.initialize();
      } catch (fallbackError) {
        console.error('Error during fallback initialization:', fallbackError);
      }
    }
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
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

  private setupIPC() {
    // Teacher management
    ipcMain.handle('teacher:getAll', () => this.teacherManager.getAll());
    ipcMain.handle('teacher:create', (_, data) => this.teacherManager.create(data));
    ipcMain.handle('teacher:update', (_, id, data) => this.teacherManager.update(id, data));
    ipcMain.handle('teacher:delete', (_, id) => this.teacherManager.delete(id));
    ipcMain.handle('teacher:getById', (_, id) => this.teacherManager.getById(id));
    ipcMain.handle('teacher:getAvailability', (_, id) => this.teacherManager.getAvailability(id));
    ipcMain.handle('teacher:setAvailability', (_, id, availability) => 
      this.teacherManager.setAvailability(id, availability));
    ipcMain.handle('teacher:getLessons', (_, teacherId) => this.teacherManager.getTeacherLessons(teacherId));
    ipcMain.handle('teacher:assignToLessonAndClass', (_, teacherId, lessonId, classId) => 
      this.teacherManager.assignTeacherToLessonAndClass(teacherId, lessonId, classId));
    ipcMain.handle('teacher:getAssignments', (_, teacherId) => this.teacherManager.getTeacherAssignments(teacherId));
    ipcMain.handle('teacher:removeAssignment', (_, teacherId, lessonId, classId) => 
      this.teacherManager.removeTeacherAssignment(teacherId, lessonId, classId));
    ipcMain.handle('teacher:getTotalAssignedHours', (_, teacherId) => 
      this.teacherManager.getTotalAssignedHours(teacherId));

    // Class management
    ipcMain.handle('class:getAll', () => this.classManager.getAll());
    ipcMain.handle('class:getById', (_, id) => this.classManager.getById(id));
    ipcMain.handle('class:getByGrade', (_, grade) => this.classManager.getByGrade(grade));
    ipcMain.handle('class:getAllWithGuidanceCounselors', () => this.classManager.getAllWithGuidanceCounselors());
    ipcMain.handle('class:create', (_, data) => this.classManager.create(data));
    ipcMain.handle('class:update', (_, id, data) => this.classManager.update(id, data));
    ipcMain.handle('class:delete', (_, id) => this.classManager.delete(id));
    ipcMain.handle('class:assignGuidanceCounselor', (_, teacherId, classId) => 
      this.classManager.assignGuidanceCounselor(teacherId, classId));
    ipcMain.handle('class:removeGuidanceCounselor', (_, classId) => 
      this.classManager.removeGuidanceCounselor(classId));
    ipcMain.handle('class:getGuidanceCounselorByClass', (_, classId) => 
      this.dbManager.getGuidanceCounselorByClass(classId));
    ipcMain.handle('class:getClassLessons', () => this.classManager.getClassLessons());
    ipcMain.handle('class:getClassLessonsByGrade', (_, grade) => this.classManager.getClassLessonsByGrade(grade));
    ipcMain.handle('class:getAssignedTeachersForClass', (_, classId) => this.classManager.getAssignedTeachersForClass(classId));
    ipcMain.handle('class:getAllClassesForTeacherAssignment', () => this.classManager.getAllClassesForTeacherAssignment());
    ipcMain.handle('class:getAllOrtaokulLessonsForTeacherAssignment', () => this.classManager.getAllOrtaokulLessonsForTeacherAssignment());

    // Lesson management
    ipcMain.handle('lesson:getAll', () => this.lessonManager.getAll());
    ipcMain.handle('lesson:getById', (_, id) => this.lessonManager.getById(id));
    ipcMain.handle('lesson:getByGrade', (_, grade) => this.lessonManager.getByGrade(grade));
    ipcMain.handle('lesson:create', (_, data) => this.lessonManager.create(data));
    ipcMain.handle('lesson:update', (_, id, data) => this.lessonManager.update(id, data));
    ipcMain.handle('lesson:delete', (_, id) => this.lessonManager.delete(id));
    
    // Elective lesson availability management
    ipcMain.handle('lesson:getAvailableElectives', (_, grade) => this.lessonManager.getAvailableElectiveLessons(grade));
    ipcMain.handle('lesson:getAssignedElectives', (_, grade) => this.lessonManager.getAssignedElectiveLessons(grade));
    ipcMain.handle('lesson:isElectiveAvailable', (_, lessonId, grade) => this.lessonManager.isElectiveLessonAvailable(lessonId, grade));
    ipcMain.handle('lesson:getAvailableElectivesForClass', (_, classId) => this.lessonManager.getAvailableElectiveLessonsForClass(classId));
    ipcMain.handle('lesson:getElectivesWithStatus', (_, grade) => this.lessonManager.getElectiveLessonsWithStatus(grade));

    // Schedule management
    ipcMain.handle('schedule:generate', (_, config) => this.scheduleManager.generateSchedule(config));
    ipcMain.handle('schedule:getForClass', (_, classId) => this.scheduleManager.getClassSchedule(classId));
    ipcMain.handle('schedule:getForTeacher', (_, teacherId) => this.scheduleManager.getTeacherSchedule(teacherId));
    ipcMain.handle('schedule:detectConflicts', () => this.scheduleManager.detectConflicts());
    ipcMain.handle('schedule:save', (_, scheduleData) => this.scheduleManager.saveSchedule(scheduleData));

    // Settings management
    ipcMain.handle('settings:getAll', () => this.settingsManager.getAllSettings());
    ipcMain.handle('settings:get', (_, key) => this.settingsManager.getSetting(key));
    ipcMain.handle('settings:set', (_, key, value) => this.settingsManager.setSetting(key, value));
    ipcMain.handle('settings:getSchoolSettings', () => this.settingsManager.getSchoolSettings());
    ipcMain.handle('settings:updateSchoolSettings', (_, settings) => this.settingsManager.updateSchoolSettings(settings));

    // Database operations
    ipcMain.handle('db:backup', async () => {
      const result = await dialog.showSaveDialog(this.mainWindow!, {
        title: 'Veritabanı Yedekle',
        defaultPath: `lesson-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [{ name: 'Database Files', extensions: ['db'] }]
      });
      
      if (!result.canceled && result.filePath) {
        return this.dbManager.backup(result.filePath);
      }
      return false;
    });

    ipcMain.handle('db:restore', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
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
    ipcMain.handle('settings:getWeeklyHourLimit', () => this.dbManager.getWeeklyHourLimit());
    
    // Database cleanup
    ipcMain.handle('db:cleanup', () => this.dbManager.cleanupDatabase());

    // Elective Tracker Management
    ipcMain.handle('electiveTracker:updateStatus', (_, classId) => 
      this.electiveTrackerManager.updateElectiveStatus(classId));
    ipcMain.handle('electiveTracker:getStatusForClass', (_, classId) => 
      this.electiveTrackerManager.getElectiveStatusForClass(classId));
    ipcMain.handle('electiveTracker:getAllStatuses', () => 
      this.electiveTrackerManager.getAllElectiveStatuses());
    ipcMain.handle('electiveTracker:getIncompleteAssignments', () => 
      this.electiveTrackerManager.getIncompleteAssignments());
    ipcMain.handle('electiveTracker:getStatistics', () => 
      this.electiveTrackerManager.getElectiveStatistics());
    ipcMain.handle('electiveTracker:getCompletionPercentage', () => 
      this.electiveTrackerManager.getCompletionPercentage());
    ipcMain.handle('electiveTracker:getElectiveDistribution', () => 
      this.electiveTrackerManager.getElectiveDistribution());
    ipcMain.handle('electiveTracker:refreshAllStatuses', () => 
      this.electiveTrackerManager.refreshAllElectiveStatuses());

    // Assignment Alert Management
    ipcMain.handle('assignmentAlert:createAlert', (_, classId, type, message, severity) => 
      this.assignmentAlertManager.createAlert(classId, type, message, severity));
    ipcMain.handle('assignmentAlert:updateSeverity', (_, alertId, severity) => 
      this.assignmentAlertManager.updateAlertSeverity(alertId, severity));
    ipcMain.handle('assignmentAlert:resolveAlert', (_, alertId) => 
      this.assignmentAlertManager.resolveAlert(alertId));
    ipcMain.handle('assignmentAlert:getAlertsByClass', (_, classId) => 
      this.assignmentAlertManager.getAlertsByClass(classId));
    ipcMain.handle('assignmentAlert:getCriticalAlerts', () => 
      this.assignmentAlertManager.getCriticalAlerts());
    ipcMain.handle('assignmentAlert:getActiveAlerts', () => 
      this.assignmentAlertManager.getActiveAlerts());
    ipcMain.handle('assignmentAlert:getAlertsBySeverity', (_, severity) => 
      this.assignmentAlertManager.getAlertsBySeverity(severity));
    ipcMain.handle('assignmentAlert:getAlertsByType', (_, type) => 
      this.assignmentAlertManager.getAlertsByType(type));
    ipcMain.handle('assignmentAlert:cleanupResolvedAlerts', (_, olderThanDays) => 
      this.assignmentAlertManager.cleanupResolvedAlerts(olderThanDays));
    ipcMain.handle('assignmentAlert:getAlertStatistics', () => 
      this.assignmentAlertManager.getAlertStatistics());
    ipcMain.handle('assignmentAlert:resolveAllForClass', (_, classId) => 
      this.assignmentAlertManager.resolveAllAlertsForClass(classId));
    ipcMain.handle('assignmentAlert:bulkResolveAlerts', (_, alertIds) => 
      this.assignmentAlertManager.bulkResolveAlerts(alertIds));
    ipcMain.handle('assignmentAlert:generateAlertsForAllClasses', () => 
      this.assignmentAlertManager.generateAlertsForAllClasses());

    // Suggestion Engine
    ipcMain.handle('suggestionEngine:generateSuggestions', (_, classId, criteria) => 
      this.suggestionEngine.generateSuggestions(classId, criteria));
    ipcMain.handle('suggestionEngine:scoreSuggestion', (_, classId, lessonId, teacherId, criteria) => 
      this.suggestionEngine.scoreSuggestion(classId, lessonId, teacherId, criteria));
    ipcMain.handle('suggestionEngine:applySuggestion', (_, suggestionId) => 
      this.suggestionEngine.applySuggestion(suggestionId));
    ipcMain.handle('suggestionEngine:refreshCache', () => 
      this.suggestionEngine.refreshSuggestionCache());
    ipcMain.handle('suggestionEngine:getCachedSuggestions', (_, classId) => 
      this.suggestionEngine.getCachedSuggestions(classId));

    // Initialize elective data on startup
    ipcMain.handle('elective:initializeData', async () => {
      try {
        console.log('Initializing elective data...');
        await this.electiveTrackerManager.refreshAllElectiveStatuses();
        await this.assignmentAlertManager.generateAlertsForAllClasses();
        console.log('Elective data initialization completed');
        return true;
      } catch (error) {
        console.error('Error initializing elective data:', error);
        return false;
      }
    });
  }

  private setupMenu() {
    const template: any[] = [
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
            click: () => app.quit()
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
              dialog.showMessageBox(this.mainWindow!, {
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

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// Initialize the application
const lessonManager = new ModernLessonManager();
lessonManager.initialize().catch(console.error);

// Handle app events
app.on('before-quit', () => {
  // Cleanup operations
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Beklenmeyen Hata', error.message);
});