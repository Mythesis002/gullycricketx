import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { authDebugger, AuthDebugInfo } from '../utils/auth-debugger';

export default function DebugScreen() {
  const [debugLogs, setDebugLogs] = useState<AuthDebugInfo[]>([]);
  const [showAuthLogs, setShowAuthLogs] = useState(false);

  useEffect(() => {
    loadDebugLogs();
  }, []);

  const loadDebugLogs = () => {
    const logs = authDebugger.getLogs();
    setDebugLogs(logs);
  };

  const clearLogs = () => {
    Alert.alert(
      'Clear Debug Logs',
      'Are you sure you want to clear all debug logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            authDebugger.clearLogs();
            setDebugLogs([]);
          },
        },
      ]
    );
  };

  const shareDebugReport = async () => {
    try {
      const report = authDebugger.generateReport();
      await Share.share({
        message: report,
        title: 'GullyCricketX Debug Report',
      });
    } catch (error) {
      console.error('Error sharing debug report:', error);
    }
  };

  const getAuthStatusColor = () => {
    if (isLoading) return '#FFA500'; // Orange
    if (isSignedIn && user) return '#4CAF50'; // Green
    return '#F44336'; // Red
  };

  const getAuthStatusText = () => {
    if (isLoading) return 'Loading...';
    if (isSignedIn && user) return 'Authenticated';
    return 'Not Authenticated';
  };

  const renderAuthLog = (log: AuthDebugInfo, index: number) => {
    const analysis = authDebugger.analyzeAuthError(new Error(log.errorMessage));
    
    return (
      <View key={index} style={styles.logItem}>
        <View style={styles.logHeader}>
          <Text style={styles.logTimestamp}>
            {new Date(log.timestamp).toLocaleString()}
          </Text>
          <View style={[
            styles.severityBadge,
            { backgroundColor: analysis.severity === 'high' ? '#F44336' : 
                             analysis.severity === 'medium' ? '#FF9800' : '#4CAF50' }
          ]}>
            <Text style={styles.severityText}>{analysis.severity.toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.logType}>{log.errorType}</Text>
        <Text style={styles.logMessage}>{log.errorMessage}</Text>
        <Text style={styles.logCategory}>Category: {analysis.category}</Text>
        <Text style={styles.logSuggestion}>Suggestion: {analysis.suggestion}</Text>
        
        {log.context && (
          <Text style={styles.logContext}>
            Context: {JSON.stringify(log.context, null, 2)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <MaterialIcons name="bug-report" size={40} color="#FFD700" />
          <Text style={styles.title}>Debug Information</Text>
        </View>

        {/* Authentication Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Status</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: getAuthStatusColor() }]} />
            <Text style={styles.statusText}>{getAuthStatusText()}</Text>
          </View>
          
          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.userInfoText}>User ID: {user.id}</Text>
              <Text style={styles.userInfoText}>Email: {user.email}</Text>
              <Text style={styles.userInfoText}>Name: {user.name}</Text>
            </View>
          )}
        </View>

        {/* Authentication Debug Logs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Authentication Debug Logs</Text>
            <TouchableOpacity onPress={() => setShowAuthLogs(!showAuthLogs)}>
              <MaterialIcons 
                name={showAuthLogs ? "expand-less" : "expand-more"} 
                size={24} 
                color="#FFD700" 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.logCount}>
            {debugLogs.length} log entries
            </Text>
          
          {showAuthLogs && (
            <View style={styles.logsContainer}>
              {debugLogs.length === 0 ? (
                <Text style={styles.noLogsText}>No debug logs available</Text>
              ) : (
                debugLogs.map((log, index) => renderAuthLog(log, index))
              )}
            </View>
          )}
          </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={loadDebugLogs}>
            <MaterialIcons name="refresh" size={20} color="#1B5E20" />
            <Text style={styles.actionButtonText}>Refresh Logs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={shareDebugReport}>
            <MaterialIcons name="share" size={20} color="#1B5E20" />
            <Text style={styles.actionButtonText}>Share Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.clearButton]} 
            onPress={clearLogs}
          >
            <MaterialIcons name="clear" size={20} color="#F44336" />
            <Text style={[styles.actionButtonText, styles.clearButtonText]}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        {/* Troubleshooting Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting Tips</Text>
          <View style={styles.tipContainer}>
            <MaterialIcons name="lightbulb" size={20} color="#FFD700" />
            <Text style={styles.tipText}>
              If you're experiencing "Failed to exchange code for token" errors:
            </Text>
          </View>
          <Text style={styles.tipDetail}>
            • Try refreshing the page and signing in again{'\n'}
            • Check your internet connection{'\n'}
            • Clear browser cache and cookies{'\n'}
            • Try using a different browser or incognito mode{'\n'}
            • Wait a few minutes before retrying
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#E8F5E8',
    fontWeight: '500',
  },
  userInfo: {
    marginTop: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: '#E8F5E8',
    marginBottom: 4,
  },
  configText: {
    fontSize: 14,
    color: '#E8F5E8',
    marginBottom: 4,
  },
  logCount: {
    fontSize: 14,
    color: '#E8F5E8',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  logsContainer: {
    maxHeight: 300,
  },
  noLogsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  logItem: {
    backgroundColor: '#1B5E20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  logType: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    color: '#E8F5E8',
    marginBottom: 4,
  },
  logCategory: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 2,
  },
  logSuggestion: {
    fontSize: 12,
    color: '#FFD700',
    marginBottom: 4,
  },
  logContext: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 4,
  },
  clearButton: {
    backgroundColor: '#FFEBEE',
  },
  clearButtonText: {
    color: '#F44336',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#E8F5E8',
    marginLeft: 8,
    flex: 1,
  },
  tipDetail: {
    fontSize: 12,
    color: '#E8F5E8',
    lineHeight: 18,
    marginLeft: 28,
  },
});
