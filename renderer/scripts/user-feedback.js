// ===== USER FEEDBACK SYSTEM =====

class UserFeedbackManager {
    constructor() {
        this.feedbackQueue = [];
        this.feedbackHistory = [];
        this.settings = {
            showSuccessMessages: true,
            showInfoMessages: true,
            autoHideDelay: 5000,
            maxConcurrentNotifications: 5,
            enableSounds: false,
            enableVibration: true
        };
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupFeedbackContainer();
        this.setupKeyboardShortcuts();
        this.setupContextualHelp();
    }

    loadSettings() {
        const saved = localStorage.getItem('userFeedbackSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('userFeedbackSettings', JSON.stringify(this.settings));
    }

    setupFeedbackContainer() {
        // Ensure notification container exists
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-label', 'Bildirimler');
            document.body.appendChild(container);
        }

        // Add feedback controls
        this.addFeedbackControls();
    }

    addFeedbackControls() {
        const controls = document.createElement('div');
        controls.className = 'feedback-controls';
        controls.innerHTML = `
            <button class="feedback-control-btn" id="feedback-settings-btn" 
                    title="Bildirim ayarları" aria-label="Bildirim ayarlarını aç">
                <i class="fas fa-cog"></i>
            </button>
            <button class="feedback-control-btn" id="feedback-clear-btn" 
                    title="Bildirimleri temizle" aria-label="Tüm bildirimleri temizle">
                <i class="fas fa-times-circle"></i>
            </button>
        `;

        document.body.appendChild(controls);

        // Add event listeners
        document.getElementById('feedback-settings-btn').addEventListener('click', () => {
            this.showFeedbackSettings();
        });

        document.getElementById('feedback-clear-btn').addEventListener('click', () => {
            this.clearAllNotifications();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+N to toggle notifications
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.toggleNotifications();
            }

            // Ctrl+Shift+C to clear notifications
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.clearAllNotifications();
            }

            // Escape to dismiss latest notification
            if (e.key === 'Escape') {
                this.dismissLatestNotification();
            }
        });
    }

    setupContextualHelp() {
        // Add contextual help tooltips
        this.addContextualTooltips();
        
        // Setup help overlay
        this.setupHelpOverlay();
    }

    addContextualTooltips() {
        const helpTexts = {
            'backup-btn': 'Veritabanınızı yedekleyerek verilerinizi güvende tutun',
            'restore-btn': 'Önceden alınmış bir yedeği geri yükleyin',
            'add-teacher-btn': 'Sisteme yeni öğretmen ekleyin',
            'add-class-btn': 'Yeni sınıf oluşturun',
            'grade-filter': 'Sınıfları seviyeye göre filtreleyin',
            'status-filter': 'Duruma göre filtreleme yapın'
        };

        Object.entries(helpTexts).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element && !element.hasAttribute('data-tooltip')) {
                element.setAttribute('data-tooltip', text);
            }
        });
    }

    setupHelpOverlay() {
        // Create help overlay
        const overlay = document.createElement('div');
        overlay.id = 'help-overlay';
        overlay.className = 'help-overlay hidden';
        overlay.innerHTML = `
            <div class="help-content">
                <div class="help-header">
                    <h2>Klavye Kısayolları</h2>
                    <button class="help-close" aria-label="Yardımı kapat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="help-shortcuts">
                    <div class="shortcut-group">
                        <h3>Genel</h3>
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>M</kbd>
                            <span>Ana içeriğe git</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>N</kbd>
                            <span>Navigasyona git</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>Modal/bildirimi kapat</span>
                        </div>
                    </div>
                    <div class="shortcut-group">
                        <h3>Bildirimler</h3>
                        <div class="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd>
                            <span>Bildirimleri aç/kapat</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>
                            <span>Bildirimleri temizle</span>
                        </div>
                    </div>
                    <div class="shortcut-group">
                        <h3>Navigasyon</h3>
                        <div class="shortcut-item">
                            <kbd>↑</kbd> / <kbd>↓</kbd>
                            <span>Menüde gezin</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Enter</kbd>
                            <span>Seçimi onayla</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Tab</kbd>
                            <span>Sonraki elemana git</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add help button to header
        const helpBtn = document.createElement('button');
        helpBtn.className = 'btn btn-outline help-btn';
        helpBtn.innerHTML = '<i class="fas fa-question-circle"></i>';
        helpBtn.title = 'Yardım (F1)';
        helpBtn.setAttribute('aria-label', 'Yardım menüsünü aç');
        
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            headerActions.appendChild(helpBtn);
        }

        // Event listeners
        helpBtn.addEventListener('click', () => this.showHelp());
        overlay.querySelector('.help-close').addEventListener('click', () => this.hideHelp());

        // F1 key for help
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelp();
            }
        });
    }

    // Enhanced notification methods
    showSuccess(message, options = {}) {
        if (!this.settings.showSuccessMessages) return;
        
        this.showNotification(message, 'success', {
            duration: options.duration || 3000,
            persistent: options.persistent || false,
            actions: options.actions || []
        });
    }

    showInfo(message, options = {}) {
        if (!this.settings.showInfoMessages) return;
        
        this.showNotification(message, 'info', {
            duration: options.duration || 4000,
            persistent: options.persistent || false,
            actions: options.actions || []
        });
    }

    showWarning(message, options = {}) {
        this.showNotification(message, 'warning', {
            duration: options.duration || 6000,
            persistent: options.persistent || false,
            actions: options.actions || []
        });
    }

    showError(message, options = {}) {
        this.showNotification(message, 'error', {
            duration: options.duration || 8000,
            persistent: options.persistent || true,
            actions: options.actions || [
                {
                    text: 'Tekrar Dene',
                    action: options.retryAction || null
                }
            ]
        });
    }

    showNotification(message, type = 'info', options = {}) {
        const notification = {
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            message,
            type,
            timestamp: new Date(),
            ...options
        };

        // Add to queue
        this.feedbackQueue.push(notification);
        this.feedbackHistory.push(notification);

        // Limit concurrent notifications
        if (this.feedbackQueue.length > this.settings.maxConcurrentNotifications) {
            this.dismissOldestNotification();
        }

        // Render notification
        this.renderNotification(notification);

        // Auto-hide if not persistent
        if (!options.persistent && options.duration) {
            setTimeout(() => {
                this.dismissNotification(notification.id);
            }, options.duration);
        }

        // Play sound if enabled
        if (this.settings.enableSounds) {
            this.playNotificationSound(type);
        }

        // Vibrate if enabled and supported
        if (this.settings.enableVibration && navigator.vibrate) {
            const pattern = this.getVibrationPattern(type);
            navigator.vibrate(pattern);
        }

        return notification.id;
    }

    renderNotification(notification) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const element = document.createElement('div');
        element.id = notification.id;
        element.className = `notification notification-${notification.type}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');

        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-body">
                    <div class="notification-message">${notification.message}</div>
                    ${notification.actions && notification.actions.length > 0 ? `
                        <div class="notification-actions">
                            ${notification.actions.map(action => `
                                <button class="notification-action-btn" data-action="${action.action || ''}">
                                    ${action.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <button class="notification-close" aria-label="Bildirimi kapat">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-progress"></div>
        `;

        // Add event listeners
        element.querySelector('.notification-close').addEventListener('click', () => {
            this.dismissNotification(notification.id);
        });

        // Action buttons
        element.querySelectorAll('.notification-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionName = e.target.dataset.action;
                if (actionName && notification.actions) {
                    const action = notification.actions.find(a => a.action === actionName);
                    if (action && typeof action.action === 'function') {
                        action.action();
                    }
                }
                this.dismissNotification(notification.id);
            });
        });

        // Progress bar for auto-hide
        if (!notification.persistent && notification.duration) {
            const progressBar = element.querySelector('.notification-progress');
            progressBar.style.animationDuration = notification.duration + 'ms';
            progressBar.classList.add('active');
        }

        container.appendChild(element);

        // Animate in
        requestAnimationFrame(() => {
            element.classList.add('show');
        });
    }

    dismissNotification(id) {
        const element = document.getElementById(id);
        if (!element) return;

        element.classList.add('hide');
        
        setTimeout(() => {
            element.remove();
            this.feedbackQueue = this.feedbackQueue.filter(n => n.id !== id);
        }, 300);
    }

    dismissOldestNotification() {
        if (this.feedbackQueue.length > 0) {
            this.dismissNotification(this.feedbackQueue[0].id);
        }
    }

    dismissLatestNotification() {
        if (this.feedbackQueue.length > 0) {
            const latest = this.feedbackQueue[this.feedbackQueue.length - 1];
            this.dismissNotification(latest.id);
        }
    }

    clearAllNotifications() {
        this.feedbackQueue.forEach(notification => {
            this.dismissNotification(notification.id);
        });
        
        if (window.uxEnhancer) {
            window.uxEnhancer.announceToScreenReader('Tüm bildirimler temizlendi');
        }
    }

    toggleNotifications() {
        const container = document.getElementById('notification-container');
        if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    getVibrationPattern(type) {
        const patterns = {
            'success': [100],
            'error': [100, 50, 100, 50, 100],
            'warning': [100, 50, 100],
            'info': [50]
        };
        return patterns[type] || [50];
    }

    playNotificationSound(type) {
        // This would play different sounds for different notification types
        // For now, just use the system beep
        if (window.electronAPI && window.electronAPI.system && window.electronAPI.system.beep) {
            window.electronAPI.system.beep();
        }
    }

    showFeedbackSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal feedback-settings-modal">
                <div class="modal-header">
                    <h3>Bildirim Ayarları</h3>
                    <button class="modal-close" aria-label="Kapat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="setting-group">
                        <label class="setting-item">
                            <input type="checkbox" id="show-success" ${this.settings.showSuccessMessages ? 'checked' : ''}>
                            <span>Başarı mesajlarını göster</span>
                        </label>
                        <label class="setting-item">
                            <input type="checkbox" id="show-info" ${this.settings.showInfoMessages ? 'checked' : ''}>
                            <span>Bilgi mesajlarını göster</span>
                        </label>
                        <label class="setting-item">
                            <input type="checkbox" id="enable-sounds" ${this.settings.enableSounds ? 'checked' : ''}>
                            <span>Ses efektlerini etkinleştir</span>
                        </label>
                        <label class="setting-item">
                            <input type="checkbox" id="enable-vibration" ${this.settings.enableVibration ? 'checked' : ''}>
                            <span>Titreşimi etkinleştir</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-item">
                            <span>Otomatik gizleme süresi (ms)</span>
                            <input type="range" id="auto-hide-delay" min="1000" max="10000" step="500" 
                                   value="${this.settings.autoHideDelay}">
                            <span id="delay-value">${this.settings.autoHideDelay}ms</span>
                        </label>
                        <label class="setting-item">
                            <span>Maksimum eşzamanlı bildirim</span>
                            <input type="range" id="max-notifications" min="1" max="10" 
                                   value="${this.settings.maxConcurrentNotifications}">
                            <span id="max-value">${this.settings.maxConcurrentNotifications}</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-settings">İptal</button>
                    <button class="btn btn-primary" id="save-settings">Kaydet</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#cancel-settings').addEventListener('click', () => modal.remove());
        
        modal.querySelector('#save-settings').addEventListener('click', () => {
            this.settings.showSuccessMessages = modal.querySelector('#show-success').checked;
            this.settings.showInfoMessages = modal.querySelector('#show-info').checked;
            this.settings.enableSounds = modal.querySelector('#enable-sounds').checked;
            this.settings.enableVibration = modal.querySelector('#enable-vibration').checked;
            this.settings.autoHideDelay = parseInt(modal.querySelector('#auto-hide-delay').value);
            this.settings.maxConcurrentNotifications = parseInt(modal.querySelector('#max-notifications').value);
            
            this.saveSettings();
            this.showSuccess('Ayarlar kaydedildi');
            modal.remove();
        });

        // Update display values
        modal.querySelector('#auto-hide-delay').addEventListener('input', (e) => {
            modal.querySelector('#delay-value').textContent = e.target.value + 'ms';
        });

        modal.querySelector('#max-notifications').addEventListener('input', (e) => {
            modal.querySelector('#max-value').textContent = e.target.value;
        });
    }

    showHelp() {
        const overlay = document.getElementById('help-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.focus();
        }
    }

    hideHelp() {
        const overlay = document.getElementById('help-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    // Method to show contextual help for specific features
    showContextualHelp(feature) {
        const helpTexts = {
            'elective-tracker': 'Seçmeli ders takip sistemi ile hangi sınıflara hangi seçmeli derslerin atandığını görüntüleyebilir ve eksik atamaları tespit edebilirsiniz.',
            'quick-assignment': 'Hızlı atama paneli ile seçmeli ders atamalarını kolayca yapabilirsiniz. Çakışma kontrolü otomatik olarak yapılır.',
            'statistics': 'İstatistik panelinde seçmeli ders atama durumunun genel görünümünü ve tamamlanma oranlarını görebilirsiniz.',
            'alerts': 'Uyarı sistemi eksik seçmeli ders atamalarını otomatik olarak tespit eder ve size bildirir.'
        };

        const text = helpTexts[feature];
        if (text) {
            this.showInfo(text, { duration: 8000, persistent: false });
        }
    }
}

// Initialize user feedback manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.userFeedback = new UserFeedbackManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserFeedbackManager;
}