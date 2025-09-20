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
const { AssignmentAlertManager, AlertType, AlertSeverity } = require('../../src/managers/AssignmentAlertManager');

describe('AssignmentAlertManager', () => {
    let alertManager;
    let mockDbManager;

    beforeEach(() => {
        mockDbManager = new DatabaseManager();
        alertManager = new AssignmentAlertManager(mockDbManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createAlert', () => {
        test('should create new alert when none exists', async () => {
            mockDbManager.getOne.mockResolvedValue(null); // No existing alert
            mockDbManager.runSQL.mockResolvedValue({ lastID: 1 });

            const result = await alertManager.createAlert(
                1, 
                AlertType.MISSING_ELECTIVES, 
                'Test message', 
                AlertSeverity.WARNING
            );

            expect(result).toBe(1);
            expect(mockDbManager.runSQL).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO assignment_alerts'),
                [1, AlertType.MISSING_ELECTIVES, AlertSeverity.WARNING, 'Test message']
            );
        });

        test('should update existing alert instead of creating duplicate', async () => {
            const existingAlert = { id: 5 };
            mockDbManager.getOne.mockResolvedValue(existingAlert);

            const result = await alertManager.createAlert(
                1, 
                AlertType.MISSING_ELECTIVES, 
                'Updated message', 
                AlertSeverity.CRITICAL
            );

            expect(result).toBe(5);
            expect(mockDbManager.runSQL).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE assignment_alerts'),
                ['Updated message', AlertSeverity.CRITICAL, 5]
            );
        });

        test('should handle database errors', async () => {
            mockDbManager.getOne.mockRejectedValue(new Error('Database error'));

            await expect(alertManager.createAlert(1, AlertType.MISSING_ELECTIVES, 'Test'))
                .rejects.toThrow('Database error');
        });
    });

    describe('updateAlertSeverity', () => {
        test('should update alert severity successfully', async () => {
            mockDbManager.runSQL.mockResolvedValue({ changes: 1 });

            const result = await alertManager.updateAlertSeverity(1, AlertSeverity.CRITICAL);

            expect(result).toBe(true);
            expect(mockDbManager.runSQL).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE assignment_alerts'),
                [AlertSeverity.CRITICAL, 1]
            );
        });

        test('should return false when no alert updated', async () => {
            mockDbManager.runSQL.mockResolvedValue({ changes: 0 });

            const result = await alertManager.updateAlertSeverity(999, AlertSeverity.CRITICAL);

            expect(result).toBe(false);
        });

        test('should handle database errors gracefully', async () => {
            mockDbManager.runSQL.mockRejectedValue(new Error('Database error'));

            const result = await alertManager.updateAlertSeverity(1, AlertSeverity.CRITICAL);

            expect(result).toBe(false);
        });
    });

    describe('resolveAlert', () => {
        test('should resolve alert successfully', async () => {
            mockDbManager.runSQL.mockResolvedValue({ changes: 1 });

            const result = await alertManager.resolveAlert(1);

            expect(result).toBe(true);
            expect(mockDbManager.runSQL).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE assignment_alerts'),
                [1]
            );
        });

        test('should return false when no alert resolved', async () => {
            mockDbManager.runSQL.mockResolvedValue({ changes: 0 });

            const result = await alertManager.resolveAlert(999);

            expect(result).toBe(false);
        });
    });

    describe('getAlertsByClass', () => {
        test('should return alerts for specific class', async () => {
            const mockAlerts = [
                {
                    id: 1,
                    class_id: 1,
                    alert_type: 'missing_electives',
                    severity: 'warning',
                    message: 'Test alert',
                    is_resolved: 0,
                    created_at: '2023-01-01T00:00:00.000Z',
                    resolved_at: null,
                    grade: 5,
                    section: 'A'
                }
            ];

            mockDbManager.getAll.mockResolvedValue(mockAlerts);

            const result = await alertManager.getAlertsByClass(1);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 1,
                class_id: 1,
                alert_type: 'missing_electives',
                severity: 'warning',
                message: 'Test alert',
                is_resolved: 0,
                created_at: '2023-01-01T00:00:00.000Z',
                resolved_at: null,
                className: '5/A',
                grade: 5
            });
        });
    });

    describe('getCriticalAlerts', () => {
        test('should return only critical unresolved alerts', async () => {
            const mockCriticalAlerts = [
                {
                    id: 1,
                    class_id: 1,
                    alert_type: 'missing_electives',
                    severity: 'critical',
                    message: 'Critical alert',
                    is_resolved: 0,
                    created_at: '2023-01-01T00:00:00.000Z',
                    resolved_at: null,
                    grade: 5,
                    section: 'A'
                }
            ];

            mockDbManager.getAll.mockResolvedValue(mockCriticalAlerts);

            const result = await alertManager.getCriticalAlerts();

            expect(result).toHaveLength(1);
            expect(result[0].severity).toBe('critical');
            expect(mockDbManager.getAll).toHaveBeenCalledWith(
                expect.stringContaining("WHERE aa.severity = 'critical' AND aa.is_resolved = 0")
            );
        });
    });

    describe('getActiveAlerts', () => {
        test('should return all active alerts sorted by severity', async () => {
            const mockActiveAlerts = [
                {
                    id: 1,
                    class_id: 1,
                    alert_type: 'missing_electives',
                    severity: 'critical',
                    message: 'Critical alert',
                    is_resolved: 0,
                    created_at: '2023-01-01T00:00:00.000Z',
                    resolved_at: null,
                    grade: 5,
                    section: 'A'
                },
                {
                    id: 2,
                    class_id: 2,
                    alert_type: 'over_assignment',
                    severity: 'warning',
                    message: 'Warning alert',
                    is_resolved: 0,
                    created_at: '2023-01-01T00:00:00.000Z',
                    resolved_at: null,
                    grade: 5,
                    section: 'B'
                }
            ];

            mockDbManager.getAll.mockResolvedValue(mockActiveAlerts);

            const result = await alertManager.getActiveAlerts();

            expect(result).toHaveLength(2);
            expect(mockDbManager.getAll).toHaveBeenCalledWith(
                expect.stringContaining('WHERE aa.is_resolved = 0')
            );
        });
    });

    describe('getAlertStatistics', () => {
        test('should return comprehensive alert statistics', async () => {
            const mockTotalCount = { count: 10 };
            const mockActiveCount = { count: 5 };
            const mockResolvedCount = { count: 5 };
            const mockSeverityCounts = [
                { severity: 'critical', count: 2 },
                { severity: 'warning', count: 3 }
            ];
            const mockTypeCounts = [
                { alert_type: 'missing_electives', count: 4 },
                { alert_type: 'over_assignment', count: 1 }
            ];

            mockDbManager.getOne
                .mockResolvedValueOnce(mockTotalCount)
                .mockResolvedValueOnce(mockActiveCount)
                .mockResolvedValueOnce(mockResolvedCount);
            
            mockDbManager.getAll
                .mockResolvedValueOnce(mockSeverityCounts)
                .mockResolvedValueOnce(mockTypeCounts);

            const result = await alertManager.getAlertStatistics();

            expect(result).toEqual({
                total: 10,
                active: 5,
                resolved: 5,
                critical: 2,
                warning: 3,
                info: 0,
                byType: {
                    'missing_electives': 4,
                    'over_assignment': 1
                }
            });
        });
    });

    describe('bulkResolveAlerts', () => {
        test('should resolve multiple alerts', async () => {
            mockDbManager.runSQL.mockResolvedValue({ changes: 3 });

            const result = await alertManager.bulkResolveAlerts([1, 2, 3]);

            expect(result).toBe(3);
            expect(mockDbManager.runSQL).toHaveBeenCalledWith(
                expect.stringContaining('WHERE id IN (?,?,?)'),
                [1, 2, 3]
            );
        });

        test('should return 0 for empty array', async () => {
            const result = await alertManager.bulkResolveAlerts([]);

            expect(result).toBe(0);
            expect(mockDbManager.runSQL).not.toHaveBeenCalled();
        });
    });

    describe('generateAlertsForAllClasses', () => {
        test('should generate alerts for classes with issues', async () => {
            const mockClassesWithIssues = [
                {
                    class_id: 1,
                    grade: 5,
                    section: 'A',
                    status: 'incomplete',
                    missing_electives: 2
                },
                {
                    class_id: 2,
                    grade: 5,
                    section: 'B',
                    status: 'over_assigned'
                }
            ];

            mockDbManager.getAll.mockResolvedValue(mockClassesWithIssues);
            
            // Mock createAlert method
            const createAlertSpy = jest.spyOn(alertManager, 'createAlert')
                .mockResolvedValue(1);

            const result = await alertManager.generateAlertsForAllClasses();

            expect(result).toBe(2);
            expect(createAlertSpy).toHaveBeenCalledTimes(2);
            expect(createAlertSpy).toHaveBeenCalledWith(
                1,
                AlertType.MISSING_ELECTIVES,
                '5/A sınıfında 2 seçmeli ders eksik',
                AlertSeverity.CRITICAL
            );
            expect(createAlertSpy).toHaveBeenCalledWith(
                2,
                AlertType.OVER_ASSIGNMENT,
                '5/B sınıfında fazla seçmeli ders ataması var',
                AlertSeverity.WARNING
            );
        });
    });
});