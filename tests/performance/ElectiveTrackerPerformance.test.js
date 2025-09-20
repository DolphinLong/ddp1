/**
 * Performance Tests for Elective Tracker System
 * Tests system performance under various load conditions
 */

const { DatabaseManager } = require('../../src/database/DatabaseManager');
const { ElectiveTrackerManager } = require('../../src/managers/ElectiveTrackerManager');
const { AssignmentAlertManager } = require('../../src/managers/AssignmentAlertManager');
const { SuggestionEngine } = require('../../src/managers/SuggestionEngine');

describe('Elective Tracker Performance Tests', () => {
  jest.setTimeout(60000); // Set a higher timeout for the entire test suite
  let dbManager;
  let electiveTracker;
  let alertManager;
  let suggestionEngine;

  beforeAll(async () => {
    dbManager = new DatabaseManager(':memory:');
    await dbManager.initialize();
    
    electiveTracker = new ElectiveTrackerManager(dbManager);
    alertManager = new AssignmentAlertManager(dbManager);
    suggestionEngine = new SuggestionEngine(dbManager);
  });

  afterAll(async () => {
    if (dbManager) {
      await dbManager.close();
    }
  });

  describe('Database Performance', () => {
    test('should handle bulk data insertion efficiently', async () => {
      jest.setTimeout(60000);
      const startTime = performance.now();
      
      // Insert 1000 classes
      const classInserts = [];
      for (let i = 0; i < 1000; i++) {
        classInserts.push(
          dbManager.run(
            'INSERT INTO classes (name, grade, section) VALUES (?, ?, ?)',
            [`Performance Class ${i}`, 8, 'A']
          )
        );
      }
      
      await Promise.all(classInserts);
      
      const endTime = performance.now();
      const insertTime = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(insertTime).toBeLessThan(5000);
      
      // Verify all records were inserted
      const count = await dbManager.get('SELECT COUNT(*) as count FROM classes');
      expect(count.count).toBeGreaterThanOrEqual(1000);
    });

    test('should perform complex queries efficiently', async () => {
      // Setup test data
      await setupPerformanceTestData();
      
      const startTime = performance.now();
      
      // Complex query with joins
      const result = await dbManager.all(`
        SELECT 
          c.id,
          c.name,
          c.grade,
          COUNT(ta.id) as assignment_count,
          GROUP_CONCAT(l.name) as lesson_names
        FROM classes c
        LEFT JOIN teacher_assignments ta ON c.id = ta.class_id
        LEFT JOIN lessons l ON ta.lesson_id = l.id AND l.type = 'elective'
        GROUP BY c.id, c.name, c.grade
        HAVING assignment_count < 3
        ORDER BY assignment_count ASC, c.name ASC
      `);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      // Should complete within 1 second
      expect(queryTime).toBeLessThan(1000);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle concurrent database operations', async () => {
      const concurrentOperations = [];
      const operationCount = 50;
      
      const startTime = performance.now();
      
      // Create concurrent read and write operations
      for (let i = 0; i < operationCount; i++) {
        if (i % 2 === 0) {
          // Read operation
          concurrentOperations.push(
            electiveTracker.getAllElectiveStatuses()
          );
        } else {
          // Write operation
          concurrentOperations.push(
            dbManager.run(
              'INSERT INTO assignment_alerts (class_id, alert_type, message) VALUES (?, ?, ?)',
              [1, 'test', `Concurrent alert ${i}`]
            )
          );
        }
      }
      
      const results = await Promise.all(concurrentOperations);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete within 3 seconds
      expect(totalTime).toBeLessThan(3000);
      expect(results.length).toBe(operationCount);
    });
  });

  describe('Algorithm Performance', () => {
    test('should generate suggestions efficiently for large datasets', async () => {
      jest.setTimeout(60000);
      // Create large dataset
      const classIds = await createLargeTestDataset(500);
      
      const startTime = performance.now();
      
      // Generate suggestions for multiple classes
      const suggestionPromises = classIds.slice(0, 10).map(classId => 
        suggestionEngine.generateSuggestions(classId)
      );
      
      const allSuggestions = await Promise.all(suggestionPromises);
      
      const endTime = performance.now();
      const generationTime = endTime - startTime;
      
      // Should complete within 2 seconds
      expect(generationTime).toBeLessThan(2000);
      expect(allSuggestions.length).toBe(10);
      
      // Verify suggestions quality
      allSuggestions.forEach(suggestions => {
        expect(suggestions.length).toBeGreaterThan(0);
        suggestions.forEach(suggestion => {
          expect(suggestion.suggestion_score).toBeGreaterThan(0);
        });
      });
    });

    test('should calculate statistics efficiently', async () => {
      const startTime = performance.now();
      
      // Calculate comprehensive statistics
      const [
        statistics,
        completionPercentage,
        distribution,
        incompleteAssignments
      ] = await Promise.all([
        electiveTracker.getElectiveStatistics(),
        electiveTracker.getCompletionPercentage(),
        electiveTracker.getElectiveDistribution(),
        electiveTracker.getIncompleteAssignments()
      ]);
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      // Should complete within 1 second
      expect(calculationTime).toBeLessThan(1000);
      
      expect(statistics).toBeDefined();
      expect(typeof completionPercentage).toBe('number');
      expect(Array.isArray(distribution)).toBe(true);
      expect(Array.isArray(incompleteAssignments)).toBe(true);
    });

    test('should handle workload calculation efficiently', async () => {
      // Create teachers with varying workloads
      const teacherIds = [];
      for (let i = 0; i < 50; i++) {
        const result = await dbManager.run(
          'INSERT INTO teachers (name, email, phone) VALUES (?, ?, ?)',
          [`Perf Teacher ${i}`, `teacher${i}@test.com`, `123456789${i}`]
        );
        teacherIds.push(result.lastID);
      }
      
      const startTime = performance.now();
      
      // Calculate workload for all teachers
      const workloadPromises = teacherIds.map(async (teacherId) => {
        const assignments = await dbManager.all(
          'SELECT COUNT(*) as count FROM teacher_assignments WHERE teacher_id = ?',
          [teacherId]
        );
        return { teacherId, workload: assignments[0].count };
      });
      
      const workloads = await Promise.all(workloadPromises);
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      // Should complete within 1 second
      expect(calculationTime).toBeLessThan(1000);
      expect(workloads.length).toBe(50);
    });
  });

  describe('Memory Performance', () => {
    test('should manage memory efficiently during large operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const largeDataOperations = [];
      
      for (let i = 0; i < 100; i++) {
        largeDataOperations.push(
          electiveTracker.getAllElectiveStatuses()
        );
      }
      
      await Promise.all(largeDataOperations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('should handle memory cleanup properly', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create large temporary data structures
      let largeData = [];
      for (let i = 0; i < 10000; i++) {
        largeData.push({
          id: i,
          data: new Array(1000).fill(`data-${i}`),
          timestamp: new Date()
        });
      }
      
      // Process the data
      const processedData = largeData.filter(item => item.id % 2 === 0);
      expect(processedData.length).toBe(5000);
      
      // Clear references
      largeData = null;
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryDifference = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory should not increase significantly after cleanup
      expect(memoryDifference).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Frontend Performance Simulation', () => {
    test('should handle DOM manipulation efficiently', () => {
      // Mock DOM operations
      const mockElements = [];
      const startTime = performance.now();
      
      // Simulate creating 1000 table rows
      for (let i = 0; i < 1000; i++) {
        const mockRow = {
          id: `row-${i}`,
          innerHTML: `<td>Class ${i}</td><td>Status</td><td>Actions</td>`,
          classList: {
            add: jest.fn(),
            remove: jest.fn()
          },
          addEventListener: jest.fn()
        };
        mockElements.push(mockRow);
      }
      
      // Simulate filtering operations
      const filteredElements = mockElements.filter((_, index) => index % 2 === 0);
      
      const endTime = performance.now();
      const manipulationTime = endTime - startTime;
      
      // Should complete within 100ms
      expect(manipulationTime).toBeLessThan(100);
      expect(filteredElements.length).toBe(500);
    });

    test('should handle event listener management efficiently', () => {
      const mockElements = [];
      const eventHandlers = [];
      
      const startTime = performance.now();
      
      // Create elements with event listeners
      for (let i = 0; i < 1000; i++) {
        const handler = jest.fn();
        const element = {
          id: `element-${i}`,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        };
        
        element.addEventListener('click', handler);
        mockElements.push(element);
        eventHandlers.push(handler);
      }
      
      // Remove all event listeners
      mockElements.forEach((element, index) => {
        element.removeEventListener('click', eventHandlers[index]);
      });
      
      const endTime = performance.now();
      const eventTime = endTime - startTime;
      
      // Should complete within 50ms
      expect(eventTime).toBeLessThan(50);
      expect(mockElements.length).toBe(1000);
    });
  });

  describe('Network Performance Simulation', () => {
    test('should handle API request batching efficiently', async () => {
      // Mock API responses
      const mockApiCall = (data) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true, data });
          }, Math.random() * 10); // Random delay 0-10ms
        });
      };
      
      const startTime = performance.now();
      
      // Batch API calls
      const batchSize = 10;
      const totalCalls = 100;
      const batches = [];
      
      for (let i = 0; i < totalCalls; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && (i + j) < totalCalls; j++) {
          batch.push(mockApiCall({ id: i + j }));
        }
        batches.push(Promise.all(batch));
      }
      
      const results = await Promise.all(batches);
      
      const endTime = performance.now();
      const networkTime = endTime - startTime;
      
      // Should complete within 1 second
      expect(networkTime).toBeLessThan(1000);
      expect(results.length).toBe(Math.ceil(totalCalls / batchSize));
    });

    test('should handle request caching efficiently', () => {
      const cache = new Map();
      const startTime = performance.now();
      
      // Simulate cache operations
      for (let i = 0; i < 10000; i++) {
        const key = `cache-key-${i % 100}`; // Reuse keys to test cache hits
        
        if (cache.has(key)) {
          cache.get(key);
        } else {
          cache.set(key, { data: `cached-data-${i}`, timestamp: Date.now() });
        }
      }
      
      const endTime = performance.now();
      const cacheTime = endTime - startTime;
      
      // Should complete within 50ms
      expect(cacheTime).toBeLessThan(50);
      expect(cache.size).toBeLessThan(101); // Should have at most 100 unique keys
    });
  });

  // Helper functions
  async function setupPerformanceTestData() {
    // Create test teachers
    for (let i = 0; i < 10; i++) {
      await dbManager.run(
        'INSERT INTO teachers (name, email, phone) VALUES (?, ?, ?)',
        [`Teacher ${i}`, `teacher${i}@test.com`, `123456789${i}`]
      );
    }

    // Create test lessons
    for (let i = 0; i < 20; i++) {
      await dbManager.run(
        'INSERT INTO lessons (name, type, grade_level) VALUES (?, ?, ?)',
        [`Elective ${i}`, 'elective', 8]
      );
    }

    // Create some assignments
    for (let i = 1; i <= 50; i++) {
      await dbManager.run(
        'INSERT INTO teacher_assignments (teacher_id, class_id, lesson_id) VALUES (?, ?, ?)',
        [Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 100), Math.ceil(Math.random() * 20)]
      );
    }
  }

  async function createLargeTestDataset(classCount) {
    const classIds = [];
    
    // Create classes
    for (let i = 0; i < classCount; i++) {
      const result = await dbManager.run(
        'INSERT INTO classes (name, grade, section) VALUES (?, ?, ?)',
        [`Large Dataset Class ${i}`, 8, 'A']
      );
      classIds.push(result.lastID);
    }

    // Create teachers
    for (let i = 0; i < 50; i++) {
      await dbManager.run(
        'INSERT INTO teachers (name, email, phone) VALUES (?, ?, ?)',
        [`Large Dataset Teacher ${i}`, `teacher${i}@large.com`, `987654321${i}`]
      );
    }

    // Create lessons
    for (let i = 0; i < 30; i++) {
      await dbManager.run(
        'INSERT INTO lessons (name, type, grade_level) VALUES (?, ?, ?)',
        [`Large Dataset Elective ${i}`, 'elective', 8]
      );
    }

    return classIds;
  }
});