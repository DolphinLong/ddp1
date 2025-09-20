// Class Lesson Assignment Module for Ortaokul
// Total: 35 hours/week (31 mandatory + 4 elective)

class ClassLessonAssignment {
    constructor(lessonManager) {
        this.lessonManager = lessonManager;
        this.totalWeeklyHours = 35;
        this.mandatoryHours = 30; // Including 1 hour Rehberlik ve Yönlendirme
        this.electiveHours = 5; // 2+2+1 pattern
        this.currentSelections = {
            mandatory: new Map(),
            elective: new Map()
        };
    }

    async showModal(classId, className, grade) {
        try {
            this.lessonManager.showLoading(true);
            
            // Gather all necessary data
            const data = await this.gatherClassLessonData(classId, grade);
            
            // Create and display the modal
            const modalHtml = this.createModalHTML(classId, className, grade, data);
            document.getElementById('modal-container').innerHTML = modalHtml;
            
            // Add event listeners
            this.attachEventListeners(classId, className, data);
            
            // Add custom styles
            this.addCustomStyles();
            
        } catch (error) {
            console.error('Error showing class lesson assignment modal:', error);
            this.lessonManager.showNotification('Ders atama ekranı açılırken hata oluştu: ' + error.message, 'error');
        } finally {
            this.lessonManager.showLoading(false);
        }
    }

    async gatherClassLessonData(classId, grade) {
        // Get all lessons for this grade
        const allLessons = await window.electronAPI.lesson.getByGrade(grade);
        const mandatoryLessons = allLessons.filter(l => l.is_mandatory === 1);
        const electiveLessons = allLessons.filter(l => l.is_mandatory === 0);
        
        // Get available elective lessons for this specific class
        const availableElectives = await window.electronAPI.lesson.getAvailableElectivesForClass(classId);
        const allTeachers = await window.electronAPI.teacher.getAll();
        
        // Get existing assignments for this class
        const assignedTeachers = await window.electronAPI.class.getAssignedTeachersForClass(classId);
        
        // Get guidance counselor for this class
        const classInfo = this.lessonManager.data.classes.find(c => c.id === classId);
        const guidanceCounselor = classInfo?.guidance_counselor;
        
        // Calculate assigned hours
        const hourCalculation = this.calculateHours(allLessons, assignedTeachers, guidanceCounselor);
        
        return {
            mandatoryLessons,
            electiveLessons,
            availableElectives,
            allTeachers,
            assignedTeachers,
            guidanceCounselor,
            classInfo,
            ...hourCalculation
        };
    }

    calculateHours(allLessons, assignedTeachers, guidanceCounselor) {
        let assignedMandatoryHours = 0;
        let assignedElectiveHours = 0;
        const assignedLessonIds = new Set();
        const assignmentMap = new Map();
        
        // Calculate already assigned hours
        assignedTeachers.forEach(assignment => {
            const lesson = allLessons.find(l => l.id === assignment.lesson_id);
            if (lesson) {
                assignedLessonIds.add(lesson.id);
                assignmentMap.set(lesson.id, assignment);
                
                if (lesson.is_mandatory) {
                    assignedMandatoryHours += lesson.weekly_hours;
                } else {
                    assignedElectiveHours += lesson.weekly_hours;
                }
            }
        });
        
        // Add guidance counselor lesson if assigned (1 hour)
        const hasGuidanceCounselor = guidanceCounselor && guidanceCounselor.teacher_id;
        if (hasGuidanceCounselor) {
            assignedMandatoryHours += 1;
        }
        
        return {
            assignedMandatoryHours,
            assignedElectiveHours,
            totalAssignedHours: assignedMandatoryHours + assignedElectiveHours,
            remainingMandatoryHours: this.mandatoryHours - assignedMandatoryHours,
            remainingElectiveHours: this.electiveHours - assignedElectiveHours,
            remainingTotalHours: this.totalWeeklyHours - (assignedMandatoryHours + assignedElectiveHours),
            assignedLessonIds,
            assignmentMap,
            hasGuidanceCounselor
        };
    }

