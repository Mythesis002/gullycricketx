import { Platform } from 'react-native';

export interface FallbackAuthOptions {
  useLocalAuth: boolean;
  bypassOAuth: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface AuthRecoveryStrategy {
  strategy: 'retry' | 'fallback' | 'manual' | 'support';
  delay: number;
  message: string;
  action: string;
}

export class AuthFallback {
  private static instance: AuthFallback;
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private recoveryAttempts = 0;

  static getInstance(): AuthFallback {
    if (!AuthFallback.instance) {
      AuthFallback.instance = new AuthFallback();
    }
    return AuthFallback.instance;
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    console.log(`🔍 Auth failure recorded. Total: ${this.consecutiveFailures}`);
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.recoveryAttempts = 0;
    console.log('✅ Auth success recorded. Resetting failure counter.');
  }

  shouldUseFallback(): boolean {
    return this.consecutiveFailures >= 3;
  }

  getRecoveryStrategy(): AuthRecoveryStrategy {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    
    // If it's been more than 30 minutes, reset and try again
    if (timeSinceLastFailure > 30 * 60 * 1000) {
      this.consecutiveFailures = 0;
      this.recoveryAttempts = 0;
      return {
        strategy: 'retry',
        delay: 0,
        message: 'Ready to try authentication again',
        action: 'Try signing in again'
      };
    }

    // If we've had 3+ failures, suggest fallback
    if (this.consecutiveFailures >= 3) {
      this.recoveryAttempts++;
      
      if (this.recoveryAttempts <= 2) {
        return {
          strategy: 'fallback',
          delay: 60000, // 1 minute
          message: 'OAuth service appears to be having issues',
          action: 'Try alternative authentication method'
        };
      } else {
        return {
          strategy: 'support',
          delay: 0,
          message: 'Persistent authentication issues detected',
          action: 'Contact support for assistance'
        };
      }
    }

    // Normal retry with exponential backoff
    const delays = [5000, 15000, 30000]; // 5s, 15s, 30s
    const delay = delays[Math.min(this.consecutiveFailures - 1, delays.length - 1)];
    
    return {
      strategy: 'retry',
      delay,
      message: `Authentication failed. Retrying in ${delay / 1000} seconds...`,
      action: 'Wait and try again'
    };
  }

  getFallbackOptions(): FallbackAuthOptions {
    return {
      useLocalAuth: this.consecutiveFailures >= 3,
      bypassOAuth: this.consecutiveFailures >= 5,
      retryCount: this.consecutiveFailures,
      maxRetries: 5
    };
  }

  generateSupportReport(): string {
    const timestamp = new Date().toISOString();
    const platform = Platform.OS;
    
    let report = `=== Authentication Support Report ===\n`;
    report += `Timestamp: ${timestamp}\n`;
    report += `Platform: ${platform}\n`;
    report += `Project ID: ed2d765b-98bc-43ad-a0b0-05eb9e6bfed9\n`;
    report += `Consecutive Failures: ${this.consecutiveFailures}\n`;
    report += `Recovery Attempts: ${this.recoveryAttempts}\n`;
    report += `Time Since Last Failure: ${Math.round((Date.now() - this.lastFailureTime) / 1000)}s\n\n`;
    
    report += `=== Error Details ===\n`;
    report += `Error: "Failed to exchange code for token"\n`;
    report += `Category: OAuth Token Exchange\n`;
    report += `Severity: Critical (persistent)\n\n`;
    
    report += `=== Troubleshooting Attempted ===\n`;
    report += `• Multiple authentication attempts\n`;
    report += `• Network connectivity checks\n`;
    report += `• OAuth endpoint verification\n`;
    report += `• Platform-specific solutions\n`;
    report += `• Retry with exponential backoff\n\n`;
    
    report += `=== Recommended Actions ===\n`;
    report += `1. Check OAuth service status\n`;
    report += `2. Verify project configuration\n`;
    report += `3. Review network connectivity\n`;
    report += `4. Consider alternative authentication method\n`;
    
    return report;
  }

  getImmediateActions(): string[] {
    const actions = [
      '🔄 **Immediate Actions:**',
      '• Wait 5-10 minutes before trying again',
      '• Restart the app completely',
      '• Check internet connection',
      '',
      '🔧 **If Problem Persists:**',
      '• Try using a different network (WiFi vs mobile data)',
      '• Clear app cache and data',
      '• Update the app if available',
      '',
      '📞 **Contact Support:**',
      '• Provide the support report from the app',
      '• Include platform and error details',
      '• Mention this is a persistent OAuth issue'
    ];

    if (Platform.OS === 'ios') {
      actions.push('📱 **iOS Specific:**');
      actions.push('• Check iOS settings for app restrictions');
      actions.push('• Ensure app has proper permissions');
      actions.push('• Try signing out and back in to iCloud');
    }

    return actions;
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.recoveryAttempts = 0;
    this.lastFailureTime = 0;
    console.log('🔄 Auth fallback system reset');
  }
}

export const authFallback = AuthFallback.getInstance(); 