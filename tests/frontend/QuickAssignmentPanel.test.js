/**
 * @jest-environment jsdom
 */

// Mock electron API
const mockElectronAPI = {
  electiveTracker: {
    updateStatus: jest.fn()
  },
  lesson: {
    getAll: jest.fn()
  },
  teacher: {
    getAll: jest.fn()
  },
  class: {
    getById: jest.fn()
  },
  schedule: {
    create: jest.fn(),
    getByClassAndTeacher: jest.fn()
  }
};

const mockLessonManager = {
  showNotification: jest.fn()
};

// Set up global window object
Object.defineProperty(global, 'window', {
  value: {
    electronAPI: mockElectronAPI,
    lessonManager: mockLessonManager
  },
  writable: true
});

// Mock QuickAssignmentManager class
class QuickAssignmentManager {
  constructor() {
    this.selectedClass = null;
    this.selectedElective = null;
    this.selectedTeacher = null;
    this.availableElectives = [];
    this.availableTeachers = [];
    this.conflictCheck = null;
  }

  async openModal(classId) {
    this.selectedClass = classId;
    await this.loadClassInfo(classId);
    await this.loadAvailableElectives();
    this.showModal();
  }

  async loadClassInfo(classId) {
    const classData = await window.electronAPI.class.getById(classId);
    if (classData) {
      const classNameEl = document.getElementById('modal-class-name');
      const classDetailsEl = document.getElementById('modal-class-details');
      
      if (classNameEl) classNameEl.textContent = classData.name;
      if (classDetailsEl) classDetailsEl.textContent = `${classData.grade}. Sınıf - ${classData.school_type}`;
    }
  }

  async loadAvailableElectives() {
    const allLessons = await window.electronAPI.lesson.getAll();
    this.availableElectives = allLessons.filter(lesson => 
      lesson.type === 'seçmeli' || lesson.type === 'elective'
    );
    this.renderElectiveGrid();
  }

  renderElectiveGrid() {
    const grid = document.getElementById('available-electives-grid');
    const noElectives = document.getElementById('no-electives');
    
    if (!grid) return;
    
    // Clear only elective items, not the no-electives element
    const electiveItems = grid.querySelectorAll('.elective-item');
    electiveItems.forEach(item => item.remove());
    
    if (this.availableElectives.length === 0) {
      if (noElectives) noElectives.style.display = 'flex';
      return;
    }
    
    if (noElectives) noElectives.style.display = 'none';
    
    this.availableElectives.forEach(elective => {
      const electiveItem = document.createElement('div');
      electiveItem.className = 'elective-item';
      electiveItem.dataset.electiveId = elective.id;
      electiveItem.innerHTML = `
        <div class="elective-name">${elective.name}</div>
        <div class="elective-hours">${elective.weekly_hours} saat/hafta</div>
      `;
      
      electiveItem.addEventListener('click', () => {
        this.onElectiveSelected(elective);
      });
      
      grid.appendChild(electiveItem);
    });
  }