    createModalHTML(classId, className, grade, data) {
        const {
            mandatoryLessons,
            availableElectives,
            allTeachers,
            assignedLessonIds,
            assignmentMap,
            guidanceCounselor,
            hasGuidanceCounselor,
            assignedMandatoryHours,
            assignedElectiveHours,
            remainingMandatoryHours,
            remainingElectiveHours,
            totalAssignedHours,
            remainingTotalHours
        } = data;

        // Create progress bar HTML
        const progressHTML = this.createProgressBars(
            assignedMandatoryHours,
            assignedElectiveHours,
            totalAssignedHours
        );

        // Create mandatory lessons HTML
        const mandatoryLessonsHTML = this.createMandatoryLessonsHTML(
            mandatoryLessons,
            assignedLessonIds,
            assignmentMap,
            allTeachers,
            guidanceCounselor,
            hasGuidanceCounselor
        );

        // Create elective lessons HTML
        const electiveLessonsHTML = this.createElectiveLessonsHTML(
            availableElectives,
            assignedLessonIds,
            assignmentMap,
            allTeachers
        );

        // Create warnings HTML
        const warningsHTML = this.createWarningsHTML(
            remainingMandatoryHours,
            remainingElectiveHours,
            remainingTotalHours,
            assignedElectiveHours
        );

        return `
            <div class="modal-overlay">
                <div class="comprehensive-lesson-modal modal" style="max-width: 1000px; max-height: 95vh;">
                    <div class="modal-header">
                        <h2>📚 ${className} - Ders Programı Yönetimi</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${progressHTML}
                        ${warningsHTML}
                        
                        <!-- Mandatory Lessons Section -->
                        <div class="lessons-section mandatory-section">
                            <div class="section-header">
                                <h3>
                                    <i class="fas fa-star"></i>
                                    Zorunlu Dersler
                                    <span class="hour-badge">${assignedMandatoryHours} / ${this.mandatoryHours} saat</span>
                                </h3>
                            </div>
                            <div class="lessons-grid">
                                ${mandatoryLessonsHTML}
                            </div>
                        </div>
                        
                        <!-- Elective Lessons Section -->
                        <div class="lessons-section elective-section">
                            <div class="section-header">
                                <h3>
                                    <i class="fas fa-plus-circle"></i>
                                    Seçmeli Dersler
                                    <span class="hour-badge">${assignedElectiveHours} / ${this.electiveHours} saat</span>
                                </h3>
                                <div class="elective-info">
                                    <i class="fas fa-info-circle"></i>
                                    2+2+1 saat olacak şekilde seçim yapınız
                                </div>
                            </div>
                            <div class="lessons-grid">
                                ${electiveLessonsHTML}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="footer-stats">
                            <span class="stat-item">
                                <i class="fas fa-clock"></i>
                                Toplam: <strong id="total-selected-hours">${totalAssignedHours}</strong> / ${this.totalWeeklyHours} saat
                            </span>
                        </div>
                        <div class="footer-actions">
                            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                İptal
                            </button>
                            <button class="btn btn-success" id="save-assignments-btn" onclick="classLessonAssignment.saveAssignments(${classId}, '${className}')">
                                <i class="fas fa-save"></i>
                                Atamaları Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createProgressBars(mandatoryHours, electiveHours, totalHours) {
        const mandatoryPercent = (mandatoryHours / this.mandatoryHours) * 100;
        const electivePercent = (electiveHours / this.electiveHours) * 100;
        const totalPercent = (totalHours / this.totalWeeklyHours) * 100;

        return `
            <div class="progress-section">
                <div class="progress-item">
                    <label>Zorunlu Dersler</label>
                    <div class="progress-bar">
                        <div class="progress-fill mandatory" style="width: ${mandatoryPercent}%"></div>
                    </div>
                    <span class="progress-text">${mandatoryHours} / ${this.mandatoryHours} saat</span>
                </div>
                <div class="progress-item">
                    <label>Seçmeli Dersler</label>
                    <div class="progress-bar">
                        <div class="progress-fill elective" style="width: ${electivePercent}%"></div>
                    </div>
                    <span class="progress-text">${electiveHours} / ${this.electiveHours} saat</span>
                </div>
                <div class="progress-item">
                    <label>Toplam</label>
                    <div class="progress-bar">
                        <div class="progress-fill total" style="width: ${totalPercent}%"></div>
                    </div>
                    <span class="progress-text">${totalHours} / ${this.totalWeeklyHours} saat</span>
                </div>
            </div>
        `;
    }

    createWarningsHTML(remainingMandatory, remainingElective, remainingTotal, assignedElective) {
        let warnings = [];
        
        if (remainingMandatory > 0) {
            warnings.push(`<div class="warning-item mandatory">
                <i class="fas fa-exclamation-triangle"></i>
                ${remainingMandatory} saat daha zorunlu ders ataması yapmalısınız.
            </div>`);
        }
        
        if (remainingElective > 0) {
            if (assignedElective === 4) {
                warnings.push(`<div class="warning-item elective">
                    <i class="fas fa-info-circle"></i>
                    1 saat daha seçmeli ders ataması yapmalısınız (1 saatlik bir ders).
                </div>`);
            } else if (assignedElective === 2) {
                warnings.push(`<div class="warning-item elective">
                    <i class="fas fa-info-circle"></i>
                    3 saat daha seçmeli ders ataması yapmalısınız (2+1 veya 3 saat olacak şekilde).
                </div>`);
            } else if (assignedElective === 1) {
                warnings.push(`<div class="warning-item elective">
                    <i class="fas fa-info-circle"></i>
                    4 saat daha seçmeli ders ataması yapmalısınız (2+2 saat olacak şekilde).
                </div>`);
            } else if (assignedElective === 3) {
                warnings.push(`<div class="warning-item elective">
                    <i class="fas fa-info-circle"></i>
                    2 saat daha seçmeli ders ataması yapmalısınız (2 saatlik bir ders).
                </div>`);
            } else if (assignedElective === 0) {
                warnings.push(`<div class="warning-item elective">
                    <i class="fas fa-info-circle"></i>
                    5 saat seçmeli ders ataması yapmalısınız (2+2+1 saat olacak şekilde).
                </div>`);
            }
        } else if (remainingElective < 0) {
            warnings.push(`<div class="warning-item error">
                <i class="fas fa-times-circle"></i>
                Seçmeli ders saati limitini ${Math.abs(remainingElective)} saat aştınız!
            </div>`);
        }
        
        if (remainingTotal === 0) {
            warnings.push(`<div class="warning-item success">
                <i class="fas fa-check-circle"></i>
                Tüm ders saatleri tamamlandı! ✓
            </div>`);
        }
        
        return warnings.length > 0 ? `
            <div class="warnings-section">
                ${warnings.join('')}
            </div>
        ` : '';
    }

    createMandatoryLessonsHTML(lessons, assignedIds, assignmentMap, teachers, guidanceCounselor, hasGuidance) {
        let html = '';
        
        // Add Rehberlik ve Yönlendirme if guidance counselor is assigned
        if (hasGuidance) {
            html += `
                <div class="lesson-card assigned guidance">
                    <div class="lesson-status">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="lesson-info">
                        <h4 class="lesson-name">Rehberlik ve Yönlendirme</h4>
                        <div class="lesson-meta">
                            <span class="badge mandatory">Zorunlu</span>
                            <span class="hours">1 saat/hafta</span>
                        </div>
                        <div class="assigned-teacher">
                            <i class="fas fa-user-tie"></i>
                            ${guidanceCounselor.teacher_name} (Rehber Öğretmen)
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Add other mandatory lessons
        lessons.forEach(lesson => {
            // Skip Rehberlik ve Yönlendirme as it's handled separately
            if (lesson.name.includes('Rehberlik')) return;
            
            const isAssigned = assignedIds.has(lesson.id);
            const assignment = assignmentMap.get(lesson.id);
            
            html += this.createLessonCard(lesson, isAssigned, assignment, teachers, true);
        });
        
        return html;
    }

