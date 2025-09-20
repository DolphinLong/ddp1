// ===== UX ENHANCEMENTS =====
// Performance monitor flag (disable in production)
const ENABLE_PERF_MONITOR = false;

class UXEnhancer {
    constructor() {
        this.loadingStates = new Map();
        this.errorHandlers = new Map();
        this.init();
    }

    init() {
        this.setupGlobalErrorHandling();
        this.setupAccessibilityFeatures();
        this.setupKeyboardNavigation();
        this.setupTooltips();
        this.setupProgressIndicators();
        this.setupResponsiveHelpers();
        this.setupPerformanceMonitoring();
        this.enhanceFormValidation();
    }

    // ===== LOADING STATES =====
    
    showLoading(elementId, message = 'Yükleniyor...') {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Store original content
        if (!this.loadingStates.has(elementId)) {
            this.loadingStates.set(elementId, {
                originalContent: element.innerHTML,
                originalDisabled: element.disabled
            });
        }

        // Show loading state
        element.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <span class="loading-message">${message}</span>
            </div>
        `;
        
        if (element.tagName === 'BUTTON') {
            element.disabled = true;
        }
        
        element.classList.add('loading');
    }

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const originalState = this.loadingStates.get(elementId);
        if (originalState) {
            element.innerHTML = originalState.originalContent;
            element.disabled = originalState.originalDisabled;
            this.loadingStates.delete(elementId);
        }
        
        element.classList.remove('loading');
    }

    // ===== ERROR HANDLING =====
    
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showErrorNotification('Beklenmeyen bir hata oluştu', 'error');
            event.preventDefault();
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('JavaScript error:', event.error);
            this.showErrorNotification('Uygulama hatası oluştu', 'error');
        });
    }

    showErrorNotification(message, type = 'error', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add to notification container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);

        // Announce to screen readers
        this.announceToScreenReader(message);
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

    // ===== ACCESSIBILITY FEATURES =====
    
    setupAccessibilityFeatures() {
        // Add ARIA labels to interactive elements
        this.addAriaLabels();
        
        // Setup focus management
        this.setupFocusManagement();
        
        // Setup screen reader announcements
        this.setupScreenReaderSupport();
        
        // Add skip links
        this.addSkipLinks();
    }

    addAriaLabels() {
        // Add labels to buttons without text
        document.querySelectorAll('button:not([aria-label])').forEach(button => {
            const icon = button.querySelector('i');
            if (icon && !button.textContent.trim()) {
                const title = button.getAttribute('title') || button.getAttribute('data-tooltip');
                if (title) {
                    button.setAttribute('aria-label', title);
                }
            }
        });

        // Add labels to form inputs
        document.querySelectorAll('input:not([aria-label]):not([id])').forEach(input => {
            const placeholder = input.getAttribute('placeholder');
            if (placeholder) {
                input.setAttribute('aria-label', placeholder);
            }
        });

        // Add role to navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.setAttribute('role', 'menuitem');
        });
    }

    setupFocusManagement() {
        // Trap focus in modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const modal = document.querySelector('.modal-overlay:not([style*="display: none"])');
                if (modal) {
                    this.trapFocus(e, modal);
                }
            }
        });

        // Focus first input in modals
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList?.contains('modal-overlay')) {
                        const firstInput = node.querySelector('input, select, textarea, button');
                        if (firstInput) {
                            setTimeout(() => firstInput.focus(), 100);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }

    setupScreenReaderSupport() {
        // Create live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.id = 'live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
    }

    announceToScreenReader(message) {
        const liveRegion = document.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    addSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Ana içeriğe geç';
        skipLink.addEventListener('click', (e) => {
            e.preventDefault();
            const mainContent = document.getElementById('main-content') || document.querySelector('main');
            if (mainContent) {
                mainContent.focus();
                mainContent.scrollIntoView();
            }
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    // ===== KEYBOARD NAVIGATION =====
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // ESC key to close modals
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay:not([style*="display: none"])');
                if (modal) {
                    const closeButton = modal.querySelector('.modal-close, .close-btn');
                    if (closeButton) {
                        closeButton.click();
                    }
                }
            }

            // Arrow keys for navigation
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.classList.contains('nav-item')) {
                    e.preventDefault();
                    this.navigateWithArrows(e.key === 'ArrowDown' ? 1 : -1);
                }
            }

            // Enter key for buttons
            if (e.key === 'Enter') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.classList.contains('nav-item')) {
                    activeElement.click();
                }
            }
        });
    }

    navigateWithArrows(direction) {
        const navItems = Array.from(document.querySelectorAll('.nav-item'));
        const currentIndex = navItems.indexOf(document.activeElement);
        
        if (currentIndex !== -1) {
            const nextIndex = (currentIndex + direction + navItems.length) % navItems.length;
            navItems[nextIndex].focus();
        }
    }

    // ===== TOOLTIPS =====
    
    setupTooltips() {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);

        // Add tooltip listeners
        document.addEventListener('mouseover', (e) => {
            const element = e.target.closest('[data-tooltip], [title]');
            if (element) {
                const text = element.getAttribute('data-tooltip') || element.getAttribute('title');
                if (text) {
                    this.showTooltip(text, e.pageX, e.pageY);
                    // Remove title to prevent default tooltip
                    if (element.hasAttribute('title')) {
                        element.setAttribute('data-original-title', element.getAttribute('title'));
                        element.removeAttribute('title');
                    }
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            const element = e.target.closest('[data-tooltip], [data-original-title]');
            if (element) {
                this.hideTooltip();
                // Restore title
                if (element.hasAttribute('data-original-title')) {
                    element.setAttribute('title', element.getAttribute('data-original-title'));
                    element.removeAttribute('data-original-title');
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            const tooltip = document.getElementById('tooltip');
            if (tooltip.style.display === 'block') {
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY + 10) + 'px';
            }
        });
    }

    showTooltip(text, x, y) {
        const tooltip = document.getElementById('tooltip');
        tooltip.textContent = text;
        tooltip.style.left = (x + 10) + 'px';
        tooltip.style.top = (y + 10) + 'px';
        tooltip.style.display = 'block';
    }

    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.style.display = 'none';
    }

    // ===== PROGRESS INDICATORS =====
    
    setupProgressIndicators() {
        // Add progress bar for long operations
        this.createProgressBar();
    }

    createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.id = 'global-progress-bar';
        progressBar.className = 'global-progress-bar';
        progressBar.innerHTML = `
            <div class="progress-bar-fill"></div>
            <div class="progress-bar-text"></div>
        `;
        document.body.appendChild(progressBar);
    }

    showProgress(percentage, text = '') {
        const progressBar = document.getElementById('global-progress-bar');
        const fill = progressBar.querySelector('.progress-bar-fill');
        const textElement = progressBar.querySelector('.progress-bar-text');
        
        progressBar.style.display = 'block';
        fill.style.width = percentage + '%';
        textElement.textContent = text;
        
        // Announce progress to screen readers
        if (percentage % 25 === 0) { // Announce every 25%
            this.announceToScreenReader(`İlerleme: %${percentage}`);
        }
    }

    hideProgress() {
        const progressBar = document.getElementById('global-progress-bar');
        progressBar.style.display = 'none';
    }

    // ===== FORM VALIDATION ENHANCEMENTS =====
    
    enhanceFormValidation() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                if (!this.validateForm(form)) {
                    e.preventDefault();
                }
            });

            // Real-time validation
            form.querySelectorAll('input, select, textarea').forEach(field => {
                field.addEventListener('blur', () => {
                    this.validateField(field);
                });
            });
        });
    }

    validateForm(form) {
        let isValid = true;
        const fields = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        let isValid = true;
        let errorMessage = '';

        // Remove existing error styling
        field.classList.remove('error');
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Required field validation
        if (isRequired && !value) {
            isValid = false;
            errorMessage = 'Bu alan zorunludur';
        }

        // Email validation
        if (field.type === 'email' && value && !this.isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Geçerli bir e-posta adresi girin';
        }

        // Phone validation
        if (field.type === 'tel' && value && !this.isValidPhone(value)) {
            isValid = false;
            errorMessage = 'Geçerli bir telefon numarası girin';
        }

        // Show error if invalid
        if (!isValid) {
            field.classList.add('error');
            const errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.textContent = errorMessage;
            field.parentElement.appendChild(errorElement);
            
            // Announce error to screen readers
            this.announceToScreenReader(errorMessage);
        }

        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    // ===== RESPONSIVE HELPERS =====
    
    setupResponsiveHelpers() {
        // Add mobile detection
        this.isMobile = window.innerWidth <= 768;
        
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            
            if (wasMobile !== this.isMobile) {
                this.handleResponsiveChange();
            }
        });
    }

    handleResponsiveChange() {
        // Adjust UI for mobile/desktop
        if (this.isMobile) {
            document.body.classList.add('mobile');
            // Close any open dropdowns
            document.querySelectorAll('.dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        } else {
            document.body.classList.remove('mobile');
        }
    }

    // ===== PERFORMANCE MONITORING =====
    
    setupPerformanceMonitoring() {
        if (!ENABLE_PERF_MONITOR) return;
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.duration > 50) { // Tasks longer than 50ms
                        console.warn('Long task detected:', entry.duration + 'ms');
                    }
                });
            });
            
            observer.observe({ entryTypes: ['longtask'] });
        }
    }
}

// Initialize UX enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.uxEnhancer = new UXEnhancer();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UXEnhancer;
}