// Mock DatabaseManager with inline factory so its methods are jest.fn
jest.mock('../../src/database/DatabaseManager', () => {
    const DatabaseManager = jest.fn().mockImplementation(() => ({
        initialize: jest.fn(),
        close: jest.fn(),
        switchDatabase: jest.fn(),
        runSQL: jest.fn(),
        run: jest.fn(),
        getAll: jest.fn(),
        getOne: jest.fn(),
        getCount: jest.fn(),
        getWeeklyHourLimit: jest.fn().mockReturnValue(35),
        getClassAssignedHours: jest.fn(),
    }));
    return { DatabaseManager };
});

const { DatabaseManager } = require('../../src/database/DatabaseManager');
const { SuggestionEngine } = require('../../src/managers/SuggestionEngine');

describe('SuggestionEngine', () => {
    let suggestionEngine;
    let mockDbManager;

    beforeEach(() => {
        mockDbManager = new DatabaseManager();
        mockDbManager.getWeeklyHourLimit = jest.fn().mockReturnValue(30);
        suggestionEngine = new SuggestionEngine(mockDbManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateSuggestions', () => {
        test('should generate suggestions for a class', async () => {
            const mockClassInfo = {
                id: 1,
                grade: 5,
                section: 'A'
            };

            const mockAvailableElectives = [
                { lessonId: 1, lessonName: 'Müzik' },
                { lessonId: 2, lessonName: 'Resim' }
            ];

            const mockAssignedElectives = [];

            const mockTeachers = [
                { teacherId: 1, teacherName: 'Ahmet Öğretmen' },
                { teacherId: 2, teacherName: 'Ayşe Öğretmen' }
            ];

            mockDbManager.getOne.mockResolvedValue(mockClassInfo);
            mockDbManager.getAll
                .mockResolvedValueOnce(mockAssignedElectives)
                .mockResolvedValueOnce(mockTeachers)
                .mockResolvedValueOnce(mockTeachers);

            // Mock private methods
            jest.spyOn(suggestionEngine, 'getAvailableElectiveLessons')
                .mockResolvedValue(mockAvailableElectives);
            jest.spyOn(suggestionEngine, 'getTeachersForLesson')
                .mockResolvedValue(mockTeachers);
            jest.spyOn(suggestionEngine, 'scoreSuggestion')
                .mockResolvedValue(85);
            jest.spyOn(suggestionEngine, 'generateReasoning')
                .mockResolvedValue('Test reasoning');
            jest.spyOn(suggestionEngine, 'cacheSuggestions')
                .mockResolvedValue();

            const result = await suggestionEngine.generateSuggestions(1);

            expect(result).toHaveLength(4); // 2 lessons × 2 teachers
            expect(result[0]).toEqual({
                id: undefined,
                class_id: 1,
                lesson_id: 1,
                teacher_id: 1,
                suggestion_score: 85,
                reasoning: 'Test reasoning',
                is_applied: false,
                created_at: expect.any(String),
                lessonName: 'Müzik',
                teacherName: 'Ahmet Öğretmen',
                className: '5/A',
                grade: 5
            });
        });

        test('should throw error for non-existent class', async () => {
            mockDbManager.getOne.mockResolvedValue(null);

            await expect(suggestionEngine.generateSuggestions(999))
                .rejects.toThrow('Class with id 999 not found');
        });

        test('should filter out already assigned electives', async () => {
            const mockClassInfo = {
                id: 1,
                grade: 5,
                section: 'A'
            };

            const mockAvailableElectives = [
                { lessonId: 1, lessonName: 'Müzik' },
                { lessonId: 2, lessonName: 'Resim' }
            ];

            const mockAssignedElectives = [
                { lesson_id: 1 } // Müzik already assigned
            ];

            const mockTeachers = [
                { teacherId: 1, teacherName: 'Ahmet Öğretmen' }
            ];

            mockDbManager.getOne.mockResolvedValue(mockClassInfo);
            mockDbManager.getAll.mockResolvedValue(mockAssignedElectives);

            jest.spyOn(suggestionEngine, 'getAvailableElectiveLessons')
                .mockResolvedValue(mockAvailableElectives);
            jest.spyOn(suggestionEngine, 'getTeachersForLesson')
                .mockResolvedValue(mockTeachers);
            jest.spyOn(suggestionEngine, 'scoreSuggestion')
                .mockResolvedValue(85);
            jest.spyOn(suggestionEngine, 'generateReasoning')
                .mockResolvedValue('Test reasoning');
            jest.spyOn(suggestionEngine, 'cacheSuggestions')
                .mockResolvedValue();

            const result = await suggestionEngine.generateSuggestions(1);

            expect(result).toHaveLength(1); // Only Resim should be suggested
            expect(result[0].lessonName).toBe('Resim');
        });
    });

    describe('scoreSuggestion', () => {
        test('should calculate suggestion score correctly', async () => {
            const criteria = {
                classId: 1,
                preferTeachersWithLowWorkload: true,
                preferPopularElectives: true,
                avoidScheduleConflicts: true,
                maxSuggestions: 10
            };

            // Mock private methods
            jest.spyOn(suggestionEngine, 'calculateTeacherWorkload')
                .mockResolvedValue(50); // 50% workload
            jest.spyOn(suggestionEngine, 'getLessonPopularity')
                .mockResolvedValue(75); // 75% popularity
            jest.spyOn(suggestionEngine, 'checkScheduleConflicts')
                .mockResolvedValue(false); // No conflicts
            jest.spyOn(suggestionEngine, 'checkTeacherSubjectMatch')
                .mockResolvedValue(true); // Subject matches

            const score = await suggestionEngine.scoreSuggestion(1, 1, 1, criteria);

            // Expected score calculation:
            // Base: 20
            // Workload (50%): 15 (30 - 15)
            // Popularity (75%): 18.75
            // No conflicts: +15
            // Subject match: +10
            // Total: ~78.75
            expect(score).toBeGreaterThan(70);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should penalize schedule conflicts', async () => {
            const criteria = {
                classId: 1,
                preferTeachersWithLowWorkload: true,
                preferPopularElectives: true,
                avoidScheduleConflicts: true,
                maxSuggestions: 10
            };

            jest.spyOn(suggestionEngine, 'calculateTeacherWorkload')
                .mockResolvedValue(30);
            jest.spyOn(suggestionEngine, 'getLessonPopularity')
                .mockResolvedValue(80);
            jest.spyOn(suggestionEngine, 'checkScheduleConflicts')
                .mockResolvedValue(true); // Has conflicts
            jest.spyOn(suggestionEngine, 'checkTeacherSubjectMatch')
                .mockResolvedValue(false);

            const score = await suggestionEngine.scoreSuggestion(1, 1, 1, criteria);

            // Should be penalized by 50 points for conflicts
            expect(score).toBeLessThan(70);
        });

        test('should return 0 on error', async () => {
            const criteria = {
                classId: 1,
                preferTeachersWithLowWorkload: true,
                preferPopularElectives: true,
                avoidScheduleConflicts: true,
                maxSuggestions: 10
            };

            jest.spyOn(suggestionEngine, 'calculateTeacherWorkload')
                .mockRejectedValue(new Error('Database error'));

            const score = await suggestionEngine.scoreSuggestion(1, 1, 1, criteria);

            expect(score).toBe(0);
        });
    });

    describe('applySuggestion', () => {
        test('should apply suggestion successfully', async () => {
            const mockSuggestion = {
                id: 1,
                teacher_id: 1,
                lesson_id: 1,
                class_id: 1,
                is_applied: false
            };

            mockDbManager.getOne.mockResolvedValue(mockSuggestion);
            mockDbManager.runSQL.mockResolvedValue({ lastID: 1 });

            const result = await suggestionEngine.applySuggestion(1);

            expect(result).toBe(true);
            expect(mockDbManager.runSQL).toHaveBeenCalledTimes(2);
            expect(mockDbManager.runSQL).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO teacher_assignments'),
                [1, 1, 1]
            );
            expect(mockDbManager.runSQL).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE elective_suggestions'),
                [1]
            );
        });

        test('should return false for non-existent suggestion', async () => {
            mockDbManager.getOne.mockResolvedValue(null);

            const result = await suggestionEngine.applySuggestion(999);

            expect(result).toBe(false);
        });

        test('should return false for already applied suggestion', async () => {
            const mockSuggestion = {
                id: 1,
                teacher_id: 1,
                lesson_id: 1,
                class_id: 1,
                is_applied: true
            };

            mockDbManager.getOne.mockResolvedValue(mockSuggestion);

            const result = await suggestionEngine.applySuggestion(1);

            expect(result).toBe(false);
        });
    });

    describe('calculateTeacherWorkload', () => {
        test('should calculate teacher workload percentage', async () => {
            const mockCurrentHours = { total_hours: 15 };
            mockDbManager.getOne.mockResolvedValue(mockCurrentHours);

            const workload = await suggestionEngine.calculateTeacherWorkload(1);

            expect(workload).toBe(50); // 15/30 * 100 = 50%
        });

        test('should handle null hours', async () => {
            const mockCurrentHours = { total_hours: null };
            mockDbManager.getOne.mockResolvedValue(mockCurrentHours);

            const workload = await suggestionEngine.calculateTeacherWorkload(1);

            expect(workload).toBe(0);
        });

        test('should cap workload at 100%', async () => {
            const mockCurrentHours = { total_hours: 40 };
            mockDbManager.getOne.mockResolvedValue(mockCurrentHours);

            const workload = await suggestionEngine.calculateTeacherWorkload(1);

            expect(workload).toBe(100);
        });

        test('should return 100 on error', async () => {
            mockDbManager.getOne.mockRejectedValue(new Error('Database error'));

            const workload = await suggestionEngine.calculateTeacherWorkload(1);

            expect(workload).toBe(100);
        });
    });

    describe('checkScheduleConflicts', () => {
        test('should detect schedule conflicts', async () => {
            const mockClassSchedule = [
                { day_of_week: 1, time_slot: 1 },
                { day_of_week: 2, time_slot: 2 }
            ];

            const mockTeacherSchedule = [
                { day_of_week: 1, time_slot: 1 }, // Conflict here
                { day_of_week: 3, time_slot: 3 }
            ];

            mockDbManager.getAll
                .mockResolvedValueOnce(mockClassSchedule)
                .mockResolvedValueOnce(mockTeacherSchedule);

            const hasConflicts = await suggestionEngine.checkScheduleConflicts(1, 1);

            expect(hasConflicts).toBe(true);
        });

        test('should return false when no conflicts', async () => {
            const mockClassSchedule = [
                { day_of_week: 1, time_slot: 1 },
                { day_of_week: 2, time_slot: 2 }
            ];

            const mockTeacherSchedule = [
                { day_of_week: 3, time_slot: 3 },
                { day_of_week: 4, time_slot: 4 }
            ];

            mockDbManager.getAll
                .mockResolvedValueOnce(mockClassSchedule)
                .mockResolvedValueOnce(mockTeacherSchedule);

            const hasConflicts = await suggestionEngine.checkScheduleConflicts(1, 1);

            expect(hasConflicts).toBe(false);
        });

        test('should return true on error', async () => {
            mockDbManager.getAll.mockRejectedValue(new Error('Database error'));

            const hasConflicts = await suggestionEngine.checkScheduleConflicts(1, 1);

            expect(hasConflicts).toBe(true);
        });
    });

    describe('getCachedSuggestions', () => {
        test('should return cached suggestions for class', async () => {
            const mockCachedSuggestions = [
                {
                    id: 1,
                    class_id: 1,
                    lesson_id: 1,
                    teacher_id: 1,
                    suggestion_score: 85,
                    reasoning: 'Test reasoning',
                    is_applied: 0,
                    created_at: '2023-01-01T00:00:00.000Z',
                    lesson_name: 'Müzik',
                    teacher_name: 'Ahmet Öğretmen',
                    grade: 5,
                    section: 'A'
                }
            ];

            mockDbManager.getAll.mockResolvedValue(mockCachedSuggestions);

            const result = await suggestionEngine.getCachedSuggestions(1);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 1,
                class_id: 1,
                lesson_id: 1,
                teacher_id: 1,
                suggestion_score: 85,
                reasoning: 'Test reasoning',
                is_applied: 0,
                created_at: '2023-01-01T00:00:00.000Z',
                lessonName: 'Müzik',
                teacherName: 'Ahmet Öğretmen',
                className: '5/A',
                grade: 5
            });
        });
    });
});