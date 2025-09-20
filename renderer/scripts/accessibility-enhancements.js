// ===== ACCESSIBILITY ENHANCEMENTS =====

class AccessibilityEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.enhanceNavigation();
        this.enhanceButtons();
        this.enhanceForms();
        this.enhanceTables();
        this.enhanceModals();
        this.addLandmarks();
        this.setupKeyboardNavigation();
    }

    enhanceNavigation() {
        // Add navigation landmark and ARIA labels
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.setAttribute('role', 'navigation');
            sidebar.setAttribute('aria-label', 'Ana navigasyon');
        }

        // Enhance navigation items
        document.querySelectorAll('.nav-item').forEach((item, index) => {
            item.setAttribute('role', 'menuitem');
            item.setAttribute('tabindex', index === 0 ? '0' : '-1');
            
            // Add keyboard support
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });

        // Add navigation container role
        const navContainer = document.querySelector('.sidebar-nav');
        if (navContainer) {
            navContainer.setAttribute('role', 'menu');
            navContainer.setAttribute('aria-label', 'Sistem menüsü');
        }
    }

    enhanceButtons() {
        // Add ARIA labels to buttons without text content
        document.querySelectorAll('button').forEach(button => {
            // Skip if already has aria-label
            if (button.hasAttribute('aria-label')) return;

            const icon = button.querySelector('i');
            const text = button.textContent.trim();
            
            if (!text && icon) {
                // Button with only icon - add aria-label based on icon class or title
                const title = button.getAttribute('title');
                if (title) {
                    button.setAttribute('aria-label', title);
                } else {
                    // Try to infer from icon class
                    const iconClass = icon.className;
                    const label = this.getIconLabel(iconClass);
                    if (label) {
                        button.setAttribute('aria-label', label);
                    }
                }
            }

            // Add button role if not present
            if (!button.hasAttribute('role')) {
                button.setAttribute('role', 'button');
            }

            // Ensure buttons are keyboard accessible
            if (!button.hasAttribute('tabindex')) {
                button.setAttribute('tabindex', '0');
            }
        });
    }

    enhanceForms() {
        // Enhance form inputs
        document.querySelectorAll('input, select, textarea').forEach(field => {
            // Add required indicator for screen readers
            if (field.hasAttribute('required')) {
                field.setAttribute('aria-required', 'true');
                
                // Add visual indicator if not present
                const label = document.querySelector(`label[for="${field.id}"]`);
                if (label && !label.textContent.includes('*')) {
                    label.innerHTML += ' <span class="required-indicator" aria-hidden="true">*</span>';
                }
            }

            // Add describedby for error messages
            const errorElement = field.parentElement.querySelector('.field-error');
            if (errorElement) {
                const errorId = field.id + '-error';
                errorElement.id = errorId;
                field.setAttribute('aria-describedby', errorId);
                field.setAttribute('aria-invalid', 'true');
            }

            // Add labels for inputs without them
            if (!field.hasAttribute('aria-label') && !field.hasAttribute('aria-labelledby')) {
                const placeholder = field.getAttribute('placeholder');
                if (placeholder) {
                    field.setAttribute('aria-label', placeholder);
                }
            }
        });

        // Enhance form validation
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                const invalidFields = form.querySelectorAll(':invalid');
                if (invalidFields.length > 0) {
                    // Focus first invalid field
                    invalidFields[0].focus();
                    
                    // Announce error count
                    if (window.uxEnhancer) {
                        window.uxEnhancer.announceToScreenReader(
                            `Form geçersiz. ${invalidFields.length} alan düzeltilmeli.`
                        );
                    }
                }
            });
        });
    }

    enhanceTables() {
        document.querySelectorAll('table').forEach(table => {
            // Add table role and caption if missing
            table.setAttribute('role', 'table');
            
            if (!table.querySelector('caption')) {
                const caption = document.createElement('caption');
                caption.textContent = 'Veri tablosu';
                caption.className = 'sr-only'; // Screen reader only
                table.insertBefore(caption, table.firstChild);
            }

            // Enhance table headers
            table.querySelectorAll('th').forEach(header => {
                header.setAttribute('scope', 'col');
                
                // Add sort information for sortable headers
                if (header.classList.contains('sortable')) {
                    header.setAttribute('role', 'columnheader');
                    header.setAttribute('tabindex', '0');
                    header.setAttribute('aria-sort', 'none');
                    
                    // Add keyboard support for sorting
                    header.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            header.click();
                        }
                    });
                }
            });

            // Add row headers for first column if it contains names/identifiers
            const firstColumnCells = table.querySelectorAll('tbody tr td:first-child');
            firstColumnCells.forEach(cell => {
                if (cell.textContent.trim()) {
                    cell.setAttribute('scope', 'row');
                }
            });
        });
    }

    enhanceModals() {
        document.querySelectorAll('.modal, .modal-overlay').forEach(modal => {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            
            // Add aria-labelledby for modal title
            const title = modal.querySelector('h1, h2, h3, .modal-title');
            if (title) {
                const titleId = title.id || 'modal-title-' + Date.now();
                title.id = titleId;
                modal.setAttribute('aria-labelledby', titleId);
            }

            // Add aria-describedby for modal content
            const content = modal.querySelector('.modal-content, .modal-body');
            if (content) {
                const contentId = content.id || 'modal-content-' + Date.now();
                content.id = contentId;
                modal.setAttribute('aria-describedby', contentId);
            }

            // Ensure modal is hidden from screen readers when not visible
            if (modal.style.display === 'none' || modal.classList.contains('hidden')) {
                modal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    addLandmarks() {
        // Add main landmark
        const mainContent = document.querySelector('.main-content, main, #main-content');
        if (mainContent) {
            mainContent.setAttribute('role', 'main');
            mainContent.setAttribute('id', 'main-content');
        } else {
            // Create main landmark if not exists
            const appDiv = document.getElementById('app');
            if (appDiv) {
                const main = document.createElement('main');
                main.id = 'main-content';
                main.setAttribute('role', 'main');
                
                // Move content sections to main
                const sections = appDiv.querySelectorAll('.section, [data-section]');
                sections.forEach(section => {
                    main.appendChild(section);
                });
                
                appDiv.appendChild(main);
            }
        }

        // Add header landmark
        const header = document.querySelector('.app-header, header');
        if (header) {
            header.setAttribute('role', 'banner');
        }

        // Add complementary landmarks for sidebars
        document.querySelectorAll('.sidebar:not([role])').forEach(sidebar => {
            sidebar.setAttribute('role', 'complementary');
            sidebar.setAttribute('aria-label', 'Yan panel');
        });
    }

    setupKeyboardNavigation() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + M to focus main content
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                const main = document.getElementById('main-content');
                if (main) {
                    main.focus();
                    main.scrollIntoView();
                }
            }

            // Alt + N to focus navigation
            if (e.altKey && e.key === 'n') {
                e.preventDefault();
                const nav = document.querySelector('.sidebar-nav .nav-item');
                if (nav) {
                    nav.focus();
                }
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not([style*="display: none"]), .modal-overlay:not(.hidden)');
                if (openModal) {
                    const closeButton = openModal.querySelector('.close, .modal-close, [data-dismiss="modal"]');
                    if (closeButton) {
                        closeButton.click();
                    }
                }
            }
        });

        // Arrow key navigation for nav items
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('nav-item')) {
                const navItems = Array.from(document.querySelectorAll('.nav-item'));
                const currentIndex = navItems.indexOf(e.target);
                
                let nextIndex = currentIndex;
                
                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        nextIndex = (currentIndex + 1) % navItems.length;
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        nextIndex = (currentIndex - 1 + navItems.length) % navItems.length;
                        break;
                    case 'Home':
                        e.preventDefault();
                        nextIndex = 0;
                        break;
                    case 'End':
                        e.preventDefault();
                        nextIndex = navItems.length - 1;
                        break;
                }
                
                if (nextIndex !== currentIndex) {
                    // Update tabindex
                    navItems.forEach((item, index) => {
                        item.setAttribute('tabindex', index === nextIndex ? '0' : '-1');
                    });
                    navItems[nextIndex].focus();
                }
            }
        });
    }

    getIconLabel(iconClass) {
        const iconLabels = {
            'fa-home': 'Ana sayfa',
            'fa-chalkboard-teacher': 'Öğretmenler',
            'fa-school': 'Sınıflar',
            'fa-book': 'Dersler',
            'fa-calendar-alt': 'Program',
            'fa-tasks': 'Seçmeli ders takibi',
            'fa-chart-bar': 'Raporlar',
            'fa-cog': 'Ayarlar',
            'fa-plus': 'Ekle',
            'fa-edit': 'Düzenle',
            'fa-trash': 'Sil',
            'fa-download': 'İndir',
            'fa-upload': 'Yükle',
            'fa-sync': 'Yenile',
            'fa-search': 'Ara',
            'fa-filter': 'Filtrele',
            'fa-sort': 'Sırala',
            'fa-times': 'Kapat',
            'fa-check': 'Onayla',
            'fa-save': 'Kaydet',
            'fa-print': 'Yazdır',
            'fa-file-export': 'Dışa aktar'
        };

        for (const [iconClass, label] of Object.entries(iconLabels)) {
            if (iconClass.includes(iconClass)) {
                return label;
            }
        }

        return null;
    }

    // Method to update sort state for table headers
    updateSortState(header, direction) {
        // Reset all headers
        document.querySelectorAll('th[aria-sort]').forEach(th => {
            th.setAttribute('aria-sort', 'none');
        });

        // Set current header
        header.setAttribute('aria-sort', direction);
        
        // Announce sort change
        if (window.uxEnhancer) {
            const columnName = header.textContent.trim();
            const directionText = direction === 'ascending' ? 'artan' : 'azalan';
            window.uxEnhancer.announceToScreenReader(
                `${columnName} sütunu ${directionText} sırada sıralandı`
            );
        }
    }

    // Method to announce dynamic content changes
    announceContentChange(message) {
        if (window.uxEnhancer) {
            window.uxEnhancer.announceToScreenReader(message);
        }
    }

    // Method to add loading state announcements
    announceLoadingState(isLoading, context = '') {
        if (window.uxEnhancer) {
            const message = isLoading 
                ? `${context} yükleniyor` 
                : `${context} yükleme tamamlandı`;
            window.uxEnhancer.announceToScreenReader(message);
        }
    }
}

// Initialize accessibility enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.accessibilityEnhancer = new AccessibilityEnhancer();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityEnhancer;
}