  async onElectiveSelected(elective) {
    this.selectedElective = elective;
    
    // Update UI
    document.querySelectorAll('.elective-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`[data-elective-id="${elective.id}"]`);
    if (selectedItem) selectedItem.classList.add('selected');
    
    await this.loadAvailableTeachers(elective.id);
    this.updatePreview();
  }

  async loadAvailableTeachers(lessonId) {
    const allTeachers = await window.electronAPI.teacher.getAll();
    this.availableTeachers = allTeachers.filter(teacher => teacher.active !== false);
    this.renderTeacherSelect();
  }

  renderTeacherSelect() {
    const select = document.getElementById('teacher-select');
    if (!select) return;
    
    select.innerHTML = '';
    
    if (this.availableTeachers.length === 0) {
      select.innerHTML = '<option value="">Uygun öğretmen bulunamadı</option>';
      select.disabled = true;
      return;
    }
    
    select.innerHTML = '<option value="">Öğretmen seçin</option>';
    
    this.availableTeachers.forEach(teacher => {
      const option = document.createElement('option');
      option.value = teacher.id;
      option.textContent = `${teacher.name} (${teacher.branch || 'Branş belirtilmemiş'})`;
      select.appendChild(option);
    });
    
    select.disabled = false;
  }

  async onTeacherSelected(teacherId) {
    if (!teacherId) {
      this.selectedTeacher = null;
      this.updatePreview();
      return;
    }
    
    this.selectedTeacher = this.availableTeachers.find(t => t.id == teacherId);
    if (this.selectedTeacher) {
      await this.checkConflicts();
      this.updatePreview();
    }
  }

  async checkConflicts() {
    this.conflictCheck = { hasConflict: false, conflicts: [] };
  }

  updatePreview() {
    const previewContent = document.getElementById('assignment-preview');
    if (!previewContent) return;
    
    if (!this.selectedElective || !this.selectedTeacher) {
      previewContent.innerHTML = `
        <div class="preview-placeholder">
          <p>Ders ve öğretmen seçimi yapın</p>
        </div>
      `;
      return;
    }
    
    previewContent.innerHTML = `
      <div class="preview-details">
        <div class="preview-item">
          <span class="preview-label">Seçmeli Ders:</span>
          <span class="preview-value">${this.selectedElective.name}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">Öğretmen:</span>
          <span class="preview-value">${this.selectedTeacher.name}</span>
        </div>
      </div>
    `;
  }

  async confirmAssignment() {
    if (!this.selectedClass || !this.selectedElective || !this.selectedTeacher) {
      return false;
    }
    
    const assignmentData = {
      class_id: this.selectedClass,
      lesson_id: this.selectedElective.id,
      teacher_id: this.selectedTeacher.id,
      weekly_hours: this.selectedElective.weekly_hours
    };
    
    const result = await window.electronAPI.schedule.create(assignmentData);
    
    if (result) {
      await window.electronAPI.electiveTracker.updateStatus(this.selectedClass);
      this.closeModal();
      return true;
    }
    
    return false;
  }

  showModal() {
    const modal = document.getElementById('quick-assignment-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal() {
    const modal = document.getElementById('quick-assignment-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      this.resetForm();
    }
  }

  resetForm() {
    this.selectedClass = null;
    this.selectedElective = null;
    this.selectedTeacher = null;
    this.availableElectives = [];
    this.availableTeachers = [];
    this.conflictCheck = null;
  }
}

describe('QuickAssignmentPanel', () => {
  let quickAssignmentManager;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="quick-assignment-modal" class="quick-assignment-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <div class="class-info" id="selected-class-info">
              <span class="class-name" id="modal-class-name">Sınıf seçilmedi</span>
              <span class="class-details" id="modal-class-details"></span>
            </div>
          </div>
          <div class="modal-body">
            <div class="available-electives">
              <div class="elective-grid" id="available-electives-grid">
                <div class="no-electives" id="no-electives">
                  <p>Seçmeli ders bulunamadı</p>
                </div>
              </div>
            </div>
            <div class="teacher-selection">
              <select id="teacher-select">
                <option value="">Önce seçmeli ders seçin</option>
              </select>
            </div>
            <div class="assignment-preview">
              <div class="preview-content" id="assignment-preview">
                <div class="preview-placeholder">
                  <p>Ders ve öğretmen seçimi yapın</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    quickAssignmentManager = new QuickAssignmentManager();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('openModal', () => {
    test('should load class info and available electives', async () => {
      const mockClassData = {
        id: 1,
        name: '5/A',
        grade: 5,
        school_type: 'Ortaokul'
      };

      const mockLessons = [
        { id: 1, name: 'Müzik', type: 'seçmeli', weekly_hours: 2 },
        { id: 2, name: 'Resim', type: 'seçmeli', weekly_hours: 2 },
        { id: 3, name: 'Matematik', type: 'zorunlu', weekly_hours: 4 }
      ];

      window.electronAPI.class.getById.mockResolvedValue(mockClassData);
      window.electronAPI.lesson.getAll.mockResolvedValue(mockLessons);

      await quickAssignmentManager.openModal(1);

      expect(window.electronAPI.class.getById).toHaveBeenCalledWith(1);
      expect(window.electronAPI.lesson.getAll).toHaveBeenCalled();
      
      const classNameEl = document.getElementById('modal-class-name');
      const classDetailsEl = document.getElementById('modal-class-details');
      
      expect(classNameEl.textContent).toBe('5/A');
      expect(classDetailsEl.textContent).toBe('5. Sınıf - Ortaokul');
      
      // Should only show elective lessons
      expect(quickAssignmentManager.availableElectives).toHaveLength(2);
      expect(quickAssignmentManager.availableElectives[0].name).toBe('Müzik');
      expect(quickAssignmentManager.availableElectives[1].name).toBe('Resim');
    });
  });

  describe('loadAvailableElectives', () => {
    test('should filter and display only elective lessons', async () => {
      const mockLessons = [
        { id: 1, name: 'Müzik', type: 'seçmeli', weekly_hours: 2 },
        { id: 2, name: 'Matematik', type: 'zorunlu', weekly_hours: 4 },
        { id: 3, name: 'Resim', type: 'elective', weekly_hours: 2 }
      ];

      window.electronAPI.lesson.getAll.mockResolvedValue(mockLessons);

      await quickAssignmentManager.loadAvailableElectives();

      expect(quickAssignmentManager.availableElectives).toHaveLength(2);
      expect(quickAssignmentManager.availableElectives[0].name).toBe('Müzik');
      expect(quickAssignmentManager.availableElectives[1].name).toBe('Resim');
      
      const grid = document.getElementById('available-electives-grid');
      const electiveItems = grid.querySelectorAll('.elective-item');
      expect(electiveItems).toHaveLength(2);
    });

    test('should show no electives message when none available', async () => {
      window.electronAPI.lesson.getAll.mockResolvedValue([]);

      await quickAssignmentManager.loadAvailableElectives();

      const noElectives = document.getElementById('no-electives');
      expect(noElectives).toBeTruthy();
      expect(noElectives.style.display).toBe('flex');
      expect(quickAssignmentManager.availableElectives).toHaveLength(0);
    });
  });

  describe('onElectiveSelected', () => {
    test('should select elective and load available teachers', async () => {
      const mockElective = { id: 1, name: 'Müzik', weekly_hours: 2 };
      const mockTeachers = [
        { id: 1, name: 'Ahmet Öğretmen', branch: 'Müzik', active: true },
        { id: 2, name: 'Ayşe Öğretmen', branch: 'Resim', active: true },
        { id: 3, name: 'Mehmet Öğretmen', branch: 'Müzik', active: false }
      ];

      window.electronAPI.teacher.getAll.mockResolvedValue(mockTeachers);

      // Add elective item to DOM
      const grid = document.getElementById('available-electives-grid');
      grid.innerHTML = `<div class="elective-item" data-elective-id="1"></div>`;

      await quickAssignmentManager.onElectiveSelected(mockElective);

      expect(quickAssignmentManager.selectedElective).toBe(mockElective);
      expect(quickAssignmentManager.availableTeachers).toHaveLength(2); // Only active teachers
      
      const selectedItem = document.querySelector('[data-elective-id="1"]');
      expect(selectedItem.classList.contains('selected')).toBe(true);
    });
  });

  describe('loadAvailableTeachers', () => {
    test('should populate teacher select with active teachers', async () => {
      const mockTeachers = [
        { id: 1, name: 'Ahmet Öğretmen', branch: 'Müzik', active: true },
        { id: 2, name: 'Ayşe Öğretmen', branch: 'Resim', active: false }
      ];

      window.electronAPI.teacher.getAll.mockResolvedValue(mockTeachers);

      await quickAssignmentManager.loadAvailableTeachers(1);

      const select = document.getElementById('teacher-select');
      const options = select.querySelectorAll('option');
      
      expect(options).toHaveLength(2); // Default option + 1 active teacher
      expect(options[0].value).toBe('');
      expect(options[1].value).toBe('1');
      expect(options[1].textContent).toBe('Ahmet Öğretmen (Müzik)');
      expect(select.disabled).toBe(false);
    });

    test('should disable select when no teachers available', async () => {
      window.electronAPI.teacher.getAll.mockResolvedValue([]);

      await quickAssignmentManager.loadAvailableTeachers(1);

      const select = document.getElementById('teacher-select');
      expect(select.disabled).toBe(true);
      expect(select.innerHTML).toContain('Uygun öğretmen bulunamadı');
    });
  });

  describe('updatePreview', () => {
    test('should show preview when both elective and teacher selected', () => {
      quickAssignmentManager.selectedElective = { id: 1, name: 'Müzik', weekly_hours: 2 };
      quickAssignmentManager.selectedTeacher = { id: 1, name: 'Ahmet Öğretmen' };

      quickAssignmentManager.updatePreview();

      const previewContent = document.getElementById('assignment-preview');
      expect(previewContent.innerHTML).toContain('Müzik');
      expect(previewContent.innerHTML).toContain('Ahmet Öğretmen');
    });

    test('should show placeholder when selections incomplete', () => {
      quickAssignmentManager.selectedElective = null;
      quickAssignmentManager.selectedTeacher = null;

      quickAssignmentManager.updatePreview();

      const previewContent = document.getElementById('assignment-preview');
      expect(previewContent.innerHTML).toContain('Ders ve öğretmen seçimi yapın');
    });
  });

  describe('confirmAssignment', () => {
    test('should create assignment when all selections made', async () => {
      quickAssignmentManager.selectedClass = 1;
      quickAssignmentManager.selectedElective = { id: 1, name: 'Müzik', weekly_hours: 2 };
      quickAssignmentManager.selectedTeacher = { id: 1, name: 'Ahmet Öğretmen' };

      window.electronAPI.schedule.create.mockResolvedValue({ id: 1 });

      const result = await quickAssignmentManager.confirmAssignment();

      expect(window.electronAPI.schedule.create).toHaveBeenCalledWith({
        class_id: 1,
        lesson_id: 1,
        teacher_id: 1,
        weekly_hours: 2
      });
      expect(window.electronAPI.electiveTracker.updateStatus).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    test('should return false when selections incomplete', async () => {
      quickAssignmentManager.selectedClass = null;

      const result = await quickAssignmentManager.confirmAssignment();

      expect(result).toBe(false);
      expect(window.electronAPI.schedule.create).not.toHaveBeenCalled();
    });
  });

  describe('modal operations', () => {
    test('should show modal with active class', () => {
      quickAssignmentManager.showModal();

      const modal = document.getElementById('quick-assignment-modal');
      expect(modal.classList.contains('active')).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
    });

    test('should close modal and reset form', () => {
      quickAssignmentManager.selectedClass = 1;
      quickAssignmentManager.selectedElective = { id: 1, name: 'Müzik' };

      quickAssignmentManager.closeModal();

      const modal = document.getElementById('quick-assignment-modal');
      expect(modal.classList.contains('active')).toBe(false);
      expect(document.body.style.overflow).toBe('');
      expect(quickAssignmentManager.selectedClass).toBe(null);
      expect(quickAssignmentManager.selectedElective).toBe(null);
    });
  });
});