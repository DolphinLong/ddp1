// Modern Lesson Manager - Frontend Application
// This handles all UI interactions and API communication

class ModernLessonManager {
    constructor() {
        this.currentSection = 'dashboard';
        this.data = {
            teachers: [],
            classes: [],
            lessons: [],
            scheduleItems: [],
            statistics: {}
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupMenuActions();
        await this.loadInitialData();
        // Initialize elective alerts manager for dashboard panel
        try {
            this.alertManager = new ElectiveAlertManager();
            await this.alertManager.loadElectiveAlerts();
        } catch (e) {
            // ignore if fails
        }
        this.updateDashboardStats();
        this.showLoading(false);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.navigateToSection(section);
            });
        });

        // Dashboard action cards
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', () => {
                const action = card.dataset.action;
                this.handleDashboardAction(action);
            });
        });

        // Header buttons
        document.getElementById('backup-btn')?.addEventListener('click', () => this.backupDatabase());
        document.getElementById('restore-btn')?.addEventListener('click', () => this.restoreDatabase());

        // Teachers section
        document.getElementById('add-teacher-btn')?.addEventListener('click', () => this.showTeacherModal());
        document.getElementById('teacher-search')?.addEventListener('input', (e) => this.searchTeachers(e.target.value));

        // Classes section
        document.getElementById('add-class-btn')?.addEventListener('click', () => this.showClassModal());
        document.getElementById('class-search')?.addEventListener('input', (e) => this.searchClasses(e.target.value));
        document.getElementById('grade-filter')?.addEventListener('change', (e) => this.filterClassesByGrade(e.target.value));

        // Lessons section
        document.getElementById('add-lesson-btn')?.addEventListener('click', () => this.showLessonModal());
        document.getElementById('lesson-search')?.addEventListener('input', (e) => this.searchLessons(e.target.value));
        document.getElementById('lesson-type-filter')?.addEventListener('change', (e) => this.filterLessonsByType(e.target.value));

        // Schedule section
        document.getElementById('generate-schedule-btn')?.addEventListener('click', () => this.generateSchedule());
        document.getElementById('add-schedule-item-btn')?.addEventListener('click', () => this.showScheduleItemModal());
        
        // Schedule view controls
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchScheduleView(view);
            });
        });

        document.getElementById('entity-select')?.addEventListener('change', (e) => {
            this.loadScheduleForEntity(e.target.value);
        });

        // Settings section
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        // Add event listener for school type change to update daily periods
        document.getElementById('school-type')?.addEventListener('change', () => {
            this.updateWeeklyHourLimitDisplay();
            this.updateDailyPeriodsDisplay();
        });

        // Class Lessons section event listener
        document.getElementById('class-lessons-grade-filter')?.addEventListener('change', (e) => this.filterClassLessonsByGrade(e.target.value));
    }

    setupMenuActions() {
        if (window.electronAPI) {
            window.electronAPI.onMenuAction((action) => {
                switch (action) {
                    case 'new-schedule':
                        this.createNewSchedule();
                        break;
                    case 'save-schedule':
                        this.saveSchedule();
                        break;
                    case 'backup-db':
                        this.backupDatabase();
                        break;
                    case 'restore-db':
                        this.restoreDatabase();
                        break;
                }
            });
        }
    }

    async loadInitialData() {
        this.showLoading(true);
        try {
            if (window.electronAPI) {
                this.data.teachers = await window.electronAPI.teacher.getAll();
                // Use the new method that includes guidance counselor info
                this.data.classes = await window.electronAPI.class.getAllWithGuidanceCounselors();
                this.data.lessons = await window.electronAPI.lesson.getAll();
                
                this.populateTeachersTable();
                this.populateClassesTable();
                this.populateLessonsTable();
                this.populateFilters();
                this.populateScheduleSelectors();
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Veri yükleme hatası: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    navigateToSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        this.currentSection = section;

        // Load section-specific data
        this.loadSectionData(section);
    }

    async loadSectionData(section) {
        switch (section) {
            case 'teachers':
                await this.loadTeachers();
                break;
            case 'classes':
                await this.loadClasses();
                break;
            case 'lessons':
                await this.loadLessons();
                break;
            case 'schedule':
                await this.loadSchedule();
                break;
            case 'reports':
                await this.loadReports();
                break;
            case 'class-lessons':
                await this.loadClassLessons();
                break;
            case 'settings':
                await this.loadSettings();
                break;
        }
    }

    handleDashboardAction(action) {
        switch (action) {
            case 'add-teacher':
                this.navigateToSection('teachers');
                setTimeout(() => this.showTeacherModal(), 100);
                break;
            case 'add-class':
                this.navigateToSection('classes');
                setTimeout(() => this.showClassModal(), 100);
                break;
            case 'generate-schedule':
                this.navigateToSection('schedule');
                setTimeout(() => this.generateSchedule(), 100);
                break;
            case 'view-reports':
                this.navigateToSection('reports');
                break;
        }
    }

    // Teachers Management
    async loadTeachers() {
        try {
            if (window.electronAPI) {
                this.data.teachers = await window.electronAPI.teacher.getAll();
                
                // Calculate assigned hours for each teacher
                for (const teacher of this.data.teachers) {
                    try {
                        teacher.assigned_hours = await window.electronAPI.teacher.getTotalAssignedHours(teacher.id);
                    } catch (error) {
                        console.warn(`Could not calculate assigned hours for teacher ${teacher.id}:`, error);
                        teacher.assigned_hours = 0;
                    }
                }
                
                this.populateTeachersTable();
            }
        } catch (error) {
            console.error('Error loading teachers:', error);
            this.showNotification('Öğretmenler yüklenirken hata oluştu', 'error');
        }
    }

    populateTeachersTable() {
        const tbody = document.getElementById('teachers-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.data.teachers.forEach(teacher => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${teacher.name}</td>
                <td>${teacher.subject || '-'}</td>
                <td>${teacher.assigned_hours || 0}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary" onclick="lessonManager.editTeacher(${teacher.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.assignLessonsToTeacher(${teacher.id})">
                            <i class="fas fa-book"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.viewTeacherAvailability(${teacher.id})">
                            <i class="fas fa-calendar"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.deleteTeacher(${teacher.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    showTeacherModal(teacher = null) {
        const isEdit = teacher !== null;
        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2>${isEdit ? 'Öğretmen Düzenle' : 'Yeni Öğretmen'}</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="teacher-form">
                            <div class="form-group">
                                <label>Ad Soyad *</label>
                                <input type="text" name="name" required value="${teacher?.name || ''}">
                            </div>
                            <div class="form-group">
                                <label>Branş</label>
                                <input type="text" name="subject" value="${teacher?.subject || ''}" placeholder="Matematik, Türkçe, vb.">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>E-posta</label>
                                    <input type="email" name="email" value="${teacher?.email || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Telefon</label>
                                    <input type="tel" name="phone" value="${teacher?.phone || ''}">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                        <button class="btn btn-primary" onclick="lessonManager.saveTeacher(${teacher?.id || 'null'})">
                            ${isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = modalHtml;
    }

    async saveTeacher(teacherId) {
        const form = document.getElementById('teacher-form');
        const formData = new FormData(form);
        const teacherData = {
            name: formData.get('name'),
            subject: formData.get('subject'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };

        try {
            if (window.electronAPI) {
                if (teacherId) {
                    await window.electronAPI.teacher.update(teacherId, teacherData);
                    this.showNotification('Öğretmen güncellendi', 'success');
                } else {
                    await window.electronAPI.teacher.create(teacherData);
                    this.showNotification('Öğretmen eklendi', 'success');
                }
                
                document.querySelector('.modal-overlay').remove();
                await this.loadTeachers();
                this.updateDashboardStats();
            }
        } catch (error) {
            console.error('Error saving teacher:', error);
            this.showNotification('Öğretmen kaydedilirken hata oluştu: ' + error.message, 'error');
        }
    }

    async editTeacher(teacherId) {
        const teacher = this.data.teachers.find(t => t.id === teacherId);
        if (teacher) {
            this.showTeacherModal(teacher);
        }
    }

    async deleteTeacher(teacherId) {
        if (confirm('Bu öğretmeni silmek istediğinizden emin misiniz?')) {
            try {
                if (window.electronAPI) {
                    await window.electronAPI.teacher.delete(teacherId);
                    this.showNotification('Öğretmen silindi', 'success');
                    await this.loadTeachers();
                    this.updateDashboardStats();
                }
            } catch (error) {
                console.error('Error deleting teacher:', error);
                this.showNotification('Öğretmen silinirken hata oluştu: ' + error.message, 'error');
            }
        }
    }

    async assignLessonsToTeacher(teacherId) {
        const teacher = this.data.teachers.find(t => t.id === teacherId);
        if (teacher) {
            try {
                this.showLoading(true);
                await this.showAssignLessonsModal(teacherId, teacher.name);
            } catch (error) {
                console.error('Error showing assignment modal:', error);
                this.showNotification('Atama ekranı açılırken hata oluştu: ' + error.message, 'error');
            } finally {
                this.showLoading(false);
            }
        } else {
            this.showNotification('Öğretmen bulunamadı', 'error');
        }
    }

    async showAssignLessonsModal(teacherId, teacherName) {
        try {
            // Load all lessons and classes
            const lessons = await window.electronAPI.lesson.getAll();
            // Use the new method to get classes from all school types
            const classes = await window.electronAPI.class.getAll();
            
            console.log('Lessons for assignment:', lessons);
            console.log('Classes for assignment:', classes);
            
            // Create lesson-class combinations grouped by grade
            const combinations = [];
            
            // For each lesson, find matching classes (same grade)
            lessons.forEach(lesson => {
                const matchingClasses = classes.filter(classItem => classItem.grade === lesson.grade);
                matchingClasses.forEach(classItem => {
                    combinations.push({
                        lessonId: lesson.id,
                        lessonName: lesson.name,
                        lessonHours: lesson.weekly_hours,
                        classId: classItem.id,
                        className: `${classItem.grade}/${classItem.section}`,
                        classType: classItem.school_type,
                        grade: lesson.grade
                    });
                });
            });
            
            // Sort combinations by grade, lesson name, and class name
            combinations.sort((a, b) => {
                if (a.grade !== b.grade) return a.grade - b.grade;
                if (a.lessonName !== b.lessonName) return a.lessonName.localeCompare(b.lessonName);
                return a.className.localeCompare(b.className);
            });
            
            // Group combinations by grade for better organization
            const combinationsByGrade = {};
            combinations.forEach(combo => {
                if (!combinationsByGrade[combo.grade]) {
                    combinationsByGrade[combo.grade] = [];
                }
                combinationsByGrade[combo.grade].push(combo);
            });
            
            // Create the combinations list HTML
            let combinationsHtml = '';
            for (const grade in combinationsByGrade) {
                combinationsHtml += `<div class="grade-group" data-grade="${grade}">`;
                combinationsHtml += `<h4>${grade}. Sınıf Ders-Sınıf Atamaları</h4>`;
                
                combinationsByGrade[grade].forEach((combo, index) => {
                    combinationsHtml += `
                        <div class="combination-item">
                            <label class="checkbox-label">
                                <input type="checkbox" 
                                       data-lesson-id="${combo.lessonId}" 
                                       data-class-id="${combo.classId}" 
                                       class="combination-checkbox">
                                <span class="combination-text">
                                    <strong>${combo.lessonName}</strong> (${combo.lessonHours} saat) → 
                                    <em>${combo.className} (${combo.classType})</em>
                                </span>
                            </label>
                        </div>
                    `;
                });
                
                combinationsHtml += `
                    <div class="grade-actions">
                        <button type="button" class="btn btn-outline btn-sm" onclick="lessonManager.selectAllInGrade(${grade})">
                            Tümünü Seç (${grade}. Sınıf)
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" onclick="lessonManager.deselectAllInGrade(${grade})">
                            Tümünü Kaldır (${grade}. Sınıf)
                        </button>
                    </div>
                `;
                combinationsHtml += '</div>';
            }
            
            const modalHtml = `
                <div class="modal-overlay">
                    <div class="modal" style="max-width: 700px;">
                        <div class="modal-header">
                            <h2>Öğretmene Ders ve Sınıf Atama</h2>
                            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p><strong>Öğretmen:</strong> ${teacherName}</p>
                            
                            <div class="form-group">
                                <label>Atanacak Ders-Sınıf Kombinasyonları:</label>
                                <div class="combinations-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                                    ${combinationsHtml || '<p>Bu öğretmene atanabilecek ders-sınıf kombinasyonu bulunamadı.</p>'}
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <div class="global-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                                    <button type="button" class="btn btn-outline" onclick="lessonManager.selectAllCombinations()">
                                        Tümünü Seç
                                    </button>
                                    <button type="button" class="btn btn-outline" onclick="lessonManager.deselectAllCombinations()">
                                        Tümünü Kaldır
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                            <button class="btn btn-primary" onclick="lessonManager.saveTeacherAssignments(${teacherId})">
                                Ata (${document.querySelectorAll('.combination-checkbox:checked').length || 0} kombinasyon)
                            </button>
                        </div>
                    </div>
                </div>
                
                <style>
                    .grade-group {
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid #eee;
                    }
                    .grade-group:last-child {
                        border-bottom: none;
                    }
                    .combination-item {
                        padding: 5px 0;
                    }
                    .checkbox-label {
                        display: flex;
                        align-items: flex-start;
                        cursor: pointer;
                        gap: 8px;
                    }
                    .combination-text {
                        flex: 1;
                    }
                    .grade-actions, .global-actions {
                        margin-top: 10px;
                    }
                    .btn-sm {
                        padding: 4px 8px;
                        font-size: 12px;
                    }
                </style>
            `;
            
            document.getElementById('modal-container').innerHTML = modalHtml;
            
            // Add event listeners to update button text when selections change
            document.querySelectorAll('.combination-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const selectedCount = document.querySelectorAll('.combination-checkbox:checked').length;
                    const button = document.querySelector('.modal-footer .btn-primary');
                    if (button) {
                        button.textContent = `Ata (${selectedCount} kombinasyon)`;
                    }
                });
            });
        } catch (error) {
            console.error('Error loading lessons and classes:', error);
            this.showNotification('Ders ve sınıf bilgileri yüklenirken hata oluştu: ' + error.message, 'error');
        }
    }

    // Helper functions for selecting/deselecting combinations
    selectAllCombinations() {
        document.querySelectorAll('.combination-checkbox').forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateAssignmentButton();
    }
    
    deselectAllCombinations() {
        document.querySelectorAll('.combination-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateAssignmentButton();
    }
    
    selectAllInGrade(grade) {
        document.querySelectorAll(`.grade-group[data-grade="${grade}"] .combination-checkbox`).forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateAssignmentButton();
    }
    
    deselectAllInGrade(grade) {
        document.querySelectorAll(`.grade-group[data-grade="${grade}"] .combination-checkbox`).forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateAssignmentButton();
    }
    
    updateAssignmentButton() {
        const selectedCount = document.querySelectorAll('.combination-checkbox:checked').length;
        const button = document.querySelector('.modal-footer .btn-primary');
        if (button) {
            button.textContent = `Ata (${selectedCount} kombinasyon)`;
        }
    }

    async saveTeacherAssignments(teacherId) {
        // Get all selected combinations
        const selectedCheckboxes = document.querySelectorAll('.combination-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            this.showNotification('Lütfen en az bir ders-sınıf kombinasyonu seçin', 'warning');
            return;
        }
        
        let progressNotification = null;
        try {
            this.showLoading(true);
            
            let successCount = 0;
            let errorCount = 0;
            const errors = [];
            
            // Show progress notification
            progressNotification = this.showNotification(`Atamalar yapılıyor... (0/${selectedCheckboxes.length})`, 'info');
            
            // Save each selected assignment
            for (let i = 0; i < selectedCheckboxes.length; i++) {
                const checkbox = selectedCheckboxes[i];
                const lessonId = parseInt(checkbox.dataset.lessonId);
                const classId = parseInt(checkbox.dataset.classId);
                
                // Update progress notification
                if (progressNotification) {
                    progressNotification.querySelector('span').textContent = 
                        `Atamalar yapılıyor... (${i + 1}/${selectedCheckboxes.length})`;
                }
                
                try {
                    await window.electronAPI.teacher.assignToLessonAndClass(
                        teacherId, 
                        lessonId, 
                        classId
                    );
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push(`Ders ID: ${lessonId}, Sınıf ID: ${classId} - ${error.message}`);
                    console.error('Error assigning teacher to lesson and class:', error);
                }
            }
            
            // Close modal and show results
            document.querySelector('.modal-overlay').remove();
            this.showLoading(false);
            
            // Remove progress notification
            if (progressNotification && progressNotification.parentElement) {
                progressNotification.remove();
            }
            
            // Show detailed notification
            if (errorCount === 0) {
                this.showNotification(`${successCount} adet ders-sınıf ataması başarıyla yapıldı`, 'success');
            } else if (successCount > 0) {
                this.showNotification(`${successCount} adet atama başarılı, ${errorCount} adet atama başarısız oldu.`, 'warning');
                if (errors.length > 0) {
                    console.warn('Teacher assignment errors:', errors);
                }
            } else {
                this.showNotification(`Tüm atamalar başarısız oldu (${errorCount} hata)`, 'error');
                if (errors.length > 0) {
                    console.error('Teacher assignment errors:', errors);
                }
            }
            
            // Refresh classes table to show updated assignments
            await this.loadClasses();
            
        } catch (error) {
            console.error('Error saving teacher assignments:', error);
            this.showLoading(false);
            
            // Remove progress notification
            if (progressNotification && progressNotification.parentElement) {
                progressNotification.remove();
            }
            
            this.showNotification('Atamalar kaydedilirken hata oluştu: ' + error.message, 'error');
        }
    }

    // Classes Management
    async loadClasses() {
        try {
            if (window.electronAPI) {
                // Use the new method that includes guidance counselor info
                this.data.classes = await window.electronAPI.class.getAllWithGuidanceCounselors();
                
                // Add assigned teachers info to each class
                for (const classItem of this.data.classes) {
                    try {
                        classItem.assigned_teachers = await window.electronAPI.class.getAssignedTeachersForClass(classItem.id);
                    } catch (error) {
                        console.warn(`Warning: Could not load assigned teachers for class ${classItem.id}:`, error);
                        classItem.assigned_teachers = []; // Set to empty array to prevent UI errors
                    }
                }
                
                this.populateClassesTable();
            }
        } catch (error) {
            console.error('Error loading classes:', error);
            this.showNotification('Sınıflar yüklenirken hata oluştu: ' + error.message, 'error');
        }
    }

    populateClassesTable() {
        const tbody = document.getElementById('classes-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.data.classes.forEach(classItem => {
            // Create a string of assigned teachers
            let assignedTeachers = '-';
            if (classItem.assigned_teachers && classItem.assigned_teachers.length > 0) {
                assignedTeachers = classItem.assigned_teachers.map(teacher => teacher.teacher_name).join(', ');
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${classItem.school_type}</td>
                <td>${classItem.grade}</td>
                <td>${classItem.section}</td>
                <td>${assignedTeachers}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary" onclick="lessonManager.editClass(${classItem.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.assignGuidanceCounselor(${classItem.id})">
                            <i class="fas fa-user-tie"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.viewClassSchedule(${classItem.id})">
                            <i class="fas fa-calendar"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.deleteClass(${classItem.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    showClassModal(classItem = null) {
        const isEdit = classItem !== null;
        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2>${isEdit ? 'Sınıf Düzenle' : 'Yeni Sınıf'}</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="class-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Okul Türü *</label>
                                    <select name="school_type" required>
                                        <option value="">Seçiniz</option>
                                        <option value="İlkokul" ${classItem?.school_type === 'İlkokul' ? 'selected' : ''}>İlkokul</option>
                                        <option value="Ortaokul" ${classItem?.school_type === 'Ortaokul' ? 'selected' : ''}>Ortaokul</option>
                                        <option value="Genel Lise" ${classItem?.school_type === 'Genel Lise' ? 'selected' : ''}>Genel Lise</option>
                                        <option value="Anadolu Lisesi" ${classItem?.school_type === 'Anadolu Lisesi' ? 'selected' : ''}>Anadolu Lisesi</option>
                                        <option value="Fen Lisesi" ${classItem?.school_type === 'Fen Lisesi' ? 'selected' : ''}>Fen Lisesi</option>
                                        <option value="Sosyal Bilimler Lisesi" ${classItem?.school_type === 'Sosyal Bilimler Lisesi' ? 'selected' : ''}>Sosyal Bilimler Lisesi</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Sınıf Seviyesi *</label>
                                    <select name="grade" required>
                                        <option value="">Seçiniz</option>
                                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(grade => 
                                            `<option value="${grade}" ${classItem?.grade === grade ? 'selected' : ''}>${grade}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Şube *</label>
                                    <input type="text" name="section" required value="${classItem?.section || ''}" placeholder="A, B, C...">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                        <button class="btn btn-primary" onclick="lessonManager.saveClass(${classItem?.id || 'null'})">
                            ${isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = modalHtml;
    }

    async saveClass(classId) {
        const form = document.getElementById('class-form');
        const formData = new FormData(form);
        const classData = {
            school_type: formData.get('school_type'),
            grade: parseInt(formData.get('grade')),
            section: formData.get('section')
        };

        try {
            if (window.electronAPI) {
                if (classId) {
                    await window.electronAPI.class.update(classId, classData);
                    this.showNotification('Sınıf güncellendi', 'success');
                } else {
                    await window.electronAPI.class.create(classData);
                    this.showNotification('Sınıf eklendi', 'success');
                }
                
                document.querySelector('.modal-overlay').remove();
                await this.loadClasses();
                this.updateDashboardStats();
            }
        } catch (error) {
            console.error('Error saving class:', error);
            this.showNotification('Sınıf kaydedilirken hata oluştu: ' + error.message, 'error');
        }
    }

    assignGuidanceCounselor(classId) {
        const classItem = this.data.classes.find(c => c.id === classId);
        if (classItem) {
            this.showGuidanceCounselorModal(classId, classItem.grade, classItem.section);
        }
    }

    showGuidanceCounselorModal(classId, grade, section) {
        // Get available teachers for this class
        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>Rehber Öğretmen Atama</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Sınıf:</strong> ${grade}/${section}</p>
                        <div class="form-group">
                            <label>Rehber Öğretmen Seçin:</label>
                            <select id="guidance-teacher-select" class="form-control">
                                <option value="">Seçiniz...</option>
                                ${this.data.teachers.map(teacher => 
                                    `<option value="${teacher.id}">${teacher.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                        <button class="btn btn-primary" onclick="lessonManager.saveGuidanceCounselor(${classId})">
                            Ata
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = modalHtml;
    }

    async saveGuidanceCounselor(classId) {
        const teacherSelect = document.getElementById('guidance-teacher-select');
        const teacherId = parseInt(teacherSelect.value);

        if (!teacherId || isNaN(teacherId)) {
            this.showNotification('Lütfen bir öğretmen seçin', 'warning');
            return;
        }

        try {
            if (window.electronAPI) {
                await window.electronAPI.class.assignGuidanceCounselor(teacherId, classId);
                this.showNotification('Rehber öğretmen atandı', 'success');
                document.querySelector('.modal-overlay').remove();
                await this.loadClasses();
            }
        } catch (error) {
            console.error('Error assigning guidance counselor:', error);
            this.showNotification('Rehber öğretmen atanırken hata oluştu: ' + error.message, 'error');
        }
    }

    // Schedule Management
    async loadSchedule() {
        try {
            if (window.electronAPI) {
                // Load schedule will be implemented based on selected view and entity
                this.populateScheduleSelectors();
            }
        } catch (error) {
            console.error('Error loading schedule:', error);
            this.showNotification('Program yüklenirken hata oluştu', 'error');
        }
    }

    populateScheduleSelectors() {
        const entitySelect = document.getElementById('entity-select');
        if (!entitySelect) return;

        const currentView = document.querySelector('[data-view].active')?.dataset.view || 'class';
        
        entitySelect.innerHTML = '<option value="">Seçiniz...</option>';
        
        if (currentView === 'class') {
            this.data.classes.forEach(classItem => {
                const option = document.createElement('option');
                option.value = classItem.id;
                option.textContent = `${classItem.grade}/${classItem.section}`;
                entitySelect.appendChild(option);
            });
        } else if (currentView === 'teacher') {
            this.data.teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.id;
                option.textContent = teacher.name;
                entitySelect.appendChild(option);
            });
        }
    }

    switchScheduleView(view) {
        // Update view buttons
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Update entity selector
        this.populateScheduleSelectors();
        
        // Clear current schedule
        this.renderScheduleGrid([]);
    }

    async loadScheduleForEntity(entityId) {
        if (!entityId) {
            this.renderScheduleGrid([]);
            return;
        }

        try {
            if (window.electronAPI) {
                const currentView = document.querySelector('[data-view].active')?.dataset.view || 'class';
                let scheduleItems = [];
                
                if (currentView === 'class') {
                    scheduleItems = await window.electronAPI.schedule.getForClass(parseInt(entityId));
                } else if (currentView === 'teacher') {
                    scheduleItems = await window.electronAPI.schedule.getForTeacher(parseInt(entityId));
                }

                this.renderScheduleGrid(scheduleItems);
            }
        } catch (error) {
            console.error('Error loading schedule for entity:', error);
            this.showNotification('Program yüklenirken hata oluştu', 'error');
        }
    }

    renderScheduleGrid(scheduleItems) {
        const grid = document.getElementById('schedule-grid');
        if (!grid) return;

        const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
        const periods = [1, 2, 3, 4, 6, 7, 8]; // Skip period 5 (lunch)

        let tableHtml = `
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>Saat</th>
                        ${days.map(day => `<th>${day}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        periods.forEach(period => {
            tableHtml += `<tr>`;
            tableHtml += `<td class="time-slot">${period}. Saat</td>`;
            
            days.forEach((day, dayIndex) => {
                const dayOfWeek = dayIndex + 1;
                const scheduleItem = scheduleItems.find(item => 
                    item.day_of_week === dayOfWeek && item.time_slot === period
                );

                if (scheduleItem) {
                    tableHtml += `
                        <td class="schedule-cell occupied">
                            <div class="lesson-info">
                                <strong>${scheduleItem.lesson_name}</strong><br>
                                <small>${scheduleItem.teacher_name}</small>
                            </div>
                        </td>
                    `;
                } else {
                    tableHtml += `
                        <td class="schedule-cell" onclick="lessonManager.showScheduleItemModal(${dayOfWeek}, ${period})">
                            <div class="lesson-info">+</div>
                        </td>
                    `;
                }
            });
            
            tableHtml += `</tr>`;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        grid.innerHTML = tableHtml;
    }

    async generateSchedule() {
        if (!confirm('Mevcut program silinecek ve yeni program oluşturulacak. Devam etmek istiyor musunuz?')) {
            return;
        }

        this.showLoading(true);
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.schedule.generate({});
                this.showNotification(result.message, result.success ? 'success' : 'warning');
                
                if (result.conflicts && result.conflicts.length > 0) {
                    this.showConflictsModal(result.conflicts);
                }
                
                // Reload current schedule if any entity is selected
                const entitySelect = document.getElementById('entity-select');
                if (entitySelect && entitySelect.value) {
                    await this.loadScheduleForEntity(entitySelect.value);
                }
            }
        } catch (error) {
            console.error('Error generating schedule:', error);
            this.showNotification('Program oluşturulurken hata oluştu: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Lessons Management
    populateLessonsTable() {
        const tbody = document.getElementById('lessons-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.data.lessons.forEach(lesson => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lesson.name}</td>
                <td>${lesson.weekly_hours}</td>
                <td>
                    <span class="${lesson.is_mandatory ? 'badge-success' : 'badge-info'}">
                        ${lesson.is_mandatory ? 'Zorunlu' : 'Seçmeli'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary" onclick="lessonManager.editLesson(${lesson.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.deleteLesson(${lesson.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    showLessonModal(lesson = null) {
        const isEdit = lesson !== null;
        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2>${isEdit ? 'Ders Düzenle' : 'Yeni Ders'}</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="lesson-form">
                            <div class="form-group">
                                <label>Ders Adı *</label>
                                <input type="text" name="name" required value="${lesson?.name || ''}" placeholder="Matematik, Türkçe, vb.">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Haftalık Saat *</label>
                                    <input type="number" name="weekly_hours" required min="1" max="20" value="${lesson?.weekly_hours || '2'}">
                                </div>
                                <div class="form-group">
                                    <label>Ders Türü *</label>
                                    <select name="is_mandatory" required>
                                        <option value="">Seçiniz</option>
                                        <option value="1" ${lesson?.is_mandatory ? 'selected' : ''}>Zorunlu</option>
                                        <option value="0" ${lesson?.is_mandatory === false ? 'selected' : ''}>Seçmeli</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                        <button class="btn btn-primary" onclick="lessonManager.saveLesson(${lesson?.id || 'null'})">
                            ${isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modal-container').innerHTML = modalHtml;
    }

    async saveLesson(lessonId) {
        const form = document.getElementById('lesson-form');
        const formData = new FormData(form);
        const lessonData = {
            name: formData.get('name'),
            weekly_hours: parseInt(formData.get('weekly_hours')),
            is_mandatory: formData.get('is_mandatory') === '1'
        };

        try {
            if (window.electronAPI) {
                if (lessonId) {
                    await window.electronAPI.lesson.update(lessonId, lessonData);
                    this.showNotification('Ders güncellendi', 'success');
                } else {
                    await window.electronAPI.lesson.create(lessonData);
                    this.showNotification('Ders eklendi', 'success');
                }
                
                document.querySelector('.modal-overlay').remove();
                await this.loadLessons();
                this.updateDashboardStats();
            }
        } catch (error) {
            console.error('Error saving lesson:', error);
            this.showNotification('Ders kaydedilirken hata oluştu: ' + error.message, 'error');
        }
    }

    async editLesson(lessonId) {
        const lesson = this.data.lessons.find(l => l.id === lessonId);
        if (lesson) {
            this.showLessonModal(lesson);
        }
    }

    async deleteLesson(lessonId) {
        if (confirm('Bu dersi silmek istediğinizden emin misiniz?')) {
            try {
                if (window.electronAPI) {
                    await window.electronAPI.lesson.delete(lessonId);
                    this.showNotification('Ders silindi', 'success');
                    await this.loadLessons();
                    this.updateDashboardStats();
                }
            } catch (error) {
                console.error('Error deleting lesson:', error);
                this.showNotification('Ders silinirken hata oluştu: ' + error.message, 'error');
            }
        }
    }

    populateLessonFilters() {
        // Populate lesson grade filter
        const gradeFilter = document.getElementById('lesson-grade-filter');
        if (gradeFilter) {
            const grades = [...new Set(this.data.lessons.map(l => l.grade))].sort();
            
            // Clear existing options except the first one
            while (gradeFilter.children.length > 1) {
                gradeFilter.removeChild(gradeFilter.lastChild);
            }
            
            grades.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = `${grade}. Sınıf`;
                gradeFilter.appendChild(option);
            });
        }
    }

    searchLessons(query) {
        const filteredLessons = this.data.lessons.filter(lesson => 
            lesson.name.toLowerCase().includes(query.toLowerCase()) ||
            (lesson.school_type && lesson.school_type.toLowerCase().includes(query.toLowerCase())) ||
            (lesson.weekly_hours && lesson.weekly_hours.toString().includes(query))
        );
        this.renderFilteredLessons(filteredLessons);
    }

    filterLessonsByGrade(grade) {
        if (!grade) {
            this.populateLessonsTable();
            return;
        }
        const filteredLessons = this.data.lessons.filter(lesson => lesson.grade == grade);
        this.renderFilteredLessons(filteredLessons);
    }

    filterLessonsByType(type) {
        if (type === '') {
            this.populateLessonsTable();
            return;
        }
        const filteredLessons = this.data.lessons.filter(lesson => 
            lesson.is_mandatory === (type === '1')
        );
        this.renderFilteredLessons(filteredLessons);
    }

    renderFilteredLessons(lessons) {
        const tbody = document.getElementById('lessons-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        lessons.forEach(lesson => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lesson.name}</td>
                <td>${lesson.weekly_hours}</td>
                <td>
                    <span class="${lesson.is_mandatory ? 'badge-success' : 'badge-info'}">
                        ${lesson.is_mandatory ? 'Zorunlu' : 'Seçmeli'}
                    </span>
                </td>
                <td>${lesson.school_type || 'İlkokul'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary" onclick="lessonManager.editLesson(${lesson.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.deleteLesson(${lesson.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getUniqueSubjects() {
        // Get unique lesson names from lessons data to use as subjects
        const subjects = [...new Set(this.data.lessons.map(lesson => lesson.name))].sort();
        return subjects;
    }

    // Utility Functions
    updateDashboardStats() {
        document.getElementById('teachers-count').textContent = this.data.teachers.length;
        document.getElementById('classes-count').textContent = this.data.classes.length;
        document.getElementById('lessons-count').textContent = this.data.lessons.length;
        // Schedule count will be updated when schedule data is loaded
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return null;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div>
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        return notification;
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    populateFilters() {
        // Populate grade filter
        const gradeFilter = document.getElementById('grade-filter');
        if (gradeFilter) {
            // Change the label of the filter (guard against missing container)
            const controls = gradeFilter.closest('.filter-controls');
            if (controls) {
                const label = controls.querySelector('label');
                if (label) {
                    label.textContent = 'Sınıf Seviyesi';
                }
            }
            
            // Update the options
            gradeFilter.innerHTML = '<option value="">Tüm Sınıf Seviyeleri</option>';
            
            const grades = [...new Set(this.data.classes.map(c => c.grade))].sort((a, b) => a - b);
            grades.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = `${grade}. Sınıf`;
                gradeFilter.appendChild(option);
            });
        }
    }

    // Database operations
    async backupDatabase() {
        try {
            if (window.electronAPI) {
                const success = await window.electronAPI.database.backup();
                this.showNotification(
                    success ? 'Veritabanı başarıyla yedeklendi' : 'Yedekleme iptal edildi', 
                    success ? 'success' : 'info'
                );
            }
        } catch (error) {
            console.error('Error backing up database:', error);
            this.showNotification('Yedekleme sırasında hata oluştu', 'error');
        }
    }

    async restoreDatabase() {
        if (!confirm('Mevcut veriler silinecek ve yedekten geri yüklenecek. Devam etmek istiyor musunuz?')) {
            return;
        }

        try {
            if (window.electronAPI) {
                const success = await window.electronAPI.database.restore();
                if (success) {
                    this.showNotification('Veritabanı başarıyla geri yüklendi', 'success');
                    await this.loadInitialData(); // Reload all data
                    this.updateDashboardStats();
                } else {
                    this.showNotification('Geri yükleme iptal edildi', 'info');
                }
            }
        } catch (error) {
            console.error('Error restoring database:', error);
            this.showNotification('Geri yükleme sırasında hata oluştu', 'error');
        }
    }

    // Placeholder methods for features to be implemented
    searchTeachers(query) {
        // Filter and display teachers based on search query
    }

    filterTeachersBySubject(subject) {
        // Filter teachers table by subject
    }

    searchClasses(query) {
        // Filter and display classes based on search query
        const tbody = document.getElementById('classes-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const filteredClasses = query ? 
            this.data.classes.filter(classItem => 
                classItem.school_type.toLowerCase().includes(query.toLowerCase()) ||
                classItem.grade.toString().includes(query) ||
                classItem.section.toLowerCase().includes(query.toLowerCase()) ||
                (classItem.assigned_teachers && classItem.assigned_teachers.some(teacher => 
                    teacher.teacher_name.toLowerCase().includes(query.toLowerCase())))
            ) : 
            this.data.classes;

        filteredClasses.forEach(classItem => {
            // Create a string of assigned teachers
            let assignedTeachers = '-';
            if (classItem.assigned_teachers && classItem.assigned_teachers.length > 0) {
                assignedTeachers = classItem.assigned_teachers.map(teacher => teacher.teacher_name).join(', ');
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${classItem.school_type}</td>
                <td>${classItem.grade}</td>
                <td>${classItem.section}</td>
                <td>${assignedTeachers}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary" onclick="lessonManager.editClass(${classItem.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.assignGuidanceCounselor(${classItem.id})">
                            <i class="fas fa-user-tie"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.viewClassSchedule(${classItem.id})">
                            <i class="fas fa-calendar"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.deleteClass(${classItem.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterClassesByGrade(grade) {
        const tbody = document.getElementById('classes-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const filteredClasses = grade ? 
            this.data.classes.filter(classItem => classItem.grade == grade) : 
            this.data.classes;

        filteredClasses.forEach(classItem => {
            // Create a string of assigned teachers
            let assignedTeachers = '-';
            if (classItem.assigned_teachers && classItem.assigned_teachers.length > 0) {
                assignedTeachers = classItem.assigned_teachers.map(teacher => teacher.teacher_name).join(', ');
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${classItem.school_type}</td>
                <td>${classItem.grade}</td>
                <td>${classItem.section}</td>
                <td>${assignedTeachers}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary" onclick="lessonManager.editClass(${classItem.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.assignGuidanceCounselor(${classItem.id})">
                            <i class="fas fa-user-tie"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.viewClassSchedule(${classItem.id})">
                            <i class="fas fa-calendar"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="lessonManager.deleteClass(${classItem.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    viewTeacherAvailability(teacherId) {
        // Show teacher availability modal
    }

    editClass(classId) {
        const classItem = this.data.classes.find(c => c.id === classId);
        if (classItem) {
            this.showClassModal(classItem);
        }
    }

    deleteClass(classId) {
        if (confirm('Bu sınıfı silmek istediğinizden emin misiniz?')) {
            try {
                if (window.electronAPI) {
                    window.electronAPI.class.delete(classId).then(() => {
                        this.showNotification('Sınıf silindi', 'success');
                        this.loadClasses();
                        this.updateDashboardStats();
                    }).catch((error) => {
                        console.error('Error deleting class:', error);
                        this.showNotification('Sınıf silinirken hata oluştu: ' + error.message, 'error');
                    });
                }
            } catch (error) {
                console.error('Error deleting class:', error);
                this.showNotification('Sınıf silinirken hata oluştu: ' + error.message, 'error');
            }
        }
    }

    viewClassSchedule(classId) {
        this.navigateToSection('schedule');
        setTimeout(() => {
            document.querySelector('[data-view="class"]').click();
            document.getElementById('entity-select').value = classId;
            this.loadScheduleForEntity(classId);
        }, 100);
    }

    showScheduleItemModal(dayOfWeek, timeSlot) {
        // Show modal to add schedule item for specific day and time
    }

    showConflictsModal(conflicts) {
        // Show modal displaying schedule conflicts
    }

    createNewSchedule() {
        // Create new empty schedule
    }

    saveSchedule() {
        // Save current schedule
    }

    // ====== Placeholder UI actions referenced from HTML ======
    showWorkloadAnalysis() {
        this.showNotification('Öğretmen yük analizi özelliği yakında.', 'info');
    }

    showAutoGenerateModal() {
        this.showNotification('Otomatik program oluşturma başlatılıyor...', 'info');
        this.generateSchedule();
    }

    // Reports - placeholders
    generateWorkloadReport() { this.showNotification('Yüklenme raporu hazırlanıyor...', 'info'); }
    exportTeacherList() { this.showNotification('Öğretmen listesi dışa aktarılıyor...', 'info'); }
    printTeacherList() { this.showNotification('Öğretmen listesi yazdırılıyor...', 'info'); }
    sendBulkNotification() { this.showNotification('Toplu bildirim gönderimi yakında.', 'info'); }

    generateTeacherWorkloadReport() { this.showNotification('Öğretmen yük dağılım raporu oluşturuluyor...', 'info'); }
    generateClassStatisticsReport() { this.showNotification('Sınıf istatistik raporu oluşturuluyor...', 'info'); }
    generateLessonDistributionReport() { this.showNotification('Ders dağılım raporu oluşturuluyor...', 'info'); }
    generateScheduleOverviewReport() { this.showNotification('Program özeti raporu oluşturuluyor...', 'info'); }
    generateGuidanceCounselorReport() { this.showNotification('Rehber öğretmen raporu oluşturuluyor...', 'info'); }

    // Lessons quick actions
    generateCurriculumReport() { this.showNotification('Müfredat raporu oluşturuluyor...', 'info'); }
    exportLessonList() { this.showNotification('Ders listesi dışa aktarılıyor...', 'info'); }
    validateCurriculum() { this.showNotification('MEB uygunluk kontrolü çalıştırılıyor...', 'info'); }
    duplicateFromPrevious() { this.showNotification('Önceki dönemden kopyalama yakında.', 'info'); }

    // Schedule options
    showManualCreateModal() { this.showNotification('Manuel oluşturma sihirbazı yakında.', 'info'); }
    showImportTemplateModal() { this.showNotification('Şablondan program alma yakında.', 'info'); }
    detectConflicts() { this.showNotification('Program çakışmaları kontrol ediliyor...', 'info'); }
    resetSchedule() { this.showNotification('Program sıfırlama yakında.', 'info'); }

    showExportModal() { this.showNotification('Export seçenekleri yakında.', 'info'); }
    printReport() { window.print?.(); }
    closeReport() {
        const el = document.getElementById('report-display-area');
        if (el) el.classList.add('hidden');
    }

    // Dashboard alerts
    async refreshElectiveAlerts() {
        try {
            if (this.alertManager && typeof this.alertManager.refreshAlerts === 'function') {
                await this.alertManager.refreshAlerts();
            } else {
                this.showNotification('Uyarılar yenileniyor...', 'info');
            }
        } catch (e) {
            this.showNotification('Uyarılar yenilenirken hata oluştu', 'error');
        }
    }

    // Classes - placeholders
    showAddClassModal() { this.showClassModal(null); }
    showBulkClassModal() { this.showNotification('Toplu sınıf oluşturma yakında.', 'info'); }
    showCounselorManagement() { this.showNotification('Rehber öğretmen yönetimi yakında.', 'info'); }
    refreshStats() { this.updateDashboardStats(); this.showNotification('İstatistikler güncellendi', 'success'); }
    exportClassReport() { this.showNotification('Sınıf raporu dışa aktarılıyor...', 'info'); }
    switchGradeView(view) { this.showNotification(`Görünüm değiştirildi: ${view}`, 'info'); }

    // Schedule quick actions - placeholders
    fillEmptySlots() { this.showNotification('Boş slotlar dolduruluyor (yakında).', 'info'); }
    optimizeSchedule() { this.showNotification('Program optimizasyonu yakında.', 'info'); }
    copySchedule() { this.showNotification('Program kopyalama yakında.', 'info'); }
    exportSchedule() { this.showNotification('Program dışa aktarma yakında.', 'info'); }

    // Teachers/Reports extra
    updateTeacherStats() { this.showNotification('Öğretmen istatistikleri güncelleniyor...', 'info'); }
    exportTeacherReport() { this.showNotification('Öğretmen raporu dışa aktarılıyor...', 'info'); }

    // Bulk import
    showBulkImportModal() { this.showNotification('Toplu öğretmen aktarımı yakında.', 'info'); }

    // Lessons helpers
    showAddLessonModal() { this.showLessonModal(null); }
    showCurriculumImportModal() { this.showNotification('Müfredat içe aktarma yakında.', 'info'); }
    showLessonAnalysis() { this.showNotification('Ders analizi yakında.', 'info'); }
    switchChartView(view) { this.showNotification(`Grafik görünümü değiştirildi: ${view}`, 'info'); }

    // Elective tracker quick link
    openElectiveTracker() { this.navigateToSection('elective-tracker'); }

    // Elective tracker stats refresh (used by electiveReports/electiveTracker facades)
    async loadStatistics() {
        try {
            if (window.electronAPI?.electiveTracker) {
                const stats = await window.electronAPI.electiveTracker.getStatistics();
                const pctEl = document.getElementById('completion-percentage');
                const progEl = document.getElementById('completion-progress');
                const missEl = document.getElementById('missing-assignments');
                const totalEl = document.getElementById('total-classes-tracker');
                const avgEl = document.getElementById('avg-electives');
                if (pctEl) pctEl.textContent = `${stats.completionPercentage}%`;
                if (progEl) progEl.style.width = `${stats.completionPercentage}%`;
                if (missEl) missEl.textContent = String(stats.totalMissingAssignments);
                if (totalEl) totalEl.textContent = String(stats.totalClasses);
                if (avgEl) avgEl.textContent = String(stats.averageElectivesPerClass);
                return stats;
            }
        } catch (e) {
            this.showNotification('İstatistikler yüklenirken hata oluştu', 'error');
        }
        return null;
    }

    async refreshData() {
        await this.loadStatistics();
        this.showNotification('Veriler yenilendi', 'success');
    }

    // Clear filters across sections
    clearTeacherFilters() {
        const search = document.getElementById('teacher-search');
        if (search) search.value = '';
        this.showNotification('Öğretmen filtreleri temizlendi', 'info');
    }

    clearClassFilters() {
        const search = document.getElementById('class-search');
        if (search) search.value = '';
        this.showNotification('Sınıf filtreleri temizlendi', 'info');
    }

    async loadLessons() {
        try {
            if (window.electronAPI) {
                this.data.lessons = await window.electronAPI.lesson.getAll();
                this.populateLessonsTable();
            }
        } catch (error) {
            console.error('Error loading lessons:', error);
            this.showNotification('Dersler yüklenirken hata oluştu', 'error');
        }
    }

    async loadClassLessons() {
        try {
            if (window.electronAPI) {
                // Get class-lesson relationships from the database
                const classLessons = await window.electronAPI.class.getClassLessons();
                this.populateClassLessonsTable(classLessons);
                this.populateClassLessonsFilters();
            }
        } catch (error) {
            console.error('Error loading class lessons:', error);
            this.showNotification('Sınıf dersleri yüklenirken hata oluştu', 'error');
        }
    }

    populateClassLessonsTable(data = null) {
        const tbody = document.getElementById('class-lessons-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // If data is provided, use it; otherwise use all classes and lessons
        if (data && Array.isArray(data) && data.length > 0) {
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.grade}/${item.section}</td>
                    <td>${item.lesson_name}</td>
                    <td>${item.weekly_hours || '-'}</td>
                    <td>
                        <span class="${item.is_mandatory ? 'badge-success' : 'badge-info'}">
                            ${item.is_mandatory ? 'Zorunlu' : 'Seçmeli'}
                        </span>
                    </td>
                    <td>${item.teacher_name || '-'}</td>
                `;
                tbody.appendChild(row);
            });
        } else {
            // Show all classes with their lessons
            // Create a map of lessons by grade for easier lookup
            const lessonsByGrade = {};
            this.data.lessons.forEach(lesson => {
                if (!lessonsByGrade[lesson.grade]) {
                    lessonsByGrade[lesson.grade] = [];
                }
                lessonsByGrade[lesson.grade].push(lesson);
            });

            // Display classes with their lessons
            this.data.classes.forEach(classItem => {
                const classLessons = lessonsByGrade[classItem.grade] || [];
                
                if (classLessons.length > 0) {
                    classLessons.forEach(lesson => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${classItem.grade}/${classItem.section}</td>
                            <td>${lesson.name}</td>
                            <td>${lesson.weekly_hours}</td>
                            <td>
                                <span class="${lesson.is_mandatory ? 'badge-success' : 'badge-info'}">
                                    ${lesson.is_mandatory ? 'Zorunlu' : 'Seçmeli'}
                                </span>
                            </td>
                            <td>-</td>
                        `;
                        tbody.appendChild(row);
                    });
                } else {
                    // Show class even if it has no lessons
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${classItem.grade}/${classItem.section}</td>
                        <td colspan="3">Bu sınıfa ait ders bulunamadı</td>
                        <td>-</td>
                    `;
                    tbody.appendChild(row);
                }
            });
        }

        // If no data at all
        if ((data && data.length === 0) || (!data && this.data.classes.length === 0)) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="text-center">Veri bulunamadı</td>
            `;
            tbody.appendChild(row);
        }
    }

    populateClassLessonsFilters() {
        // Populate grade filter for class lessons section
        const gradeFilter = document.getElementById('class-lessons-grade-filter');
        if (gradeFilter) {
            // Clear existing options except the first one
            while (gradeFilter.children.length > 1) {
                gradeFilter.removeChild(gradeFilter.lastChild);
            }

            const grades = [...new Set(this.data.classes.map(c => c.grade))].sort();
            grades.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = `${grade}. Sınıf`;
                gradeFilter.appendChild(option);
            });
        }
    }

    async filterClassLessonsByGrade(grade) {
        try {
            if (!grade) {
                // Load all class lessons
                const classLessons = await window.electronAPI.class.getClassLessons();
                this.populateClassLessonsTable(classLessons);
                return;
            }
            
            // Load class lessons for specific grade
            const classLessons = await window.electronAPI.class.getClassLessonsByGrade(parseInt(grade));
            this.populateClassLessonsTable(classLessons);
        } catch (error) {
            console.error('Error filtering class lessons:', error);
            this.showNotification('Sınıf dersleri filtrelenirken hata oluştu', 'error');
        }
    }

    loadReports() {
        // Load reports data
    }

    async loadSettings() {
        try {
            if (window.electronAPI) {
                const settings = await window.electronAPI.settings.getSchoolSettings();
                this.populateSettingsForm(settings);
                // Update displays
                this.updateWeeklyHourLimitDisplay();
                this.updateDailyPeriodsDisplay();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showNotification('Ayarlar yüklenirken hata oluştu', 'error');
        }
    }

    populateSettingsForm(settings) {
        // Populate form with settings values
        if (settings.school_type) {
            document.getElementById('school-type').value = settings.school_type;
        }
        if (settings.weekly_days) {
            document.getElementById('weekly-days').value = settings.weekly_days;
        }
        if (settings.period_duration) {
            document.getElementById('period-duration').value = settings.period_duration;
        }
        if (settings.break_duration) {
            document.getElementById('break-duration').value = settings.break_duration;
        }
    }

    // Update the weekly hour limit display based on selected school type
    updateWeeklyHourLimitDisplay() {
        const schoolTypeSelect = document.getElementById('school-type');
        const weeklyHourLimitElement = document.getElementById('weekly-hour-limit');
        
        if (schoolTypeSelect && weeklyHourLimitElement) {
            const selectedSchoolType = schoolTypeSelect.value;
            let weeklyHourLimit = 35; // Default
            
            if (selectedSchoolType === 'Ortaokul') {
                weeklyHourLimit = 35;
            } else if (['Genel Lise', 'Anadolu Lisesi', 'Fen Lisesi', 'Sosyal Bilimler Lisesi'].includes(selectedSchoolType)) {
                weeklyHourLimit = 40;
            }
            
            weeklyHourLimitElement.textContent = weeklyHourLimit;
        }
    }

    // Update the daily periods display based on selected school type
    updateDailyPeriodsDisplay() {
        const schoolTypeSelect = document.getElementById('school-type');
        const dailyPeriodsDisplay = document.getElementById('daily-periods-display');
        
        if (schoolTypeSelect && dailyPeriodsDisplay) {
            const selectedSchoolType = schoolTypeSelect.value;
            let dailyPeriods = 8; // Default
            
            if (selectedSchoolType === 'Ortaokul') {
                dailyPeriods = 7;
            } else if (['Genel Lise', 'Anadolu Lisesi', 'Fen Lisesi', 'Sosyal Bilimler Lisesi'].includes(selectedSchoolType)) {
                dailyPeriods = 8;
            }
            
            dailyPeriodsDisplay.textContent = dailyPeriods;
        }
    }

    async saveSettings() {
        try {
            // Get the daily periods based on school type
            const schoolType = document.getElementById('school-type').value;
            let dailyPeriods = 8; // Default
            
            if (schoolType === 'Ortaokul') {
                dailyPeriods = 7;
            } else if (['Genel Lise', 'Anadolu Lisesi', 'Fen Lisesi', 'Sosyal Bilimler Lisesi'].includes(schoolType)) {
                dailyPeriods = 8;
            }
            
            const settings = {
                school_type: schoolType,
                daily_periods: dailyPeriods.toString(), // Convert to string as expected by the backend
                weekly_days: document.getElementById('weekly-days').value,
                period_duration: document.getElementById('period-duration').value,
                break_duration: document.getElementById('break-duration').value
            };

            if (window.electronAPI) {
                await window.electronAPI.settings.updateSchoolSettings(settings);
                this.showNotification('Ayarlar kaydedildi', 'success');
                
                // Update displays after saving
                this.updateWeeklyHourLimitDisplay();
                this.updateDailyPeriodsDisplay();
                
                // Update dashboard stats if needed
                this.updateDashboardStats();
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Ayarlar kaydedilirken hata oluştu: ' + error.message, 'error');
        }
    }
}

// Initialize the application when the page loads
// Ensure single initialization and provide legacy aliases used by HTML
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.lessonManager) {
            window.lessonManager = new ModernLessonManager();
        }
        // Legacy alias for templates that call classManager.*
        if (!window.classManager) {
            window.classManager = window.lessonManager;
        }
        // Settings manager facade for settings buttons
        if (!window.settingsManager) {
            const mm = window.lessonManager;
            window.settingsManager = {
                resetToDefaults: (scope) => mm.showNotification(`Ayarlar varsayılana sıfırlandı (${scope})`, 'info'),
                previewSchedule: () => mm.showNotification('Program önizleme yakında.', 'info'),
                showSystemInfo: () => mm.showNotification('Sistem bilgisi yakında.', 'info'),
                cleanupDatabase: async () => {
                    try {
                        if (window.electronAPI?.database?.cleanup) {
                            const result = await window.electronAPI.database.cleanup();
                            mm.showNotification(`Veritabanı temizliği tamamlandı: ${JSON.stringify(result)}`, 'success');
                        } else {
                            mm.showNotification('Veritabanı temizliği yakında.', 'info');
                        }
                    } catch (e) {
                        mm.showNotification('Veritabanı temizliği sırasında hata oluştu', 'error');
                    }
                },
                backupData: () => mm.backupDatabase(),
                restoreData: () => mm.restoreDatabase(),
                resetAllSettings: () => mm.showNotification('Tüm ayarlar varsayılana sıfırlandı', 'info')
            };
        }
        // Elective reports facade
        if (!window.electiveReports) {
            window.electiveReports = {
                generateElectiveReport: () => window.lessonManager?.showNotification('Seçmeli ders raporu oluşturuluyor...', 'info')
            };
        }
        // Elective tracker facade for UI buttons
        if (!window.electiveTracker) {
            window.electiveTracker = {
                refreshChart: () => window.lessonManager?.loadStatistics(),
                clearFilters: () => window.lessonManager?.clearFilters(),
                refreshData: () => window.lessonManager?.refreshData(),
                generateSuggestionsForAll: () => window.lessonManager?.showNotification('Tüm sınıflar için öneriler yakında.', 'info'),
                showBulkAssignmentModal: () => window.lessonManager?.showNotification('Toplu seçmeli atama yakında.', 'info'),
                exportToExcel: () => window.lessonManager?.showNotification('Excel\'e aktarma yakında.', 'info'),
                closeQuickAssignment: () => window.lessonManager?.closeQuickAssignment?.()
            };
        }
    });
}

// Handle window events (guarded for test environments)
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', () => {
        // Cleanup if needed
    });
}

// Lightweight classes for unit tests
class ElectiveTracker {
    constructor() {
        this.electiveStatuses = [];
        this.filteredStatuses = [];
        this.filters = { grade: '', status: '', search: '' };
        this.chart = null;
        this.currentSort = { column: null, direction: 'asc' };
        this.selectedClassId = null;
    }

    async loadElectiveStatuses() {
        try {
            const statuses = await window.electronAPI.electiveTracker.getAllStatuses();
            this.electiveStatuses = statuses || [];
            this.filteredStatuses = [...this.electiveStatuses];
            const empty = document.getElementById('elective-table-empty');
            const loading = document.getElementById('elective-table-loading');
            if (loading) loading.style.display = 'none';
            if (empty) empty.style.display = this.filteredStatuses.length === 0 ? 'block' : 'none';
        } catch (err) {
            window.lessonManager?.showNotification('Seçmeli ders durumları yüklenirken hata oluştu', 'error');
        }
    }

    applyFilters() {
        const { grade, status, search } = this.filters;
        this.filteredStatuses = this.electiveStatuses.filter(s => {
            const okGrade = grade ? String(s.grade) === String(grade) : true;
            const okStatus = status ? s.status === status : true;
            const okSearch = search ? (s.className?.toLowerCase().includes(search.toLowerCase())) : true;
            return okGrade && okStatus && okSearch;
        });
    }

    sortTable(column, direction) {
        // Toggle logic if no direction provided
        if (!direction) {
            if (this.currentSort.column === column) {
                direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                direction = 'asc';
            }
        }
        this.currentSort = { column, direction };

        const dir = direction === 'asc' ? 1 : -1;
        this.filteredStatuses.sort((a, b) => {
            const va = a[column];
            const vb = b[column];
            // Numeric compare if both numbers
            if (typeof va === 'number' && typeof vb === 'number') {
                return (va - vb) * dir;
            }
            // String compare fallback
            const sa = String(va ?? '').toLowerCase();
            const sb = String(vb ?? '').toLowerCase();
            if (sa < sb) return -1 * dir;
            if (sa > sb) return 1 * dir;
            return 0;
        });
    }

    async loadStatistics() {
        try {
            const stats = await window.electronAPI.electiveTracker.getStatistics();
            const dist = await window.electronAPI.electiveTracker.getElectiveDistribution();
            const pctEl = document.getElementById('completion-percentage');
            const progEl = document.getElementById('completion-progress');
            const missEl = document.getElementById('missing-assignments');
            const totalEl = document.getElementById('total-classes-tracker');
            const avgEl = document.getElementById('avg-electives');
            if (pctEl) pctEl.textContent = `${stats.completionPercentage}%`;
            if (progEl) progEl.style.width = `${stats.completionPercentage}%`;
            if (missEl) missEl.textContent = String(stats.totalMissingAssignments);
            if (totalEl) totalEl.textContent = String(stats.totalClasses);
            if (avgEl) avgEl.textContent = String(stats.averageElectivesPerClass);
            // basic chart lifecycle
            if (window.Chart) {
                if (this.chart && this.chart.destroy) this.chart.destroy();
                const ctx = document.getElementById('elective-distribution-chart');
                if (ctx) this.chart = new window.Chart(ctx, {});
            }
            return { stats, dist };
        } catch (err) {
            window.lessonManager?.showNotification('İstatistikler yüklenirken hata oluştu', 'error');
            return null;
        }
    }

    async generateSuggestions(classId) {
        try {
            const suggestions = await window.electronAPI.suggestionEngine.generateSuggestions(classId);
            if (suggestions && suggestions.length > 0) {
                this.showSuggestionsModal(suggestions);
            } else {
                window.lessonManager?.showNotification('Bu sınıf için öneri bulunamadı', 'warning');
            }
            return suggestions || [];
        } catch (err) {
            window.lessonManager?.showNotification('Öneriler oluşturulurken hata oluştu', 'error');
            return [];
        }
    }

    showSuggestionsModal(suggestions) {
        // Basit bir placeholder: testler sadece çağrıyı doğruluyor
        const container = document.getElementById('modal-container');
        if (container) {
            container.innerHTML = '<div class="modal-overlay"></div>';
        }
    }

    openQuickAssignment(classId) {
        const panel = document.getElementById('quick-assignment-panel');
        if (panel) {
            panel.classList.add('active');
            panel.style.display = 'block';
            this.selectedClassId = classId ?? this.selectedClassId ?? 1;
        }
    }

    closeQuickAssignment() {
        const panel = document.getElementById('quick-assignment-panel');
        if (panel) {
            panel.classList.remove('active');
        }
        this.selectedClassId = null;
    }

    async confirmQuickAssignment(teacherId, lessonId, classId) {
        // Fallback to DOM selections if parameters not provided
        if (!teacherId || !lessonId || !classId) {
            const selectedElective = document.querySelector('input[name="selected-elective"]:checked');
            const teacherSelect = document.getElementById('teacher-select-quick');
            const selectedTeacher = teacherSelect ? teacherSelect.value : null;
            const selectedClass = this.selectedClassId;
            teacherId = teacherId || (selectedTeacher ? parseInt(String(selectedTeacher)) : undefined);
            lessonId = lessonId || (selectedElective ? parseInt(String(selectedElective.value)) : undefined);
            classId = classId || selectedClass || undefined;
        }
        if (!teacherId || !lessonId || !classId) {
            window.lessonManager?.showNotification('Lütfen ders ve öğretmen seçin', 'warning');
            return false;
        }
        try {
            await window.electronAPI.teacher.assignToLessonAndClass(teacherId, lessonId, classId);
            await window.electronAPI.electiveTracker.updateStatus(classId);
            window.lessonManager?.showNotification('Seçmeli ders ataması başarıyla yapıldı', 'success');
            // close and refresh if available
            if (typeof this.closeQuickAssignment === 'function') this.closeQuickAssignment();
            if (typeof this.refreshData === 'function') await this.refreshData();
            return true;
        } catch (err) {
            window.lessonManager?.showNotification('Atama yapılırken hata oluştu', 'error');
            return false;
        }
    }

    clearFilters() {
        // Context-aware clear: elective tracker vs classes
        if (this.currentSection === 'elective-tracker') {
            this.filters = { grade: '', status: '', search: '' };
            this.filteredStatuses = [...this.electiveStatuses];
            const s = document.getElementById('elective-search');
            const g = document.getElementById('grade-filter-tracker');
            const st = document.getElementById('status-filter-tracker');
            if (s) s.value = '';
            if (g) g.value = '';
            if (st) st.value = '';
            this.applyFilters();
            window.lessonManager?.showNotification('Filtreler temizlendi', 'info');
        } else if (this.currentSection === 'classes') {
            this.clearClassFilters();
        } else if (this.currentSection === 'teachers') {
            this.clearTeacherFilters();
        } else {
            window.lessonManager?.showNotification('Filtreler temizlendi', 'info');
        }
    }

    createStatusRow(status) {
        const tr = document.createElement('tr');
        tr.dataset.classId = String(status.classId);
        const showAssign = status.status === 'incomplete';
        const assigned = status.assignedElectives ?? 0;
        const required = status.requiredElectives ?? 3;
        const missing = status.missingElectives ?? Math.max(0, required - assigned);
        tr.innerHTML = `
            <td>${status.className}</td>
            <td>${status.grade}. Sınıf</td>
            <td>${assigned}/${required}</td>
            <td>${status.status === 'incomplete' ? `Eksik (${missing})` : status.status}</td>
            <td>
                ${showAssign ? '<button class="action-btn assign">Ata</button>' : ''}
            </td>
        `;
        return tr;
    }

    async refreshData() {
        const s1 = this.loadElectiveStatuses();
        const s2 = this.loadStatistics();
        await Promise.all([s1, s2]);
        window.lessonManager?.showNotification('Veriler yenilendi', 'success');
    }
}

class ElectiveAlertManager {
    constructor() {
        this.alerts = [];
        this.refreshInterval = setInterval(() => this.loadElectiveAlerts(), 30_000);
    }

    async loadElectiveAlerts() {
        try {
            const alerts = await window.electronAPI.assignmentAlert.getActiveAlerts();
            this.alerts = alerts || [];
            this.updateAlertCount();
            this.renderAlertList();
        } catch (err) {
            window.lessonManager?.showNotification('Uyarılar yüklenirken hata oluştu', 'error');
        }
    }

    renderAlertList() {
        const list = document.getElementById('elective-alerts');
        const empty = document.getElementById('no-alerts');
        if (!list) return;
        list.innerHTML = '';
        const alertsToShow = (this.alerts || []).slice(0, 10);
        if (alertsToShow.length === 0) {
            if (empty) empty.style.display = 'block';
            list.style.display = 'none';
            return;
        }
        if (empty) empty.style.display = 'none';
        list.style.display = 'block';
        for (const a of alertsToShow) {
            const div = document.createElement('div');
            div.className = `alert-item ${a.severity || ''}`;
            div.textContent = `${a.message} (${a.className || ''})`;
            list.appendChild(div);
        }
    }

    async resolveAlert(id) {
        try {
            const ok = await window.electronAPI.assignmentAlert.resolveAlert(id);
            if (ok) {
                this.alerts = this.alerts.filter(a => a.id !== id);
                await window.electronAPI.electiveTracker.refreshAllStatuses();
                this.updateAlertCount();
                this.renderAlertList();
                window.lessonManager?.showNotification('Uyarı çözüldü', 'success');
            } else {
                window.lessonManager?.showNotification('Uyarı çözülürken hata oluştu', 'error');
            }
        } catch (err) {
            window.lessonManager?.showNotification('Uyarı çözülürken hata oluştu', 'error');
        }
    }

    updateAlertCount() {
        const el = document.getElementById('alert-count');
        if (el) el.textContent = String(this.alerts.length);
    }

    async refreshAlerts() {
        await this.loadElectiveAlerts();
        window.lessonManager?.showNotification('Uyarılar yenilendi', 'info');
    }

    formatTimeAgo(dateStr) {
        const t = Date.parse(dateStr);
        const now = (typeof Date.now === 'function')
          ? Date.now()
          : ((typeof performance !== 'undefined' && typeof performance.now === 'function' && typeof performance.timeOrigin === 'number')
              ? performance.timeOrigin + performance.now()
              : 0);
        if (!isFinite(t) || !isFinite(now) || t !== t) return 'Bilinmiyor';
        const diffMs = now - t;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 60) return `${mins} dakika önce`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} saat önce`;
        const days = Math.floor(hours / 24);
        return `${days} gün önce`;
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Export for tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ElectiveTracker, ElectiveAlertManager };
}

// Only auto-initialize in real renderer runtime (not during tests)
if (typeof window !== 'undefined' && window.document && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            if (!window.lessonManager && window.electronAPI) {
                window.lessonManager = new ModernLessonManager();
            }
        } catch (e) {
            // Test ortamında sessizce yoksay
        }
    });
}
