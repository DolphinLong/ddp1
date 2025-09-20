// ===== CENTRALIZED ERROR HANDLER =====

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.init();
    }

    init() {
        this.setupGlobalErrorHandling();
        this.setupNetworkErrorHandling();
        this.setupRetryMechanism();
    }

    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled Promise Rejection', 'critical');
            event.preventDefault();
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'JavaScript Error', 'error');
        });
    }

    setupNetworkErrorHandling() {
        // Monitor network status
        window.addEventListener('online', () => {
            if (window.uxEnhancer) {
                window.uxEnhancer.showErrorNotification('İnternet bağlantısı yeniden kuruldu', 'success');
            }
            this.retryFailedOperations();
        });

        window.addEventListener('offline', () => {
            if (window.uxEnhancer) {
                window.uxEnhancer.showErrorNotification('İnternet bağlantısı kesildi. Bazı özellikler çalışmayabilir.', 'warning', 10000);
            }
        });
    }

    setupRetryMechanism() {
        // Setup automatic retry for failed operations
        this.retryQueue = [];
    }

    handleError(error, context = '', severity = 'error', options = {}) {
        const errorInfo = {
            message: error.message || error,
            stack: error.stack,
            context,
            severity,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Log error
        this.logError(errorInfo);

        // Show user-friendly error message
        this.showUserError(errorInfo, options);

        // Handle specific error types
        this.handleSpecificErrors(error, context, options);

        // Report to analytics if available
        this.reportError(errorInfo);
    }

    logError(errorInfo) {
        console.error('Error logged:', errorInfo);
        this.errorLog.push(errorInfo);

        // Keep only last 100 errors
        if (this.errorLog.length > 100) {
            this.errorLog.shift();
        }
    }

    showUserError(errorInfo, options = {}) {
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        
        if (window.uxEnhancer) {
            window.uxEnhancer.showErrorNotification(
                userMessage,
                errorInfo.severity,
                options.duration || 5000
            );

            // Announce to screen readers
            window.uxEnhancer.announceToScreenReader(
                `Hata: ${userMessage}`
            );
        } else {
            // Fallback to basic notification
            alert(userMessage);
        }
    }

    getUserFriendlyMessage(errorInfo) {
        const { message, context, severity } = errorInfo;

        // Map technical errors to user-friendly messages
        const errorMappings = {
            'Network Error': 'İnternet bağlantısı sorunu. Lütfen bağlantınızı kontrol edin.',
            'Database Error': 'Veritabanı hatası oluştu. Lütfen tekrar deneyin.',
            'Validation Error': 'Girilen bilgilerde hata var. Lütfen kontrol edin.',
            'Permission Error': 'Bu işlem için yetkiniz bulunmuyor.',
            'Timeout Error': 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.',
            'File Error': 'Dosya işlemi sırasında hata oluştu.',
            'Authentication Error': 'Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.'
        };

        // Check for specific error patterns
        for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
            if (message.includes(pattern) || context.includes(pattern)) {
                return friendlyMessage;
            }
        }

        // Default messages based on context
        if (context.includes('loading') || context.includes('yüklen')) {
            return 'Veri yüklenirken hata oluştu. Sayfayı yenilemeyi deneyin.';
        }

        if (context.includes('saving') || context.includes('kaydet')) {
            return 'Kaydetme işlemi başarısız oldu. Lütfen tekrar deneyin.';
        }

        if (context.includes('deleting') || context.includes('sil')) {
            return 'Silme işlemi başarısız oldu. Lütfen tekrar deneyin.';
        }

        // Generic message based on severity
        switch (severity) {
            case 'critical':
                return 'Kritik bir hata oluştu. Sayfayı yenilemeniz gerekebilir.';
            case 'error':
                return 'Bir hata oluştu. Lütfen tekrar deneyin.';
            case 'warning':
                return 'Uyarı: İşlem tamamlanamadı.';
            default:
                return message || 'Bilinmeyen bir hata oluştu.';
        }
    }

    handleSpecificErrors(error, context, options = {}) {
        const message = error.message || error;

        // Network errors
        if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
            this.handleNetworkError(error, context, options);
            return;
        }

        // Database errors
        if (message.includes('database') || message.includes('SQL') || message.includes('SQLITE')) {
            this.handleDatabaseError(error, context, options);
            return;
        }

        // Validation errors
        if (message.includes('validation') || message.includes('required') || message.includes('invalid')) {
            this.handleValidationError(error, context, options);
            return;
        }

        // File system errors
        if (message.includes('ENOENT') || message.includes('file') || message.includes('directory')) {
            this.handleFileSystemError(error, context, options);
            return;
        }
    }

    handleNetworkError(error, context, options = {}) {
        // Add to retry queue if retryable
        if (options.retryable !== false) {
            this.addToRetryQueue(options.operation, context);
        }

        // Show network-specific help
        if (window.uxEnhancer) {
            setTimeout(() => {
                window.uxEnhancer.showErrorNotification(
                    'İpucu: Bağlantı sorunları için uygulamayı yeniden başlatmayı deneyin.',
                    'info',
                    8000
                );
            }, 2000);
        }
    }

    handleDatabaseError(error, context, options = {}) {
        // Suggest data refresh
        if (window.uxEnhancer) {
            setTimeout(() => {
                window.uxEnhancer.showErrorNotification(
                    'Veritabanı hatası. Sayfayı yenilemek sorunu çözebilir.',
                    'info',
                    6000
                );
            }, 1500);
        }
    }

    handleValidationError(error, context, options = {}) {
        // Focus on problematic field if specified
        if (options.fieldId) {
            const field = document.getElementById(options.fieldId);
            if (field) {
                field.focus();
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    handleFileSystemError(error, context, options = {}) {
        if (window.uxEnhancer) {
            window.uxEnhancer.showErrorNotification(
                'Dosya işlemi hatası. Dosya izinlerini kontrol edin.',
                'warning',
                6000
            );
        }
    }

    addToRetryQueue(operation, context) {
        if (typeof operation === 'function') {
            this.retryQueue.push({
                operation,
                context,
                attempts: 0,
                maxAttempts: this.maxRetries
            });
        }
    }

    async retryFailedOperations() {
        const retryableOperations = [...this.retryQueue];
        this.retryQueue = [];

        for (const item of retryableOperations) {
            if (item.attempts < item.maxAttempts) {
                try {
                    await item.operation();
                    
                    if (window.uxEnhancer) {
                        window.uxEnhancer.showErrorNotification(
                            `${item.context} işlemi başarıyla tamamlandı`,
                            'success',
                            3000
                        );
                    }
                } catch (error) {
                    item.attempts++;
                    if (item.attempts < item.maxAttempts) {
                        this.retryQueue.push(item);
                    } else {
                        this.handleError(error, `${item.context} (retry failed)`, 'error');
                    }
                }
            }
        }
    }

    reportError(errorInfo) {
        // This could send errors to an analytics service
        // For now, just log to console in development
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            console.group('Error Report');
            console.error('Error Info:', errorInfo);
            console.error('Recent Errors:', this.errorLog.slice(-5));
            console.groupEnd();
        }
    }

    // Public methods for manual error handling
    async withErrorHandling(operation, context, options = {}) {
        try {
            return await operation();
        } catch (error) {
            this.handleError(error, context, options.severity || 'error', options);
            
            if (options.rethrow) {
                throw error;
            }
            
            return options.fallbackValue;
        }
    }

    createRetryableOperation(operation, context, maxRetries = 3) {
        return async (...args) => {
            let lastError;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    return await operation(...args);
                } catch (error) {
                    lastError = error;
                    
                    if (attempt < maxRetries) {
                        // Wait before retry (exponential backoff)
                        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        
                        if (window.uxEnhancer) {
                            window.uxEnhancer.showErrorNotification(
                                `${context} - Deneme ${attempt + 1}/${maxRetries}`,
                                'info',
                                2000
                            );
                        }
                    }
                }
            }
            
            // All retries failed
            this.handleError(lastError, `${context} (${maxRetries} deneme başarısız)`, 'error');
            throw lastError;
        };
    }

    // Method to get error statistics
    getErrorStatistics() {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const recentErrors = this.errorLog.filter(error => 
            new Date(error.timestamp) > last24Hours
        );

        const errorsByType = {};
        const errorsBySeverity = {};

        recentErrors.forEach(error => {
            errorsByType[error.context] = (errorsByType[error.context] || 0) + 1;
            errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
        });

        return {
            total: this.errorLog.length,
            recent: recentErrors.length,
            byType: errorsByType,
            bySeverity: errorsBySeverity
        };
    }

    // Method to clear error log
    clearErrorLog() {
        this.errorLog = [];
        this.retryQueue = [];
        this.retryAttempts.clear();
    }
}

// Initialize error handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.errorHandler = new ErrorHandler();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}