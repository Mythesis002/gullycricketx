import { Platform } from 'react-native';

export interface AuthDebugInfo {
  timestamp: string;
  platform: string;
  userAgent?: string;
  networkStatus?: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  context?: Record<string, any>;
}

// Helper function to safely access localStorage
const getLocalStorage = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

const setLocalStorageItem = (key: string, value: string): void => {
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to set localStorage item:', e);
    }
  }
};

const getLocalStorageItem = (key: string): string | null => {
  const storage = getLocalStorage();
  if (storage) {
    try {
      return storage.getItem(key);
    } catch (e) {
      console.warn('Failed to get localStorage item:', e);
      return null;
    }
  }
  return null;
};

const removeLocalStorageItem = (key: string): void => {
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove localStorage item:', e);
    }
  }
};

class AuthDebugger {
  private static instance: AuthDebugger;
  private debugLogs: AuthDebugInfo[] = [];
  private maxLogs = 50;

  static getInstance(): AuthDebugger {
    if (!AuthDebugger.instance) {
      AuthDebugger.instance = new AuthDebugger();
    }
    return AuthDebugger.instance;
  }

  logError(error: Error | string, context?: Record<string, any>) {
    const debugInfo: AuthDebugInfo = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      userAgent: Platform.OS === 'web' && typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      errorType: error instanceof Error ? error.constructor.name : 'String',
      errorMessage: error instanceof Error ? error.message : error,
      errorStack: error instanceof Error ? error.stack : undefined,
      context,
    };

    this.debugLogs.push(debugInfo);
    
    // Keep only the last maxLogs entries
    if (this.debugLogs.length > this.maxLogs) {
      this.debugLogs = this.debugLogs.slice(-this.maxLogs);
    }

    console.log('🔍 [AuthDebugger]', debugInfo);
    
    // Store in localStorage for web platform
    if (Platform.OS === 'web') {
      try {
        setLocalStorageItem('authDebugLogs', JSON.stringify(this.debugLogs));
      } catch (e) {
        console.warn('Failed to store auth debug logs:', e);
      }
    }
  }

  getLogs(): AuthDebugInfo[] {
    return [...this.debugLogs];
  }

  clearLogs() {
    this.debugLogs = [];
    if (Platform.OS === 'web') {
      try {
        removeLocalStorageItem('authDebugLogs');
      } catch (e) {
        console.warn('Failed to clear auth debug logs:', e);
      }
    }
  }

  getRecentErrors(count: number = 5): AuthDebugInfo[] {
    return this.debugLogs
      .filter(log => log.errorType !== 'String')
      .slice(-count);
  }

  analyzeAuthError(error: Error): {
    category: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  } {
    const message = error.message.toLowerCase();
    
    if (message.includes('failed to exchange code for token')) {
      return {
        category: 'OAuth Token Exchange',
        suggestion: 'This is typically a temporary issue. Try refreshing the page and signing in again. If the problem persists, it might be a network connectivity issue.',
        severity: 'medium'
      };
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        category: 'Network Error',
        suggestion: 'Check your internet connection and try again. If you\'re on a restricted network, try using a different connection.',
        severity: 'medium'
      };
    }
    
    if (message.includes('cancelled') || message.includes('user cancelled')) {
      return {
        category: 'User Cancellation',
        suggestion: 'The user cancelled the authentication process. This is normal behavior.',
        severity: 'low'
      };
    }
    
    if (message.includes('invalid') || message.includes('expired')) {
      return {
        category: 'Invalid Credentials',
        suggestion: 'The authentication credentials may be invalid or expired. Try signing in again.',
        severity: 'high'
      };
    }
    
    if (message.includes('localstorage') || message.includes('property') && message.includes('doesn\'t exist')) {
      return {
        category: 'Platform Compatibility',
        suggestion: 'This is a platform compatibility issue. The app is trying to access web-only features on a mobile platform.',
        severity: 'medium'
      };
    }
    
    return {
      category: 'Unknown Error',
      suggestion: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      severity: 'high'
    };
  }

  generateReport(): string {
    const recentErrors = this.getRecentErrors(10);
    const errorCounts = recentErrors.reduce((acc, log) => {
      acc[log.errorType] = (acc[log.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let report = `Auth Debug Report - ${new Date().toLocaleString()}\n`;
    report += `Platform: ${Platform.OS}\n`;
    report += `Total Errors: ${recentErrors.length}\n\n`;
    
    report += 'Error Types:\n';
    Object.entries(errorCounts).forEach(([type, count]) => {
      report += `  ${type}: ${count}\n`;
    });
    
    report += '\nRecent Errors:\n';
    recentErrors.forEach((log, index) => {
      const analysis = this.analyzeAuthError(new Error(log.errorMessage));
      report += `${index + 1}. ${log.timestamp} - ${log.errorType}\n`;
      report += `   Message: ${log.errorMessage}\n`;
      report += `   Category: ${analysis.category}\n`;
      report += `   Suggestion: ${analysis.suggestion}\n\n`;
    });

    return report;
  }
}

export const authDebugger = AuthDebugger.getInstance();

// Auto-load logs from localStorage on web
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const storedLogs = getLocalStorageItem('authDebugLogs');
    if (storedLogs) {
      const logs = JSON.parse(storedLogs);
      authDebugger['debugLogs'] = logs;
    }
  } catch (e) {
    console.warn('Failed to load stored auth debug logs:', e);
  }
} 