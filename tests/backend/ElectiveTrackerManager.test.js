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
const { ElectiveTrackerManager } = require('../../src/managers/ElectiveTrackerManager');

describe('ElectiveTrackerManager', () => {
    let electiveTrackerManager;
    let mockDbManager;

    beforeEach(() => {
        mockDbManager = new DatabaseManager();
        electiveTrackerManager = new ElectiveTrackerManager(mockDbManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('updateElectiveStatus', () => {
        test('should update elective status for a class', async () => {
            // Mock class data
            const mockClassInfo = {
                id: 1,
                grade: 5,
                section: 'A',
                school_type: 'Ortaokul'
            };

            const mockAssignedElectives = { count: 2 };

            mockDbManager.getOne
                .mockResolvedValueOnce(mockClassInfo)
                .mockResolvedValueOnce(mockAssignedElectives);
            
            mockDbManager.runSQL.mockResolvedValue({ lastID: 1 });

            const result = await electiveTrackerManager.updateElectiveStatus(1);

            expect(result).toEqual({
                classId: 1,
                className: '5/A',
                grade: 5,
                requiredElectives: 3,
                assignedElectives: 2,
                missingElectives: 1,
                status: 'incomplete',
                lastUpdated: expect.any(String)
            });

            expect(mockDbManager.runSQL).toHaveBeenCalledWith(
                expect.stringContaining('INSERT OR REPLACE INTO elective_assignment_status'),
                expect.arrayContaining([1, 5, 3, 2, 1, 'incomplete'])
            );
        });

        test('should throw error for non-existent class', async () => {
            mockDbManager.getOne.mockResolvedValue(null);

            await expect(electiveTrackerManager.updateElectiveStatus(999))
                .rejects.toThrow('Class with id 999 not found');
        });

        test('should mark as complete when all electives assigned', async () => {
            const mockClassInfo = {
                id: 1,
                grade: 5,
                section: 'A',
                school_type: 'Ortaokul'
            };

            const mockAssignedElectives = { count: 3 };

            mockDbManager.getOne
                .mockResolvedValueOnce(mockClassInfo)
                .mockResolvedValueOnce(mockAssignedElectives);
            
            mockDbManager.runSQL.mockResolvedValue({ lastID: 1 });

            const result = await electiveTrackerManager.updateElectiveStatus(1);

            expect(result.status).toBe('complete');
            expect(result.missingElectives).toBe(0);
        });

        test('should mark as over_assigned when too many electives', async () => {
            const mockClassInfo = {
                id: 1,
                grade: 5,
                section: 'A',
                school_type: 'Ortaokul'
            };

            const mockAssignedElectives = { count: 4 };

            mockDbManager.getOne
                .mockResolvedValueOnce(mockClassInfo)
                .mockResolvedValueOnce(mockAssignedElectives);
            
            mockDbManager.runSQL.mockResolvedValue({ lastID: 1 });

            const result = await electiveTrackerManager.updateElectiveStatus(1);

            expect(result.status).toBe('over_assigned');
            expect(result.missingElectives).toBe(0);
        });
    });

    describe('getElectiveStatusForClass', () => {
        test('should return elective status for existing class', async () => {
            const mockStatus = {
                class_id: 1,
                grade: 5,
                section: 'A',
                required_electives: 3,
                assigned_electives: 2,
                missing_electives: 1,
                status: 'incomplete',
                last_updated: '2023-01-01T00:00:00.000Z'
            };

            mockDbManager.getOne.mockResolvedValue(mockStatus);

            const result = await electiveTrackerManager.getElectiveStatusForClass(1);

            expect(result).toEqual({
                classId: 1,
                className: '5/A',
                grade: 5,
                requiredElectives: 3,
                assignedElectives: 2,
                missingElectives: 1,
                status: 'incomplete',
                lastUpdated: '2023-01-01T00:00:00.000Z'
            });
        });

        test('should return null for non-existent class', async () => {
            mockDbManager.getOne.mockResolvedValue(null);

            const result = await electiveTrackerManager.getElectiveStatusForClass(999);

            expect(result).toBeNull();
        });
    });

    describe('getAllElectiveStatuses', () => {
        test('should return all elective statuses', async () => {
            const mockStatuses = [
                {
                    class_id: 1,
                    grade: 5,
                    section: 'A',
                    required_electives: 3,
                    assigned_electives: 2,
                    missing_electives: 1,
                    status: 'incomplete',
                    last_updated: '2023-01-01T00:00:00.000Z'
                },
                {
                    class_id: 2,
                    grade: 5,
                    section: 'B',
                    required_electives: 3,
                    assigned_electives: 3,
                    missing_electives: 0,
                    status: 'complete',
                    last_updated: '2023-01-01T00:00:00.000Z'
                }
            ];

            mockDbManager.getAll.mockResolvedValue(mockStatuses);

            const result = await electiveTrackerManager.getAllElectiveStatuses();

            expect(result).toHaveLength(2);
            expect(result[0].className).toBe('5/A');
            expect(result[1].className).toBe('5/B');
        });
    });

    describe('getIncompleteAssignments', () => {
        test('should return incomplete assignments with lesson details', async () => {
            const mockIncompleteStatuses = [
                {
                    class_id: 1,
                    grade: 5,
                    section: 'A',
                    missing_electives: 2
                }
            ];

            const mockAssignedLessons = [
                { name: 'Müzik' }
            ];

            mockDbManager.getAll
                .mockResolvedValueOnce(mockIncompleteStatuses)
                .mockResolvedValueOnce(mockAssignedLessons);

            const result = await electiveTrackerManager.getIncompleteAssignments();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                classId: 1,
                className: '5/A',
                grade: 5,
                missingCount: 2,
                assignedElectives: ['Müzik']
            });
        });
    });

    describe('getElectiveStatistics', () => {
        test('should return comprehensive statistics', async () => {
            const mockTotalClasses = { count: 10 };
            const mockStatusCounts = {
                completed: 6,
                incomplete: 4,
                total_missing: 8,
                avg_electives: 2.5
            };

            mockDbManager.getOne
                .mockResolvedValueOnce(mockTotalClasses)
                .mockResolvedValueOnce(mockStatusCounts);

            const result = await electiveTrackerManager.getElectiveStatistics();

            expect(result).toEqual({
                totalClasses: 10,
                completedClasses: 6,
                incompleteClasses: 4,
                completionPercentage: 60,
                totalMissingAssignments: 8,
                averageElectivesPerClass: 2.5
            });
        });
    });

    describe('getElectiveDistribution', () => {
        test('should return elective lesson distribution', async () => {
            const mockDistribution = [
                { lesson_name: 'Müzik', assignment_count: 5 },
                { lesson_name: 'Resim', assignment_count: 3 },
                { lesson_name: 'Beden Eğitimi', assignment_count: 2 }
            ];

            mockDbManager.getAll.mockResolvedValue(mockDistribution);

            const result = await electiveTrackerManager.getElectiveDistribution();

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                lessonName: 'Müzik',
                assignmentCount: 5,
                percentage: 50
            });
            expect(result[1]).toEqual({
                lessonName: 'Resim',
                assignmentCount: 3,
                percentage: 30
            });
        });
    });

    describe('refreshAllElectiveStatuses', () => {
        test('should refresh all class statuses', async () => {
            const mockClasses = [
                { id: 1 },
                { id: 2 },
                { id: 3 }
            ];

            mockDbManager.getAll.mockResolvedValue(mockClasses);

            // Mock updateElectiveStatus for each class
            const updateSpy = jest.spyOn(electiveTrackerManager, 'updateElectiveStatus')
                .mockResolvedValue({});

            await electiveTrackerManager.refreshAllElectiveStatuses();

            expect(updateSpy).toHaveBeenCalledTimes(3);
            expect(updateSpy).toHaveBeenCalledWith(1);
            expect(updateSpy).toHaveBeenCalledWith(2);
            expect(updateSpy).toHaveBeenCalledWith(3);
        });
    });
});