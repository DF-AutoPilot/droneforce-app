/* eslint-disable @typescript-eslint/no-explicit-any */

// Set this to false to disable all logs
export const ENABLE_LOGS = true;

// Different log levels for different types of information
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  BLOCKCHAIN = 'BLOCKCHAIN'
}

// Colors for different log levels
const logColors = {
  [LogLevel.INFO]: 'color: #4CAF50',
  [LogLevel.WARN]: 'color: #FF9800',
  [LogLevel.ERROR]: 'color: #F44336',
  [LogLevel.DEBUG]: 'color: #2196F3',
  [LogLevel.BLOCKCHAIN]: 'color: #9C27B0'
};

/**
 * Log a message with a specific level
 * 
 * @param level The log level
 * @param message The main message to log
 * @param data Additional data to log (optional)
 */
export function log(level: LogLevel, message: string, data?: any): void {
  if (!ENABLE_LOGS) return;
  
  const timestamp = new Date().toISOString();
  const formattedLevel = `%c[${level}]`;
  
  if (data) {
    console.log(
      `${formattedLevel} ${timestamp} - ${message}:`, 
      logColors[level],
      data
    );
  } else {
    console.log(
      `${formattedLevel} ${timestamp} - ${message}`, 
      logColors[level]
    );
  }
}

// Convenience methods for different log levels
export const logInfo = (message: string, data?: any) => log(LogLevel.INFO, message, data);
export const logWarn = (message: string, data?: any) => log(LogLevel.WARN, message, data);
export const logError = (message: string, data?: any) => log(LogLevel.ERROR, message, data);
export const logDebug = (message: string, data?: any) => log(LogLevel.DEBUG, message, data);
export const logBlockchain = (message: string, data?: any) => log(LogLevel.BLOCKCHAIN, message, data);
