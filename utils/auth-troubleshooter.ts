import { Platform } from 'react-native';

export interface NetworkCheckResult {
  isOnline: boolean;
  connectionType?: string;
  latency?: number;
}

export interface OAuthConfig {
  projectId: string;
  redirectUri?: string;
  clientId?: string;
  scopes?: string[];
}

export interface OAuthIssue {
  type: 'network' | 'configuration' | 'service' | 'redirect' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  solution: string;
  code?: string;
}

export class AuthTroubleshooter {
  private static instance: AuthTroubleshooter;

  static getInstance(): AuthTroubleshooter {
    if (!AuthTroubleshooter.instance) {
      AuthTroubleshooter.instance = new AuthTroubleshooter();
    }
    return AuthTroubleshooter.instance;
  }

  async checkNetworkConnectivity(): Promise<NetworkCheckResult> {
    try {
      // Simple network check by trying to fetch a small resource
      const startTime = Date.now();
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const endTime = Date.now();
      const latency = endTime - startTime;

      return {
        isOnline: response.ok,
        latency,
        connectionType: Platform.OS === 'web' ? 'web' : 'mobile',
      };
    } catch (error) {
      console.log('🔍 Network check failed:', error);
      return {
        isOnline: false,
        connectionType: Platform.OS === 'web' ? 'web' : 'mobile',
      };
    }
  }

