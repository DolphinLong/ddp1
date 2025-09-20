/**
 * @jest-environment jsdom
 */

// Mock electron API (augment existing jsdom window)
Object.assign(window, {
  electronAPI: {
    assignmentAlert: {
      getActiveAlerts: jest.fn(),
      resolveAlert: jest.fn(),
      generateAlertsForAllClasses: jest.fn()
    },
    electiveTracker: {
      refreshAllStatuses: jest.fn()
    }
  },
  lessonManager: {
    showNotification: jest.fn()
  }
});

// Import the class after setting up mocks
const { ElectiveAlertManager } = require('../../renderer/scripts/main.js');

describe('ElectiveAlertManager', () => {
  let alertManager;
  let mockContainer;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="elective-alerts"></div>
      <div id="no-alerts"></div>
      <div id="alert-count">0</div>
    `;

    mockContainer = document.getElementById('elective-alerts');
    alertManager = new ElectiveAlertManager();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    if (alertManager.refreshInterval) {
      clearInterval(alertManager.refreshInterval);
    }
  });

  describe('loadElectiveAlerts', () => {
    test('should load and display alerts', async () => {
      const mockAlerts = [
        {
          id: 1,
          class_id: 1,
          alert_type: 'missing_electives',
          severity: 'critical',
          message: '5/A sınıfında 2 seçmeli ders eksik',
          created_at: '2023-01-01T00:00:00.000Z',
          className: '5/A'
        },
        {
          id: 2,
          class_id: 2,
          alert_type: 'over_assignment',
          severity: 'warning',
          message: '5/B sınıfında fazla seçmeli ders ataması var',
          created_at: '2023-01-01T00:00:00.000Z',
          className: '5/B'
        }
      ];

      window.electronAPI.assignmentAlert.getActiveAlerts.mockResolvedValue(mockAlerts);

      await alertManager.loadElectiveAlerts();

      expect(window.electronAPI.assignmentAlert.getActiveAlerts).toHaveBeenCalled();
      expect(alertManager.alerts).toEqual(mockAlerts);
      expect(document.getElementById('alert-count').textContent).toBe('2');
    });

    test('should handle empty alerts', async () => {
      window.electronAPI.assignmentAlert.getActiveAlerts.mockResolvedValue([]);

      await alertManager.loadElectiveAlerts();

      expect(alertManager.alerts).toEqual([]);
      expect(document.getElementById('alert-count').textContent).toBe('0');
      expect(document.getElementById('no-alerts').style.display).toBe('block');
    });

    test('should handle API errors', async () => {
      window.electronAPI.assignmentAlert.getActiveAlerts.mockRejectedValue(
        new Error('API Error')
      );

      await alertManager.loadElectiveAlerts();

      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Uyarılar yüklenirken hata oluştu',
        'error'
      );
    });
  });

  describe('renderAlertList', () => {
    test('should render alert items correctly', () => {
      alertManager.alerts = [
        {
          id: 1,
          class_id: 1,
          alert_type: 'missing_electives',
          severity: 'critical',
          message: '5/A sınıfında 2 seçmeli ders eksik',
          created_at: '2023-01-01T00:00:00.000Z',
          className: '5/A'
        }
      ];

      alertManager.renderAlertList();

      const alertItems = mockContainer.querySelectorAll('.alert-item');
      expect(alertItems).toHaveLength(1);
      
      const alertItem = alertItems[0];
      expect(alertItem.classList.contains('critical')).toBe(true);
      expect(alertItem.textContent).toContain('5/A sınıfında 2 seçmeli ders eksik');
      expect(alertItem.textContent).toContain('5/A');
    });

    test('should show no alerts message when empty', () => {
      alertManager.alerts = [];
      alertManager.renderAlertList();

      expect(document.getElementById('no-alerts').style.display).toBe('block');
      expect(mockContainer.style.display).toBe('none');
    });

    test('should limit alerts to maximum display count', () => {
      // Create 15 alerts (more than the limit of 10)
      alertManager.alerts = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        class_id: i + 1,
        alert_type: 'missing_electives',
        severity: 'warning',
        message: `Alert ${i + 1}`,
        created_at: '2023-01-01T00:00:00.000Z',
        className: `5/${String.fromCharCode(65 + i)}`
      }));

      alertManager.renderAlertList();

      const alertItems = mockContainer.querySelectorAll('.alert-item');
      expect(alertItems).toHaveLength(10); // Should be limited to 10
    });
  });

  describe('resolveAlert', () => {
    test('should resolve alert successfully', async () => {
      window.electronAPI.assignmentAlert.resolveAlert.mockResolvedValue(true);
      window.electronAPI.electiveTracker.refreshAllStatuses.mockResolvedValue();

      alertManager.alerts = [
        { id: 1, message: 'Test alert' },
        { id: 2, message: 'Another alert' }
      ];

      await alertManager.resolveAlert(1);

      expect(window.electronAPI.assignmentAlert.resolveAlert).toHaveBeenCalledWith(1);
      expect(window.electronAPI.electiveTracker.refreshAllStatuses).toHaveBeenCalled();
      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Uyarı çözüldü',
        'success'
      );
    });

    test('should handle resolve failure', async () => {
      window.electronAPI.assignmentAlert.resolveAlert.mockResolvedValue(false);

      await alertManager.resolveAlert(1);

      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Uyarı çözülürken hata oluştu',
        'error'
      );
    });

    test('should handle API errors', async () => {
      window.electronAPI.assignmentAlert.resolveAlert.mockRejectedValue(
        new Error('API Error')
      );

      await alertManager.resolveAlert(1);

      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Uyarı çözülürken hata oluştu',
        'error'
      );
    });
  });

  describe('updateAlertCount', () => {
    test('should update alert count display', () => {
      alertManager.alerts = [
        { id: 1, severity: 'critical' },
        { id: 2, severity: 'warning' },
        { id: 3, severity: 'critical' }
      ];

      alertManager.updateAlertCount();

      expect(document.getElementById('alert-count').textContent).toBe('3');
    });

    test('should handle zero alerts', () => {
      alertManager.alerts = [];
      alertManager.updateAlertCount();

      expect(document.getElementById('alert-count').textContent).toBe('0');
    });
  });

  describe('refreshAlerts', () => {
    test('should refresh alerts and show notification', async () => {
      const loadSpy = jest.spyOn(alertManager, 'loadElectiveAlerts')
        .mockResolvedValue();

      await alertManager.refreshAlerts();

      expect(loadSpy).toHaveBeenCalled();
      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Uyarılar yenilendi',
        'info'
      );
    });
  });

  describe('formatTimeAgo', () => {
    test('should format recent time correctly', () => {
      const now = new Date('2023-01-01T12:00:00.000Z');
      const fiveMinutesAgo = new Date('2023-01-01T11:55:00.000Z');

      // Mock Date.now
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const result = alertManager.formatTimeAgo(fiveMinutesAgo.toISOString());
      expect(result).toBe('5 dakika önce');
    });

    test('should format hours correctly', () => {
      const now = new Date('2023-01-01T12:00:00.000Z');
      const twoHoursAgo = new Date('2023-01-01T10:00:00.000Z');

      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const result = alertManager.formatTimeAgo(twoHoursAgo.toISOString());
      expect(result).toBe('2 saat önce');
    });

    test('should format days correctly', () => {
      const now = new Date('2023-01-03T12:00:00.000Z');
      const twoDaysAgo = new Date('2023-01-01T12:00:00.000Z');

      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const result = alertManager.formatTimeAgo(twoDaysAgo.toISOString());
      expect(result).toBe('2 gün önce');
    });

    test('should handle invalid dates', () => {
      const result = alertManager.formatTimeAgo('invalid-date');
      expect(result).toBe('Bilinmiyor');
    });
  });

  describe('auto-refresh', () => {
    test('should start auto-refresh on initialization', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      new ElectiveAlertManager();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        30000 // 30 seconds
      );
    });

    test('should stop auto-refresh on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      alertManager.destroy();

      expect(clearIntervalSpy).toHaveBeenCalledWith(alertManager.refreshInterval);
    });
  });
});