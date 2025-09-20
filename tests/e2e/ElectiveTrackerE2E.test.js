/**
 * End-to-End Tests for Elective Tracker System
 * Tests complete workflows and integration between all components
 */

// Mock Electron before importing modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test'),
    isReady: jest.fn(() => true)
  }
}));

const { DatabaseManager } = require('../../src/database/DatabaseManager');
const { ElectiveTrackerManager } = require('../../src/managers/ElectiveTrackerManager');
const { AssignmentAlertManager } = require('../../src/managers/AssignmentAlertManager');
const { SuggestionEngine } = require('../../src/managers/SuggestionEngine');

describe('Elective Tracker System - End-to-End Tests', () => {
  let dbManager;
  let electiveTracker;
  let alertManager;
  let suggestionEngine;
  let testClassId;
  let testTeacherId;
  let testLessonId;

  beforeAll(async () => {
    // Mock Electron app for testing
    global.app = {
      getPath: jest.fn(() => '/tmp/test'),
      isReady: jest.fn(() => true)
    };
    
    // Initialize test database
    dbManager = new DatabaseManager(':memory:');
    await dbManager.initialize();
    
    // Initialize managers
    electiveTracker = new ElectiveTrackerManager(dbManager);
    alertManager = new AssignmentAlertManager(dbManager);
    suggestionEngine = new SuggestionEngine(dbManager);
    
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    if (dbManager) {
      await dbManager.close();
    }
  });

  beforeEach(async () => {
    // Clean up alerts and suggestions before each test
    await dbManager.runSQL('DELETE FROM assignment_alerts');
    await dbManager.runSQL('DELETE FROM elective_suggestions');
    await dbManager.runSQL('DELETE FROM elective_assignment_status');
  });

  async function setupTestData() {
    // Create test class
    const classResult = await dbManager.runSQL(
      'INSERT INTO classes (school_type, grade, section) VALUES (?, ?, ?)',
      ['ortaokul', 8, 'A']
    );
    testClassId = classResult.lastID;

    // Create test teacher
    const teacherResult = await dbManager.runSQL(
      'INSERT INTO teachers (name, email, phone) VALUES (?, ?, ?)',
      ['Test Teacher', 'test@example.com', '1234567890']
    );
    testTeacherId = teacherResult.lastID;

    // Create test lesson
    const lessonResult = await dbManager.runSQL(
      'INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type) VALUES (?, ?, ?, ?, ?)',
      ['Test Elective', 8, 2, 0, 'ortaokul']
    );
    testLessonId = lessonResult.lastID;
  }

  describe('Complete Elective Assignment Workflow', () => {
    test('should handle complete assignment workflow from empty to full', async () => {
      // Step 1: Initial state - no assignments
      let status = await electiveTracker.getElectiveStatusForClass(testClassId);
      expect(status.assigned_electives).toBe(0);
      expect(status.missing_electives).toBe(3);
      expect(status.status).toBe('incomplete');

      // Step 2: Check that alerts are generated for incomplete assignments
      await electiveTracker.updateElectiveStatus(testClassId);
      const alerts = await alertManager.getAlertsByClass(testClassId);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].alert_type).toBe('missing_electives');

      // Step 3: Add first elective assignment
      await dbManager.runSQL(
        'INSERT INTO teacher_assignments (teacher_id, class_id, lesson_id) VALUES (?, ?, ?)',
        [testTeacherId, testClassId, testLessonId]
      );
      
      await electiveTracker.updateElectiveStatus(testClassId);
      status = await electiveTracker.getElectiveStatusForClass(testClassId);
      expect(status.assigned_electives).toBe(1);
      expect(status.missing_electives).toBe(2);

      // Step 4: Add second elective
      const lesson2Result = await dbManager.runSQL(
        'INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type) VALUES (?, ?, ?, ?, ?)',
        ['Second Elective', 8, 2, 0, 'ortaokul']
      );
      await dbManager.runSQL(
        'INSERT INTO teacher_assignments (teacher_id, class_id, lesson_id) VALUES (?, ?, ?)',
        [testTeacherId, testClassId, lesson2Result.lastID]
      );
      
      await electiveTracker.updateElectiveStatus(testClassId);
      status = await electiveTracker.getElectiveStatusForClass(testClassId);
      expect(status.assigned_electives).toBe(2);
      expect(status.missing_electives).toBe(1);

      // Step 5: Complete all assignments
      const lesson3Result = await dbManager.runSQL(
        'INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type) VALUES (?, ?, ?, ?, ?)',
        ['Third Elective', 8, 2, 0, 'ortaokul']
      );
      await dbManager.runSQL(
        'INSERT INTO teacher_assignments (teacher_id, class_id, lesson_id) VALUES (?, ?, ?)',
        [testTeacherId, testClassId, lesson3Result.lastID]
      );
      
      await electiveTracker.updateElectiveStatus(testClassId);
      status = await electiveTracker.getElectiveStatusForClass(testClassId);
      expect(status.assigned_electives).toBe(3);
      expect(status.missing_electives).toBe(0);
      expect(status.status).toBe('complete');

      // Step 6: Verify alerts are resolved
      const finalAlerts = await alertManager.getAlertsByClass(testClassId);
      const unresolvedAlerts = finalAlerts.filter(alert => !alert.is_resolved);
      expect(unresolvedAlerts.length).toBe(0);
    });

    test('should handle over-assignment scenario', async () => {
      // Create 4 elective assignments (over the limit of 3)
      for (let i = 1; i <= 4; i++) {
        const lessonResult = await dbManager.runSQL(
          'INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type) VALUES (?, ?, ?, ?, ?)',
          [`Elective ${i}`, 8, 2, 0, 'ortaokul']
        );
        await dbManager.runSQL(
          'INSERT INTO teacher_assignments (teacher_id, class_id, lesson_id) VALUES (?, ?, ?)',
          [testTeacherId, testClassId, lessonResult.lastID]
        );
      }

      await electiveTracker.updateElectiveStatus(testClassId);
      const status = await electiveTracker.getElectiveStatusForClass(testClassId);
      
      expect(status.assigned_electives).toBe(4);
      expect(status.status).toBe('over_assigned');

      // Check that over-assignment alert is created
      const alerts = await alertManager.getAlertsByClass(testClassId);
      const overAssignmentAlert = alerts.find(alert => alert.alert_type === 'over_assignment');
      expect(overAssignmentAlert).toBeDefined();
      expect(overAssignmentAlert.severity).toBe('warning');
    });
  });

  describe('Suggestion Engine Integration', () => {
    test('should generate and apply suggestions successfully', async () => {
      // Create additional teachers and lessons for suggestions
      const teacher2Result = await dbManager.runSQL(
        'INSERT INTO teachers (name, email, phone) VALUES (?, ?, ?)',
        ['Teacher 2', 'teacher2@example.com', '0987654321']
      );
      
      const lesson2Result = await dbManager.runSQL(
        'INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type) VALUES (?, ?, ?, ?, ?)',
        ['Art', 8, 2, 0, 'ortaokul']
      );

      // Generate suggestions for incomplete class
      const suggestions = await suggestionEngine.generateSuggestions(testClassId);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].class_id).toBe(testClassId);
      expect(suggestions[0].suggestion_score).toBeGreaterThan(0);

      // Apply the best suggestion
      const bestSuggestion = suggestions[0];
      const applied = await suggestionEngine.applySuggestion(bestSuggestion.id);
      expect(applied).toBe(true);

      // Verify the assignment was created
      const assignments = await dbManager.getAll(
        'SELECT * FROM teacher_assignments WHERE class_id = ? AND lesson_id = ? AND teacher_id = ?',
        [testClassId, bestSuggestion.lesson_id, bestSuggestion.teacher_id]
      );
      expect(assignments.length).toBe(1);

      // Verify status was updated
      await electiveTracker.updateElectiveStatus(testClassId);
      const status = await electiveTracker.getElectiveStatusForClass(testClassId);
      expect(status.assigned_electives).toBe(1);
    });

    test('should handle suggestion conflicts and scoring', async () => {
      // Create conflicting schedule scenario
      const conflictingTeacher = await dbManager.runSQL(
        'INSERT INTO teachers (name, email, phone) VALUES (?, ?, ?)',
        ['Busy Teacher', 'busy@example.com', '1111111111']
      );

      // Add multiple assignments to make teacher busy
      for (let i = 1; i <= 5; i++) {
        const classResult = await dbManager.runSQL(
          'INSERT INTO classes (school_type, grade, section) VALUES (?, ?, ?)',
          ['ortaokul', 8, 'B']
        );
        await dbManager.runSQL(
          'INSERT INTO teacher_assignments (teacher_id, class_id, lesson_id) VALUES (?, ?, ?)',
          [conflictingTeacher.lastID, classResult.lastID, testLessonId]
        );
      }

      const suggestions = await suggestionEngine.generateSuggestions(testClassId);
      
      // Verify that busy teacher gets lower score
      const busyTeacherSuggestion = suggestions.find(s => s.teacher_id === conflictingTeacher.lastID);
      const normalTeacherSuggestion = suggestions.find(s => s.teacher_id === testTeacherId);
      
      if (busyTeacherSuggestion && normalTeacherSuggestion) {
        expect(normalTeacherSuggestion.suggestion_score).toBeGreaterThan(busyTeacherSuggestion.suggestion_score);
      }
    });
  });

  describe('Alert System Integration', () => {
    test('should create, update, and resolve alerts throughout workflow', async () => {
      // Initial state should create missing electives alert
      await electiveTracker.updateElectiveStatus(testClassId);
      let alerts = await alertManager.getAlertsByClass(testClassId);
      expect(alerts.length).toBe(1);
      expect(alerts[0].alert_type).toBe('missing_electives');
      expect(alerts[0].severity).toBe('warning');

      // Add critical alert for high number of missing assignments
      await alertManager.createAlert(testClassId, 'missing_electives', 'Critical: 3 electives missing', 'critical');
      alerts = await alertManager.getCriticalAlerts();
      expect(alerts.length).toBe(1);

      // Resolve alert manually
      const alertId = alerts[0].id;
      const resolved = await alertManager.resolveAlert(alertId);
      expect(resolved).toBe(true);

      // Verify alert is marked as resolved
      const resolvedAlert = await dbManager.getOne(
        'SELECT * FROM assignment_alerts WHERE id = ?',
        [alertId]
      );
      expect(resolvedAlert.is_resolved).toBe(1);
      expect(resolvedAlert.resolved_at).toBeTruthy();
    });

    test('should handle alert cleanup and maintenance', async () => {
      // Create multiple alerts
      for (let i = 0; i < 5; i++) {
        await alertManager.createAlert(testClassId, 'missing_electives', `Alert ${i}`, 'info');
      }

      // Resolve some alerts
      const alerts = await alertManager.getAlertsByClass(testClassId);
      for (let i = 0; i < 3; i++) {
        await alertManager.resolveAlert(alerts[i].id);
      }

      // Clean up resolved alerts
      const cleanedCount = await alertManager.cleanupResolvedAlerts();
      expect(cleanedCount).toBe(3);

      // Verify only unresolved alerts remain
      const remainingAlerts = await alertManager.getAlertsByClass(testClassId);
      expect(remainingAlerts.length).toBe(2);
      remainingAlerts.forEach(alert => {
        expect(alert.is_resolved).toBe(0);
      });
    });
  });

  describe('Statistics and Reporting Integration', () => {
    test('should calculate accurate statistics across multiple classes', async () => {
      // Create multiple test classes with different completion states
      const classes = [];
      for (let i = 0; i < 5; i++) {
        const classResult = await dbManager.runSQL(
          'INSERT INTO classes (school_type, grade, section) VALUES (?, ?, ?)',
          ['ortaokul', 8, String.fromCharCode(65 + i)]
        );
        classes.push(classResult.lastID);
      }

      // Assign different numbers of electives to each class
      const assignments = [0, 1, 2, 3, 4]; // 0, 1, 2, 3, 4 electives respectively
      
      for (let i = 0; i < classes.length; i++) {
        for (let j = 0; j < assignments[i]; j++) {
          const lessonResult = await dbManager.runSQL(
            'INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type) VALUES (?, ?, ?, ?, ?)',
            [`Lesson ${i}-${j}`, 8, 2, 0, 'ortaokul']
          );
          await dbManager.runSQL(
            'INSERT INTO teacher_assignments (teacher_id, class_id, lesson_id) VALUES (?, ?, ?)',
            [testTeacherId, classes[i], lessonResult.lastID]
          );
        }
        await electiveTracker.updateElectiveStatus(classes[i]);
      }

      // Test overall statistics
      const stats = await electiveTracker.getElectiveStatistics();
      expect(stats.total_classes).toBe(6); // 5 new + 1 original test class
      expect(stats.complete_classes).toBe(1); // Only one class has exactly 3 electives
      expect(stats.incomplete_classes).toBe(4); // Classes with 0, 1, 2 electives
      expect(stats.over_assigned_classes).toBe(1); // Class with 4 electives

      // Test completion percentage
      const completionPercentage = await electiveTracker.getCompletionPercentage();
      expect(completionPercentage).toBeCloseTo(16.67, 1); // 1/6 * 100

      // Test elective distribution
      const distribution = await electiveTracker.getElectiveDistribution();
      expect(distribution.length).toBeGreaterThan(0);
      
      const totalAssignments = distribution.reduce((sum, item) => sum + item.count, 0);
      expect(totalAssignments).toBe(10); // 0+1+2+3+4 = 10 total assignments
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 classes
      const classIds = [];
      for (let i = 0; i < 100; i++) {
        const result = await dbManager.runSQL(
          'INSERT INTO classes (school_type, grade, section) VALUES (?, ?, ?)',
          ['ortaokul', 8, 'A']
        );
        classIds.push(result.lastID);
      }

      // Update status for all classes
      for (const classId of classIds) {
        await electiveTracker.updateElectiveStatus(classId);
      }

      // Get all statuses
      const allStatuses = await electiveTracker.getAllElectiveStatuses();
      expect(allStatuses.length).toBeGreaterThanOrEqual(100);

      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds)
      expect(executionTime).toBeLessThan(5000);
    });

    test('should handle concurrent operations safely', async () => {
      // Simulate concurrent status updates
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(electiveTracker.updateElectiveStatus(testClassId));
      }

      // All operations should complete without errors
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // Final state should be consistent
      const finalStatus = await electiveTracker.getElectiveStatusForClass(testClassId);
      expect(finalStatus).toBeDefined();
      expect(typeof finalStatus.assigned_electives).toBe('number');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('should handle database connection issues gracefully', async () => {
      // Simulate database error by closing connection temporarily
      const originalRun = dbManager.runSQL;
      dbManager.runSQL = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      try {
        await electiveTracker.updateElectiveStatus(testClassId);
      } catch (error) {
        expect(error.message).toContain('Database connection lost');
      }

      // Restore connection
      dbManager.runSQL = originalRun;

      // Should work normally after restoration
      const status = await electiveTracker.getElectiveStatusForClass(testClassId);
      expect(status).toBeDefined();
    });

    test('should handle invalid data gracefully', async () => {
      // Test with non-existent class ID
      const invalidStatus = await electiveTracker.getElectiveStatusForClass(99999);
      expect(invalidStatus).toBeNull();

      // Test with invalid suggestion application
      const invalidApplication = await suggestionEngine.applySuggestion(99999);
      expect(invalidApplication).toBe(false);

      // Test with invalid alert resolution
      const invalidResolution = await alertManager.resolveAlert(99999);
      expect(invalidResolution).toBe(false);
    });
  });
});