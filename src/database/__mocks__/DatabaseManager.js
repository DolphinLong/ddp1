/* eslint-disable no-undef */
// Jest manual mock for DatabaseManager

const DatabaseManager = jest.fn().mockImplementation(() => {
  return {
    initialize: jest.fn(),
    close: jest.fn(),
    switchDatabase: jest.fn(),

    // SQL helpers
    runSQL: jest.fn(),
    run: jest.fn(),
    getAll: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),

    // App-specific helpers commonly used in tests
    getWeeklyHourLimit: jest.fn().mockReturnValue(35),
    getClassAssignedHours: jest.fn(),
    getAllClassesForTeacherAssignment: jest.fn(),
    getAllOrtaokulLessonsForTeacherAssignment: jest.fn(),

    // Caching helpers
    getCached: jest.fn(),
    clearCache: jest.fn(),

    // Elective tracking cached queries
    getCachedElectiveStatuses: jest.fn(),
    getCachedActiveAlerts: jest.fn(),
    getCachedElectiveDistribution: jest.fn(),
  };
});

module.exports = { DatabaseManager };