    createElectiveLessonsHTML(lessons, assignedIds, assignmentMap, teachers) {
        let html = '';
        
        lessons.forEach(lesson => {
            const isAssigned = assignedIds.has(lesson.id);
            const assignment = assignmentMap.get(lesson.id);
            
            html += this.createLessonCard(lesson, isAssigned, assignment, teachers, false);
        });
        
        if (lessons.length === 0) {
            html = `
                <div class="no-lessons-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Bu sınıf seviyesi için uygun seçmeli ders bulunmamaktadır.</p>
                </div>
            `;
        }
        
        return html;
    }

    createLessonCard(lesson, isAssigned, assignment, teachers, isMandatory) {
        const cardClass = isAssigned ? 'lesson-card assigned' : 'lesson-card';
        const badgeType = isMandatory ? 'mandatory' : 'elective';
        const badgeText = isMandatory ? 'Zorunlu' : 'Seçmeli';
        
        // Filter teachers by subject
        const relevantTeachers = teachers.filter(teacher => {
            if (!teacher.subject) return false;
            return lesson.name.toLowerCase().includes(teacher.subject.toLowerCase()) ||
                   teacher.subject.toLowerCase().includes(lesson.name.toLowerCase());
        });
        
        // If no relevant teachers, show all teachers
        const teachersToShow = relevantTeachers.length > 0 ? relevantTeachers : teachers;
        
        return `
            <div class="${cardClass}" data-lesson-id="${lesson.id}" data-hours="${lesson.weekly_hours}" data-type="${badgeType}">
                ${isAssigned ? '<div class="lesson-status"><i class="fas fa-check-circle"></i></div>' : ''}
                <div class="lesson-checkbox">
                    <input type="checkbox" 
                           id="lesson-${lesson.id}"
                           data-lesson-id="${lesson.id}"
                           data-hours="${lesson.weekly_hours}"
                           data-type="${badgeType}"
                           class="lesson-check"
                           ${isAssigned ? 'checked disabled' : ''}
                           onchange="classLessonAssignment.updateHourCalculation()">
                    <label for="lesson-${lesson.id}"></label>
                </div>
                <div class="lesson-info">
                    <h4 class="lesson-name">${lesson.name}</h4>
                    <div class="lesson-meta">
                        <span class="badge ${badgeType}">${badgeText}</span>
                        <span class="hours">${lesson.weekly_hours} saat/hafta</span>
                    </div>
                    ${isAssigned && assignment ? `
                        <div class="assigned-teacher">
                            <i class="fas fa-user"></i>
                            ${assignment.teacher_name}
                        </div>
                    ` : ''}
                </div>
                ${!isAssigned ? `
                    <div class="teacher-selection">
                        <select class="teacher-select" data-lesson-id="${lesson.id}">
                            <option value="">Öğretmen seçiniz...</option>
                            ${teachersToShow.map(teacher => 
                                `<option value="${teacher.id}">${teacher.name} - ${teacher.subject || 'Branş Belirtilmemiş'}</option>`
                            ).join('')}
                        </select>
                    </div>
                ` : ''}
            </div>
        `;
    }

