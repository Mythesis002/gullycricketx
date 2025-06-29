import { Alert } from 'react-native';

// Global error handler for unhandled promise rejections and errors
const setupGlobalErrorHandler = () => {
  // Handle unhandled promise rejections
  const originalHandler = global.Promise.prototype.catch;
  global.Promise.prototype.catch = function(onRejected) {
    return originalHandler.call(this, (error) => {
      // Log the error but don't show alert for token refresh errors
      if (error?.message?.includes('Failed to refresh token')) {
        console.warn('Token refresh failed - this is expected during development:', error);
        return;
      }
      
      if (onRejected) {
        return onRejected(error);
      }
      throw error;
    });
  };

  // Handle uncaught errors
  const originalErrorHandler = global.ErrorUtils?.setGlobalHandler;
  if (originalErrorHandler) {
    originalErrorHandler((error, isFatal) => {
      // Don't show alerts for token refresh errors
      if (error?.message?.includes('Failed to refresh token')) {
        console.warn('Token refresh error (non-fatal):', error);
        return;
      }

      console.error('Global error:', error);
      
      if (isFatal) {
        Alert.alert(
          'Unexpected Error',
          'The app encountered an unexpected error. Please restart the app.',
          [{ text: 'OK' }]
        );
      }
    });
  }
};

// Initialize error handling
setupGlobalErrorHandler();

export default setupGlobalErrorHandler;