import { Platform } from 'react-native';

export interface OAuthConfigIssue {
  type: 'network' | 'configuration' | 'service' | 'redirect' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  solution: string;
  code?: string;
}

export class OAuthConfigChecker {
  private static instance: OAuthConfigChecker;

  static getInstance(): OAuthConfigChecker {
    if (!OAuthConfigChecker.instance) {
      OAuthConfigChecker.instance = new OAuthConfigChecker();
    }
    return OAuthConfigChecker.instance;
  }

  async checkOAuthConfiguration(): Promise<{
    issues: OAuthConfigIssue[];
    summary: string;
    recommendations: string[];
  }> {
    console.log('🔍 Checking OAuth configuration...');
    
    const issues: OAuthConfigIssue[] = [];
    const recommendations: string[] = [];

    // Check 1: Network connectivity to OAuth endpoints
    const networkIssue = await this.checkNetworkConnectivity();
    if (networkIssue) {
      issues.push(networkIssue);
    }

    // Check 2: OAuth service availability
    const serviceIssue = await this.checkOAuthServiceAvailability();
    if (serviceIssue) {
      issues.push(serviceIssue);
    }

    // Check 3: Platform-specific configuration
    const platformIssue = this.checkPlatformConfiguration();
    if (platformIssue) {
      issues.push(platformIssue);
    }

    // Check 4: Project configuration
    const projectIssue = this.checkProjectConfiguration();
    if (projectIssue) {
      issues.push(projectIssue);
    }

    // Generate recommendations based on issues found
    if (issues.length === 0) {
      recommendations.push('✅ OAuth configuration appears correct');
      recommendations.push('🔄 Try refreshing the page and signing in again');
      recommendations.push('⏰ Wait 5-10 minutes before retrying');
    } else {
      issues.forEach(issue => {
        recommendations.push(`🔧 ${issue.solution}`);
      });
    }

    // Add general recommendations
    recommendations.push('📱 iOS: Try restarting the app');
    recommendations.push('🌐 Web: Clear browser cache and cookies');
    recommendations.push('🔗 Check your internet connection');

    const summary = this.generateSummary(issues);

    return {
      issues,
      summary,
      recommendations,
    };
  }

  private async checkNetworkConnectivity(): Promise<OAuthConfigIssue | null> {
    try {
      const startTime = Date.now();
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (!response.ok) {
        return {
          type: 'network',
          severity: 'high',
          description: 'Network connectivity issues detected',
          solution: 'Check your internet connection and try again',
          code: 'NETWORK_ERROR',
        };
      }

      if (latency > 5000) {
        return {
          type: 'network',
          severity: 'medium',
          description: 'Slow network connection detected',
          solution: 'Try using a faster internet connection',
          code: 'SLOW_NETWORK',
        };
      }

      return null;
    } catch (error) {
      return {
        type: 'network',
        severity: 'critical',
        description: 'No internet connection available',
        solution: 'Connect to the internet and try again',
        code: 'NO_CONNECTION',
      };
    }
  }

  private async checkOAuthServiceAvailability(): Promise<OAuthConfigIssue | null> {
    const oauthEndpoints = [
      'https://project-83364bf5.dev.kiki.dev',
      'https://kiki.dev',
    ];

    for (const endpoint of oauthEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (response.ok) {
          return null; // At least one endpoint is working
        }
      } catch (error) {
        console.log(`🔍 OAuth endpoint ${endpoint} not accessible:`, error);
      }
    }

    return {
      type: 'service',
      severity: 'critical',
      description: 'OAuth service endpoints are unreachable',
      solution: 'The authentication service may be down. Try again later.',
      code: 'OAUTH_SERVICE_DOWN',
    };
  }

  private checkPlatformConfiguration(): OAuthConfigIssue | null {
    if (Platform.OS === 'ios') {
      // Check iOS-specific configuration
      return {
        type: 'configuration',
        severity: 'medium',
        description: 'iOS platform may require additional configuration',
        solution: 'Ensure the app is properly configured for iOS OAuth flow',
        code: 'IOS_CONFIG',
      };
    } else if (Platform.OS === 'web') {
      // Check web-specific configuration
      return {
        type: 'configuration',
        severity: 'medium',
        description: 'Web platform may have redirect URI issues',
        solution: 'Check browser settings and clear cache/cookies',
        code: 'WEB_CONFIG',
      };
    }

    return null;
  }

  private checkProjectConfiguration(): OAuthConfigIssue | null {
    const projectId = 'ed2d765b-98bc-43ad-a0b0-05eb9e6bfed9';
    
    if (!projectId) {
      return {
        type: 'configuration',
        severity: 'critical',
        description: 'Missing project ID configuration',
        solution: 'Project ID is required for OAuth authentication',
        code: 'MISSING_PROJECT_ID',
      };
    }

    // Check if project ID format is valid
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(projectId)) {
      return {
        type: 'configuration',
        severity: 'high',
        description: 'Invalid project ID format',
        solution: 'Check project ID configuration',
        code: 'INVALID_PROJECT_ID',
      };
    }

    return null;
  }

  private generateSummary(issues: OAuthConfigIssue[]): string {
    if (issues.length === 0) {
      return '✅ OAuth configuration appears to be correct';
    }

    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    const highIssues = issues.filter(issue => issue.severity === 'high');
    const mediumIssues = issues.filter(issue => issue.severity === 'medium');

    let summary = `Found ${issues.length} configuration issue(s): `;
    
    if (criticalIssues.length > 0) {
      summary += `${criticalIssues.length} critical, `;
    }
    if (highIssues.length > 0) {
      summary += `${highIssues.length} high priority, `;
    }
    if (mediumIssues.length > 0) {
      summary += `${mediumIssues.length} medium priority`;
    }

    return summary;
  }

  getSpecificSolution(errorMessage: string): OAuthConfigIssue {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('failed to exchange code for token')) {
      return {
        type: 'service',
        severity: 'high',
        description: 'OAuth token exchange failed',
        solution: 'This is typically a temporary issue. Try refreshing and signing in again.',
        code: 'TOKEN_EXCHANGE_FAILED',
      };
    }
    
    if (message.includes('invalid_grant')) {
      return {
        type: 'configuration',
        severity: 'medium',
        description: 'Invalid OAuth grant',
        solution: 'The authorization code may have expired. Try signing in again.',
        code: 'INVALID_GRANT',
      };
    }
    
    if (message.includes('redirect_uri_mismatch')) {
      return {
        type: 'redirect',
        severity: 'high',
        description: 'Redirect URI mismatch',
        solution: 'OAuth redirect URI configuration issue. Contact support.',
        code: 'REDIRECT_URI_MISMATCH',
      };
    }

    return {
      type: 'unknown',
      severity: 'medium',
      description: 'Unknown OAuth error',
      solution: 'Try refreshing the page and signing in again',
      code: 'UNKNOWN_ERROR',
    };
  }
}

export const oauthConfigChecker = OAuthConfigChecker.getInstance(); 