    attachEventListeners(classId, className, data) {
        // Update hour calculation on checkbox change
        const checkboxes = document.querySelectorAll('.lesson-check:not(:disabled)');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateHourCalculation(data));
        });
    }

    updateHourCalculation(baseData) {
        const checkboxes = document.querySelectorAll('.lesson-check');
        let mandatoryHours = baseData.assignedMandatoryHours;
        let electiveHours = baseData.assignedElectiveHours;
        const selectedElectiveHours = [];
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked && !checkbox.disabled) {
                const hours = parseInt(checkbox.dataset.hours);
                const type = checkbox.dataset.type;
                
                if (type === 'mandatory') {
                    mandatoryHours += hours;
                } else {
                    electiveHours += hours;
                    selectedElectiveHours.push(hours);
                }
            }
        });
        
        const totalHours = mandatoryHours + electiveHours;
        
        // Update progress bars
        this.updateProgressBars(mandatoryHours, electiveHours, totalHours);
        
        // Update warnings
        this.updateWarnings(
            this.mandatoryHours - mandatoryHours,
            this.electiveHours - electiveHours,
            this.totalWeeklyHours - totalHours,
            electiveHours
        );
        
        // Update elective pattern indicator
        this.updateElectivePatternIndicator(selectedElectiveHours);
        
        // Update footer stats
        document.getElementById('total-selected-hours').textContent = totalHours;
        
        // Enable/disable save button
        const saveBtn = document.getElementById('save-assignments-btn');
        if (totalHours > this.totalWeeklyHours) {
            saveBtn.disabled = true;
            saveBtn.title = 'Toplam saat limitini aştınız!';
        } else {
            saveBtn.disabled = false;
            saveBtn.title = '';
        }
    }

    updateProgressBars(mandatoryHours, electiveHours, totalHours) {
        const mandatoryPercent = (mandatoryHours / this.mandatoryHours) * 100;
        const electivePercent = (electiveHours / this.electiveHours) * 100;
        const totalPercent = (totalHours / this.totalWeeklyHours) * 100;
        
        document.querySelector('.progress-fill.mandatory').style.width = `${mandatoryPercent}%`;
        document.querySelector('.progress-fill.elective').style.width = `${electivePercent}%`;
        document.querySelector('.progress-fill.total').style.width = `${totalPercent}%`;
        
        // Update text
        document.querySelectorAll('.progress-text')[0].textContent = `${mandatoryHours} / ${this.mandatoryHours} saat`;
        document.querySelectorAll('.progress-text')[1].textContent = `${electiveHours} / ${this.electiveHours} saat`;
        document.querySelectorAll('.progress-text')[2].textContent = `${totalHours} / ${this.totalWeeklyHours} saat`;
        
        // Update section headers
        document.querySelector('.mandatory-section .hour-badge').textContent = `${mandatoryHours} / ${this.mandatoryHours} saat`;
        document.querySelector('.elective-section .hour-badge').textContent = `${electiveHours} / ${this.electiveHours} saat`;
    }

    updateWarnings(remainingMandatory, remainingElective, remainingTotal, assignedElective) {
        const warningsHTML = this.createWarningsHTML(remainingMandatory, remainingElective, remainingTotal, assignedElective);
        const warningsSection = document.querySelector('.warnings-section');
        
        if (warningsSection) {
            warningsSection.outerHTML = warningsHTML;
        } else if (warningsHTML) {
            document.querySelector('.progress-section').insertAdjacentHTML('afterend', warningsHTML);
        }
    }

    async saveAssignments(classId, className) {
        // Get all selected elective lessons
        const selectedElectives = [];
        const checkboxes = document.querySelectorAll('.lesson-check:not(:disabled)');
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked && checkbox.dataset.type === 'elective') {
                const hours = parseInt(checkbox.dataset.hours);
                selectedElectives.push(hours);
            }
        });
        
        // Calculate total elective hours
        const totalElectiveHours = selectedElectives.reduce((sum, h) => sum + h, 0);
        
        // Validate 2+2+1 pattern
        if (totalElectiveHours === 5) {
            // Check if it matches 2+2+1 pattern
            const sortedHours = selectedElectives.sort((a, b) => b - a);
            const isValidPattern = this.validateElectivePattern(sortedHours);
            
            if (!isValidPattern) {
                this.lessonManager.showNotification(
                    'Seçmeli dersler 2+2+1 saat formatında olmalıdır. Lütfen 2 adet 2 saatlik ve 1 adet 1 saatlik ders seçin.',
                    'warning'
                );
                return;
            }
        } else if (totalElectiveHours > 0 && totalElectiveHours !== 5) {
            this.lessonManager.showNotification(
                `Seçmeli ders toplamı 5 saat olmalıdır. Şu an ${totalElectiveHours} saat seçili.`,
                'warning'
            );
            return;
        }
        
        // Proceed with saving
        await this.lessonManager.saveClassLessonAssignments(classId, className);
    }
    
    updateElectivePatternIndicator(selectedHours) {
        const electiveInfo = document.querySelector('.elective-info');
        if (!electiveInfo) return;
        
        if (selectedHours.length === 0) {
            electiveInfo.innerHTML = `
                <i class="fas fa-info-circle"></i>
                2+2+1 saat olacak şekilde seçim yapınız
            `;
            electiveInfo.style.background = '#f0f9ff';
            electiveInfo.style.color = '#0369a1';
            return;
        }
        
        // Sort hours for pattern display
        const sortedHours = [...selectedHours].sort((a, b) => b - a);
        const patternText = sortedHours.join('+');
        const totalHours = sortedHours.reduce((sum, h) => sum + h, 0);
        
        if (totalHours === 5) {
            // Check if it's the ideal 2+2+1 pattern
            if (sortedHours.length === 3 && sortedHours[0] === 2 && sortedHours[1] === 2 && sortedHours[2] === 1) {
                electiveInfo.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    Mükemmel! ${patternText} = ${totalHours} saat ✓
                `;
                electiveInfo.style.background = '#dcfce7';
                electiveInfo.style.color = '#14532d';
            } else {
                electiveInfo.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    Seçim: ${patternText} = ${totalHours} saat (Toplam doğru)
                `;
                electiveInfo.style.background = '#dcfce7';
                electiveInfo.style.color = '#14532d';
            }
        } else if (totalHours < 5) {
            electiveInfo.innerHTML = `
                <i class="fas fa-info-circle"></i>
                Seçim: ${patternText} = ${totalHours} saat (${5 - totalHours} saat daha seçiniz)
            `;
            electiveInfo.style.background = '#fef3c7';
            electiveInfo.style.color = '#92400e';
        } else {
            electiveInfo.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                Seçim: ${patternText} = ${totalHours} saat (${totalHours - 5} saat fazla!)
            `;
            electiveInfo.style.background = '#fee2e2';
            electiveInfo.style.color = '#991b1b';
        }
    }
    
    validateElectivePattern(hours) {
        // Valid patterns for 5 hours:
        // [2, 2, 1] - standard 2+2+1
        // [2, 1, 1, 1] - if lessons are structured this way
        // [3, 2] - alternative if 3-hour electives exist
        // [1, 1, 1, 1, 1] - if all are 1-hour
        
        // Check for standard 2+2+1 pattern
        if (hours.length === 3) {
            return hours[0] === 2 && hours[1] === 2 && hours[2] === 1;
        }
        
        // Check for alternative valid patterns
        if (hours.length === 2) {
            return (hours[0] === 3 && hours[1] === 2) || (hours[0] === 4 && hours[1] === 1);
        }
        
        // Allow any combination that sums to 5
        // This gives flexibility while maintaining the total
        return true;
    }

    addCustomStyles() {
        if (document.getElementById('class-lesson-assignment-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'class-lesson-assignment-styles';
        style.textContent = `
            .comprehensive-lesson-modal {
                width: 95vw;
                max-width: 1000px;
                height: 95vh;
                display: flex;
                flex-direction: column;
            }
            
            .comprehensive-lesson-modal .modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 24px;
            }
            
            .progress-section {
                background: #f8fafc;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
            }
            
            .progress-item {
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .progress-item:last-child {
                margin-bottom: 0;
            }
            
            .progress-item label {
                width: 120px;
                font-weight: 600;
                color: #475569;
            }
            
            .progress-bar {
                flex: 1;
                height: 24px;
                background: #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-fill {
                height: 100%;
                border-radius: 12px;
                transition: width 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
                font-size: 12px;
            }
            
            .progress-fill.mandatory {
                background: linear-gradient(90deg, #3b82f6, #2563eb);
            }
            
            .progress-fill.elective {
                background: linear-gradient(90deg, #10b981, #059669);
            }
            
            .progress-fill.total {
                background: linear-gradient(90deg, #8b5cf6, #7c3aed);
            }
            
            .progress-text {
                min-width: 100px;
                text-align: right;
                font-weight: 600;
                color: #1e293b;
            }
            
            .warnings-section {
                margin-bottom: 20px;
            }
            
            .warning-item {
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
                font-weight: 500;
            }
            
            .warning-item i {
                font-size: 18px;
            }
            
            .warning-item.mandatory {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #fcd34d;
            }
            
            .warning-item.elective {
                background: #dbeafe;
                color: #1e40af;
                border: 1px solid #93c5fd;
            }
            
            .warning-item.error {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fca5a5;
            }
            
            .warning-item.success {
                background: #dcfce7;
                color: #14532d;
                border: 1px solid #86efac;
            }
            
            .lessons-section {
                margin-bottom: 24px;
                background: white;
                border-radius: 12px;
                padding: 20px;
                border: 1px solid #e2e8f0;
            }
            
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 2px solid #f1f5f9;
            }
            
            .section-header h3 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 12px;
                color: #1e293b;
            }
            
            .hour-badge {
                background: #f1f5f9;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 14px;
                font-weight: 600;
                color: #475569;
            }
            
            .elective-info {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: #f0f9ff;
                border-radius: 8px;
                color: #0369a1;
                font-size: 14px;
                font-weight: 500;
            }
            
            .lessons-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
            }
            
            .lesson-card {
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                padding: 16px;
                position: relative;
                transition: all 0.2s;
            }
            
            .lesson-card:hover {
                border-color: #cbd5e1;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            }
            
            .lesson-card.assigned {
                background: #f0fdf4;
                border-color: #86efac;
            }
            
            .lesson-card.guidance {
                background: #fef3c7;
                border-color: #fcd34d;
            }
            
            .lesson-status {
                position: absolute;
                top: 12px;
                right: 12px;
                color: #10b981;
                font-size: 20px;
            }
            
            .lesson-checkbox {
                margin-bottom: 12px;
            }
            
            .lesson-checkbox input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .lesson-checkbox input[type="checkbox"]:disabled {
                cursor: not-allowed;
                opacity: 0.5;
            }
            
            .lesson-name {
                margin: 0 0 8px 0;
                font-size: 16px;
                font-weight: 600;
                color: #1e293b;
            }
            
            .lesson-meta {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .badge.mandatory {
                background: #dbeafe;
                color: #1e40af;
            }
            
            .badge.elective {
                background: #dcfce7;
                color: #14532d;
            }
            
            .hours {
                padding: 4px 8px;
                background: #f1f5f9;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                color: #475569;
            }
            
            .assigned-teacher {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: #f8fafc;
                border-radius: 6px;
                font-size: 14px;
                color: #475569;
            }
            
            .teacher-selection {
                margin-top: 12px;
            }
            
            .teacher-select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                background: white;
            }
            
            .teacher-select:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 1px #3b82f6;
            }
            
            .no-lessons-message {
                grid-column: 1 / -1;
                padding: 32px;
                text-align: center;
                color: #64748b;
            }
            
            .no-lessons-message i {
                font-size: 48px;
                color: #cbd5e1;
                margin-bottom: 16px;
            }
            
            .modal-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-top: 1px solid #e2e8f0;
                background: #f8fafc;
            }
            
            .footer-stats {
                display: flex;
                gap: 24px;
            }
            
            .stat-item {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #475569;
                font-size: 14px;
            }
            
            .stat-item strong {
                color: #1e293b;
                font-size: 18px;
            }
            
            .footer-actions {
                display: flex;
                gap: 12px;
            }
            
            @media (max-width: 768px) {
                .comprehensive-lesson-modal {
                    width: 100vw;
                    height: 100vh;
                    max-width: none;
                    border-radius: 0;
                }
                
                .lessons-grid {
                    grid-template-columns: 1fr;
                }
                
                .modal-footer {
                    flex-direction: column;
                    gap: 16px;
                }
                
                .footer-stats {
                    width: 100%;
                    justify-content: center;
                }
                
                .footer-actions {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize the class lesson assignment module when DOM is ready
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        window.classLessonAssignment = new ClassLessonAssignment(window.lessonManager);
    });
}
