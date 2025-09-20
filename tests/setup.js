// Global test setup
global.console = {
  ...console,
  // Suppress console.log during tests unless needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock Date for consistent testing (avoid recursion)
const mockDate = new Date('2023-01-01T00:00:00.000Z');
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      return new RealDate(mockDate);
    }
    return new RealDate(...args);
  }
  static now() {
    return new RealDate(mockDate).getTime();
  }
  static parse = RealDate.parse;
  static UTC = RealDate.UTC;
};

// Mock timers for testing
global.setTimeout = jest.fn((callback) => {
  if (typeof callback === 'function') callback();
  return 1;
});

global.setInterval = jest.fn(() => 1); // Return a mock timer ID

global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Provide safe global window/electron mocks for tests
if (typeof global.window === 'undefined') {
  global.window = {};
}

// Base electronAPI mock structure (only define if missing)
window.electronAPI = window.electronAPI || {};
window.electronAPI.electiveTracker = window.electronAPI.electiveTracker || {
  getAllStatuses: jest.fn(),
  getStatistics: jest.fn(),
  getElectiveDistribution: jest.fn(),
  updateStatus: jest.fn(),
  refreshAllStatuses: jest.fn(),
};
window.electronAPI.suggestionEngine = window.electronAPI.suggestionEngine || {
  generateSuggestions: jest.fn(),
};
window.electronAPI.teacher = window.electronAPI.teacher || {
  assignToLessonAndClass: jest.fn(),
  getAll: jest.fn(),
  getTotalAssignedHours: jest.fn(),
};
window.electronAPI.lesson = window.electronAPI.lesson || {
  getAll: jest.fn(),
  getAvailableElectivesForClass: jest.fn(),
};
window.electronAPI.class = window.electronAPI.class || {
  getAll: jest.fn(),
  getAllWithGuidanceCounselors: jest.fn(),
  getAssignedTeachersForClass: jest.fn(),
  getClassLessons: jest.fn(),
  getClassLessonsByGrade: jest.fn(),
};
window.electronAPI.assignmentAlert = window.electronAPI.assignmentAlert || {
  getActiveAlerts: jest.fn(),
  resolveAlert: jest.fn(),
  generateAlertsForAllClasses: jest.fn(),
};
window.electronAPI.settings = window.electronAPI.settings || {
  getSchoolSettings: jest.fn(),
  updateSchoolSettings: jest.fn(),
};
window.electronAPI.schedule = window.electronAPI.schedule || {
  getForClass: jest.fn(),
  getForTeacher: jest.fn(),
  generate: jest.fn(),
};

// Notification stub
window.lessonManager = window.lessonManager || {
  showNotification: jest.fn(),
  navigateToSection: jest.fn(),
};

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