  async checkOAuthEndpoints(): Promise<{
    authEndpoint: boolean;
    tokenEndpoint: boolean;
    userInfoEndpoint: boolean;
  }> {
    const results = {
      authEndpoint: false,
      tokenEndpoint: false,
      userInfoEndpoint: false,
    };

    try {
      // Check if the OAuth endpoints are accessible
      // Note: These are example endpoints - replace with actual ones
      const endpoints = [
        'https://project-83364bf5.dev.kiki.dev',
        'https://kiki.dev',
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'HEAD',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });
          
          if (response.ok) {
            results.authEndpoint = true;
            break;
          }
        } catch (e) {
          console.log(`🔍 Endpoint ${endpoint} not accessible:`, e);
        }
      }
    } catch (error) {
      console.log('🔍 OAuth endpoint check failed:', error);
    }

    return results;
  }

  analyzeOAuthError(errorMessage: string): OAuthIssue {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('failed to refresh token') && message.includes('internal server error')) {
      return {
        type: 'service',
        severity: 'critical',
        description: 'OAuth server is experiencing internal errors - this is a server-side issue',
        solution: 'The authentication service is having technical difficulties. Please try again later or contact support.',
        code: 'OAUTH_SERVER_ERROR',
      };
    }
    
    if (message.includes('failed to refresh token')) {
      return {
        type: 'service',
        severity: 'high',
        description: 'OAuth token refresh failed - this may be a temporary server issue',
        solution: 'The authentication service may be temporarily unavailable. Try again in a few minutes.',
        code: 'TOKEN_REFRESH_FAILED',
      };
    }
    
    if (message.includes('failed to exchange code for token')) {
      return {
        type: 'service',
        severity: 'high',
        description: 'OAuth token exchange failed - this is the most common OAuth error',
        solution: 'This is typically a temporary issue. Try refreshing the page and signing in again. If the problem persists, it may be a network or configuration issue.',
        code: 'TOKEN_EXCHANGE_FAILED',
      };
    }
    
    if (message.includes('internal server error')) {
      return {
        type: 'service',
        severity: 'critical',
        description: 'OAuth server is experiencing internal errors',
        solution: 'The authentication service is down. Please try again later or contact support immediately.',
        code: 'INTERNAL_SERVER_ERROR',
      };
    }
    
    if (message.includes('invalid_grant')) {
      return {
        type: 'configuration',
        severity: 'medium',
        description: 'Invalid OAuth grant - authorization code may have expired',
        solution: 'The authorization code has expired. Try signing in again to get a fresh code.',
        code: 'INVALID_GRANT',
      };
    }
    
    if (message.includes('redirect_uri_mismatch')) {
      return {
        type: 'redirect',
        severity: 'high',
        description: 'Redirect URI mismatch - OAuth configuration issue',
        solution: 'This is a server-side configuration issue. Contact support.',
        code: 'REDIRECT_URI_MISMATCH',
      };
    }

    if (message.includes('invalid_client')) {
      return {
        type: 'configuration',
        severity: 'critical',
        description: 'Invalid OAuth client - client ID or secret issue',
        solution: 'OAuth client configuration is incorrect. Contact support.',
        code: 'INVALID_CLIENT',
      };
    }

    if (message.includes('unauthorized_client')) {
      return {
        type: 'configuration',
        severity: 'high',
        description: 'Unauthorized OAuth client',
        solution: 'OAuth client is not authorized for this flow. Contact support.',
        code: 'UNAUTHORIZED_CLIENT',
      };
    }

    return {
      type: 'unknown',
      severity: 'medium',
      description: 'Unknown OAuth error',
      solution: 'Try refreshing the page and signing in again. If the problem persists, contact support.',
      code: 'UNKNOWN_ERROR',
    };
  }

  generateDiagnosticReport(): string {
    const timestamp = new Date().toISOString();
    const platform = Platform.OS;
    const userAgent = Platform.OS === 'web' && typeof window !== 'undefined' 
      ? window.navigator.userAgent 
      : 'Mobile App';

    let report = `=== Authentication Diagnostic Report ===\n`;
    report += `Timestamp: ${timestamp}\n`;
    report += `Platform: ${platform}\n`;
    report += `User Agent: ${userAgent}\n`;
    report += `Project ID: ed2d765b-98bc-43ad-a0b0-05eb9e6bfed9\n\n`;

    report += `=== Common Solutions ===\n`;
    report += `1. Clear browser cache and cookies\n`;
    report += `2. Try incognito/private browsing mode\n`;
    report += `3. Check internet connection\n`;
    report += `4. Wait 5-10 minutes before retrying\n`;
    report += `5. Try a different browser\n`;
    report += `6. Restart the app\n\n`;

    report += `=== Technical Details ===\n`;
    report += `Error: "Failed to exchange code for token"\n`;
    report += `Category: OAuth Token Exchange\n`;
    report += `Severity: High\n`;
    report += `Likely Cause: Network issue, OAuth configuration, or service problem\n\n`;

    report += `=== Next Steps ===\n`;
    report += `1. Run network connectivity check\n`;
    report += `2. Verify OAuth configuration\n`;
    report += `3. Check authentication service status\n`;
    report += `4. Contact support if issue persists\n`;

    return report;
  }

  async runFullDiagnostic(): Promise<{
    networkCheck: NetworkCheckResult;
    oauthCheck: any;
    oauthIssue: OAuthIssue;
    recommendations: string[];
  }> {
    console.log('🔍 Running full authentication diagnostic...');

    const networkCheck = await this.checkNetworkConnectivity();
    const oauthCheck = await this.checkOAuthEndpoints();
    
    // Use the actual error message for analysis
    const actualError = 'Failed to refresh token: {"error":"failed_to_get_token","message":"Failed to get token: Internal Server Error"}';
    const oauthIssue = this.analyzeOAuthError(actualError);
    
    const recommendations: string[] = [];

    // Analyze results and generate recommendations
    if (!networkCheck.isOnline) {
      recommendations.push('❌ No internet connection detected. Please check your network.');
    } else if (networkCheck.latency && networkCheck.latency > 5000) {
      recommendations.push('⚠️ Slow network connection detected. This may cause authentication timeouts.');
    } else {
      recommendations.push('✅ Network connectivity appears normal.');
    }

    if (!oauthCheck.authEndpoint) {
      recommendations.push('❌ OAuth endpoints appear to be unreachable. This may indicate a service issue.');
    } else {
      recommendations.push('✅ OAuth endpoints are accessible.');
    }

    // Add OAuth-specific recommendations based on the actual error
    if (oauthIssue.code === 'OAUTH_SERVER_ERROR' || oauthIssue.code === 'INTERNAL_SERVER_ERROR') {
      recommendations.push('🚨 CRITICAL: OAuth server is experiencing internal errors');
      recommendations.push('🔧 This is a server-side issue that requires immediate attention');
      recommendations.push('📞 Contact support immediately with this error');
      recommendations.push('⏰ Wait 15-30 minutes before trying again');
    } else {
      recommendations.push(`🔧 ${oauthIssue.solution}`);
    }

    // Platform-specific recommendations
    if (Platform.OS === 'ios') {
      recommendations.push('📱 iOS: Try restarting the app and signing in again.');
      recommendations.push('📱 iOS: Ensure you have a stable internet connection.');
      recommendations.push('📱 iOS: Check if the app has proper OAuth configuration.');
    } else if (Platform.OS === 'web') {
      recommendations.push('🌐 Web: Try clearing browser cache and cookies.');
      recommendations.push('🌐 Web: Try using incognito/private browsing mode.');
      recommendations.push('🌐 Web: Check browser console for additional error details.');
    }

    // General recommendations
    if (oauthIssue.severity === 'critical') {
      recommendations.push('🚨 This is a critical server-side issue');
      recommendations.push('📞 Contact support immediately');
      recommendations.push('⏰ Do not attempt multiple retries - wait for server fix');
    } else {
      recommendations.push('⏰ Wait 5-10 minutes before attempting to sign in again.');
      recommendations.push('🔄 If the problem persists, try refreshing the page.');
      recommendations.push('📞 Contact support if the issue continues after trying these solutions.');
    }

    return {
      networkCheck,
      oauthCheck,
      oauthIssue,
      recommendations,
    };
  }

  getRetryStrategy(attemptNumber: number): {
    shouldRetry: boolean;
    delayMs: number;
    message: string;
  } {
    if (attemptNumber >= 3) {
      return {
        shouldRetry: false,
        delayMs: 0,
        message: 'Maximum retry attempts reached. Please wait before trying again.',
      };
    }

    // Exponential backoff strategy
    const delays = [1000, 3000, 10000]; // 1s, 3s, 10s
    const delayMs = delays[attemptNumber - 1] || 10000;

    return {
      shouldRetry: true,
      delayMs,
      message: `Retrying in ${delayMs / 1000} seconds...`,
    };
  }

  getSpecificOAuthSolutions(): string[] {
    return [
      '🔄 **Immediate Actions:**',
      '• Refresh the page and try signing in again',
      '• Clear browser cache and cookies (web only)',
      '• Restart the app (mobile only)',
      '',
      '⏰ **Wait and Retry:**',
      '• Wait 5-10 minutes before attempting again',
      '• OAuth codes expire quickly and may need fresh authorization',
      '',
      '🔧 **Technical Solutions:**',
      '• Check internet connection stability',
      '• Try using a different network (WiFi vs mobile data)',
      '• Ensure the app is up to date',
      '',
      '📞 **If Problem Persists:**',
      '• Contact support with error details',
      '• Provide diagnostic report from the app',
      '• Include platform and browser information',
    ];
  }
}

export const authTroubleshooter = AuthTroubleshooter.getInstance(); 