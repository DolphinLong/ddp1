/**
 * @jest-environment jsdom
 */

// Mock electron API (augment existing jsdom window)
Object.assign(window, {
  electronAPI: {
    electiveTracker: {
      getAllStatuses: jest.fn(),
      getStatistics: jest.fn(),
      getElectiveDistribution: jest.fn(),
      updateStatus: jest.fn()
    },
    suggestionEngine: {
      generateSuggestions: jest.fn()
    },
    teacher: {
      assignToLessonAndClass: jest.fn(),
      getAll: jest.fn()
    },
    lesson: {
      getAvailableElectivesForClass: jest.fn()
    }
  },
  lessonManager: {
    showNotification: jest.fn(),
    navigateToSection: jest.fn()
  }
});

// Mock Chart.js
window.Chart = jest.fn().mockImplementation(() => ({
  destroy: jest.fn()
}));

// Import the class after setting up mocks
const { ElectiveTracker } = require('../../renderer/scripts/main.js');

describe('ElectiveTracker', () => {
  let electiveTracker;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="elective-search"></div>
      <div id="grade-filter-tracker"></div>
      <div id="status-filter-tracker"></div>
      <div id="elective-status-tbody"></div>
      <div id="elective-table-loading"></div>
      <div id="elective-table-empty"></div>
      <div id="completion-percentage">0%</div>
      <div id="completion-progress"></div>
      <div id="missing-assignments">0</div>
      <div id="total-classes-tracker">0</div>
      <div id="avg-electives">0</div>
      <canvas id="elective-distribution-chart"></canvas>
      <div id="modal-container"></div>
    `;

    electiveTracker = new ElectiveTracker();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('loadElectiveStatuses', () => {
    test('should load and display elective statuses', async () => {
      const mockStatuses = [
        {
          classId: 1,
          className: '5/A',
          grade: 5,
          requiredElectives: 3,
          assignedElectives: 2,
          missingElectives: 1,
          status: 'incomplete',
          lastUpdated: '2023-01-01T00:00:00.000Z'
        },
        {
          classId: 2,
          className: '5/B',
          grade: 5,
          requiredElectives: 3,
          assignedElectives: 3,
          missingElectives: 0,
          status: 'complete',
          lastUpdated: '2023-01-01T00:00:00.000Z'
        }
      ];

      window.electronAPI.electiveTracker.getAllStatuses.mockResolvedValue(mockStatuses);

      await electiveTracker.loadElectiveStatuses();

      expect(window.electronAPI.electiveTracker.getAllStatuses).toHaveBeenCalled();
      expect(electiveTracker.electiveStatuses).toEqual(mockStatuses);
      expect(electiveTracker.filteredStatuses).toEqual(mockStatuses);
    });

    test('should handle API errors', async () => {
      window.electronAPI.electiveTracker.getAllStatuses.mockRejectedValue(
        new Error('API Error')
      );

      await electiveTracker.loadElectiveStatuses();

      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Seçmeli ders durumları yüklenirken hata oluştu',
        'error'
      );
    });
  });

  describe('loadStatistics', () => {
    test('should load and update statistics display', async () => {
      const mockStats = {
        totalClasses: 10,
        completedClasses: 6,
        incompleteClasses: 4,
        completionPercentage: 60,
        totalMissingAssignments: 8,
        averageElectivesPerClass: 2.5
      };

      const mockDistribution = [
        { lessonName: 'Müzik', assignmentCount: 5, percentage: 50 },
        { lessonName: 'Resim', assignmentCount: 3, percentage: 30 }
      ];

      window.electronAPI.electiveTracker.getStatistics.mockResolvedValue(mockStats);
      window.electronAPI.electiveTracker.getElectiveDistribution.mockResolvedValue(mockDistribution);

      await electiveTracker.loadStatistics();

      expect(document.getElementById('completion-percentage').textContent).toBe('60%');
      expect(document.getElementById('missing-assignments').textContent).toBe('8');
      expect(document.getElementById('total-classes-tracker').textContent).toBe('10');
      expect(document.getElementById('avg-electives').textContent).toBe('2.5');
    });
  });

  describe('applyFilters', () => {
    beforeEach(() => {
      electiveTracker.electiveStatuses = [
        {
          classId: 1,
          className: '5/A',
          grade: 5,
          status: 'incomplete'
        },
        {
          classId: 2,
          className: '6/B',
          grade: 6,
          status: 'complete'
        },
        {
          classId: 3,
          className: '5/C',
          grade: 5,
          status: 'complete'
        }
      ];
    });

    test('should filter by grade', () => {
      electiveTracker.filters.grade = '5';
      electiveTracker.applyFilters();

      expect(electiveTracker.filteredStatuses).toHaveLength(2);
      expect(electiveTracker.filteredStatuses.every(s => s.grade === 5)).toBe(true);
    });

    test('should filter by status', () => {
      electiveTracker.filters.status = 'incomplete';
      electiveTracker.applyFilters();

      expect(electiveTracker.filteredStatuses).toHaveLength(1);
      expect(electiveTracker.filteredStatuses[0].status).toBe('incomplete');
    });

    test('should filter by search term', () => {
      electiveTracker.filters.search = '5/A';
      electiveTracker.applyFilters();

      expect(electiveTracker.filteredStatuses).toHaveLength(1);
      expect(electiveTracker.filteredStatuses[0].className).toBe('5/A');
    });

    test('should apply multiple filters', () => {
      electiveTracker.filters.grade = '5';
      electiveTracker.filters.status = 'complete';
      electiveTracker.applyFilters();

      expect(electiveTracker.filteredStatuses).toHaveLength(1);
      expect(electiveTracker.filteredStatuses[0].className).toBe('5/C');
    });
  });

  describe('sortTable', () => {
    beforeEach(() => {
      electiveTracker.filteredStatuses = [
        { classId: 1, className: '5/A', assignedElectives: 2 },
        { classId: 2, className: '5/B', assignedElectives: 3 },
        { classId: 3, className: '5/C', assignedElectives: 1 }
      ];
    });

    test('should sort by className ascending', () => {
      electiveTracker.sortTable('className', 'asc');

      expect(electiveTracker.filteredStatuses[0].className).toBe('5/A');
      expect(electiveTracker.filteredStatuses[1].className).toBe('5/B');
      expect(electiveTracker.filteredStatuses[2].className).toBe('5/C');
    });

    test('should sort by className descending', () => {
      electiveTracker.sortTable('className', 'desc');

      expect(electiveTracker.filteredStatuses[0].className).toBe('5/C');
      expect(electiveTracker.filteredStatuses[1].className).toBe('5/B');
      expect(electiveTracker.filteredStatuses[2].className).toBe('5/A');
    });

    test('should sort by numeric values', () => {
      electiveTracker.sortTable('assignedElectives', 'asc');

      expect(electiveTracker.filteredStatuses[0].assignedElectives).toBe(1);
      expect(electiveTracker.filteredStatuses[1].assignedElectives).toBe(2);
      expect(electiveTracker.filteredStatuses[2].assignedElectives).toBe(3);
    });

    test('should toggle sort direction', () => {
      electiveTracker.currentSort = { column: 'className', direction: 'asc' };
      electiveTracker.sortTable('className');

      expect(electiveTracker.currentSort.direction).toBe('desc');
    });
  });

  describe('createStatusRow', () => {
    test('should create status row with correct content', () => {
      const status = {
        classId: 1,
        className: '5/A',
        grade: 5,
        requiredElectives: 3,
        assignedElectives: 2,
        missingElectives: 1,
        status: 'incomplete',
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      const row = electiveTracker.createStatusRow(status);

      expect(row.tagName).toBe('TR');
      expect(row.dataset.classId).toBe('1');
      expect(row.textContent).toContain('5/A');
      expect(row.textContent).toContain('5. Sınıf');
      expect(row.textContent).toContain('2');
      expect(row.textContent).toContain('1');
      expect(row.textContent).toContain('Eksik');
    });

    test('should show assign button for incomplete status', () => {
      const status = {
        classId: 1,
        className: '5/A',
        grade: 5,
        status: 'incomplete'
      };

      const row = electiveTracker.createStatusRow(status);
      const assignButton = row.querySelector('.action-btn.assign');

      expect(assignButton).toBeTruthy();
      expect(assignButton.textContent.trim()).toContain('Ata');
    });

    test('should not show assign button for complete status', () => {
      const status = {
        classId: 1,
        className: '5/A',
        grade: 5,
        status: 'complete'
      };

      const row = electiveTracker.createStatusRow(status);
      const assignButton = row.querySelector('.action-btn.assign');

      expect(assignButton).toBeFalsy();
    });
  });

  describe('generateSuggestions', () => {
    test('should generate and show suggestions', async () => {
      const mockSuggestions = [
        {
          id: 1,
          lessonName: 'Müzik',
          teacherName: 'Ahmet Öğretmen',
          suggestion_score: 85,
          reasoning: 'Test reasoning'
        }
      ];

      window.electronAPI.suggestionEngine.generateSuggestions.mockResolvedValue(mockSuggestions);

      const showSuggestionsSpy = jest.spyOn(electiveTracker, 'showSuggestionsModal')
        .mockImplementation(() => {});

      await electiveTracker.generateSuggestions(1);

      expect(window.electronAPI.suggestionEngine.generateSuggestions).toHaveBeenCalledWith(1);
      expect(showSuggestionsSpy).toHaveBeenCalledWith(mockSuggestions);
    });

    test('should handle no suggestions found', async () => {
      window.electronAPI.suggestionEngine.generateSuggestions.mockResolvedValue([]);

      await electiveTracker.generateSuggestions(1);

      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Bu sınıf için öneri bulunamadı',
        'warning'
      );
    });

    test('should handle API errors', async () => {
      window.electronAPI.suggestionEngine.generateSuggestions.mockRejectedValue(
        new Error('API Error')
      );

      await electiveTracker.generateSuggestions(1);

      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Öneriler oluşturulurken hata oluştu',
        'error'
      );
    });
  });

  describe('openQuickAssignment', () => {
    test('should open quick assignment panel', () => {
      document.body.innerHTML += '<div id="quick-assignment-panel"></div>';
      
      electiveTracker.openQuickAssignment(1);

      const panel = document.getElementById('quick-assignment-panel');
      expect(panel.classList.contains('active')).toBe(true);
      expect(panel.style.display).toBe('block');
      expect(electiveTracker.selectedClassId).toBe(1);
    });
  });

  describe('closeQuickAssignment', () => {
    test('should close quick assignment panel', () => {
      document.body.innerHTML += '<div id="quick-assignment-panel" class="active" style="display: block;"></div>';
      electiveTracker.selectedClassId = 1;

      electiveTracker.closeQuickAssignment();

      const panel = document.getElementById('quick-assignment-panel');
      expect(panel.classList.contains('active')).toBe(false);
      expect(electiveTracker.selectedClassId).toBeNull();
    });
  });

  describe('confirmQuickAssignment', () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <input type="radio" name="selected-elective" value="1" checked>
        <select id="teacher-select-quick">
          <option value="1" selected>Ahmet Öğretmen</option>
        </select>
      `;
      electiveTracker.selectedClassId = 1;
    });

    test('should confirm assignment successfully', async () => {
      window.electronAPI.teacher.assignToLessonAndClass.mockResolvedValue();
      window.electronAPI.electiveTracker.updateStatus.mockResolvedValue();

      const refreshSpy = jest.spyOn(electiveTracker, 'refreshData')
        .mockResolvedValue();
      const closeSpy = jest.spyOn(electiveTracker, 'closeQuickAssignment')
        .mockImplementation(() => {});

      await electiveTracker.confirmQuickAssignment();

      expect(window.electronAPI.teacher.assignToLessonAndClass).toHaveBeenCalledWith(1, 1, 1);
      expect(window.electronAPI.electiveTracker.updateStatus).toHaveBeenCalledWith(1);
      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Seçmeli ders ataması başarıyla yapıldı',
        'success'
      );
      expect(closeSpy).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
    });

    test('should show warning when no selection made', async () => {
      document.querySelector('input[name="selected-elective"]').checked = false;

      await electiveTracker.confirmQuickAssignment();

      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Lütfen ders ve öğretmen seçin',
        'warning'
      );
    });

    test('should handle assignment errors', async () => {
      window.electronAPI.teacher.assignToLessonAndClass.mockRejectedValue(
        new Error('Assignment failed')
      );

      await electiveTracker.confirmQuickAssignment();

      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Atama yapılırken hata oluştu',
        'error'
      );
    });
  });

  describe('clearFilters', () => {
    test('should clear all filters and reset UI', () => {
      // Set up filter elements
      document.body.innerHTML += `
        <input id="elective-search" value="test">
        <select id="grade-filter-tracker">
          <option value="5" selected>5. Sınıf</option>
        </select>
        <select id="status-filter-tracker">
          <option value="incomplete" selected>Eksik</option>
        </select>
      `;

      // Set up initial filter values to be cleared
      electiveTracker.filters.grade = '5';
      electiveTracker.filters.status = 'incomplete';
      electiveTracker.filters.search = 'test';

      const applyFiltersSpy = jest.spyOn(electiveTracker, 'applyFilters');

      // Ensure we are in the elective-tracker section so clearFilters resets internal filters
      electiveTracker.currentSection = 'elective-tracker';
      electiveTracker.clearFilters();

      expect(electiveTracker.filters).toEqual({ grade: '', status: '', search: '' });
      expect(document.getElementById('elective-search').value).toBe('');
      expect(document.getElementById('grade-filter-tracker').value).toBe('');
      expect(document.getElementById('status-filter-tracker').value).toBe('');
      expect(applyFiltersSpy).toHaveBeenCalled();
      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Filtreler temizlendi',
        'info'
      );
    });
  });

  describe('refreshData', () => {
    test('should refresh all data and show notification', async () => {
      const loadStatusesSpy = jest.spyOn(electiveTracker, 'loadElectiveStatuses')
        .mockResolvedValue();
      const loadStatisticsSpy = jest.spyOn(electiveTracker, 'loadStatistics')
        .mockResolvedValue();

      await electiveTracker.refreshData();

      expect(loadStatusesSpy).toHaveBeenCalled();
      expect(loadStatisticsSpy).toHaveBeenCalled();
      expect(window.lessonManager.showNotification).toHaveBeenCalledWith(
        'Veriler yenilendi',
        'success'
      );
    });
  });
});