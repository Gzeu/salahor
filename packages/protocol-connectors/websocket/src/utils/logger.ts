// Check if we're in a browser or Node.js environment
declare const window: any;
declare const process: any;

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isNode = typeof process !== 'undefined' && 
               process.versions != null && 
               process.versions.node != null;

// Environment detection
export const isDev = (): boolean => {
  if (isNode) {
    return process.env.NODE_ENV === 'development' || 
           process.env.DEBUG === 'true' ||
           (typeof process.env.DEBUG === 'string' && process.env.DEBUG.includes('salahor:websocket'));
  }
  
  if (isBrowser) {
    try {
      return (
        window.localStorage?.getItem('DEBUG') === 'true' ||
        window.location.search.includes('debug=true') ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      );
    } catch (e) {
      return false;
    }
  }
  
  return false;
};

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
} as const;

type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// Default log level
let currentLogLevel: LogLevel = isDev() ? LogLevel.DEBUG : LogLevel.ERROR;

// ANSI color codes (for Node.js)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

// Browser console colors
const browserColors = {
  debug: '#888',
  info: '#03A9F4',
  warn: '#FFA000',
  error: '#F44336',
  log: '#4CAF50',
} as const;

// Format timestamp
const getTimestamp = (): string => {
  const now = new Date();
  const time = now.toISOString().substr(11, 12);
  return `[${time}]`;
};

// Format log message
const formatMessage = (level: string, message: string, ...args: any[]): string => {
  const timestamp = getTimestamp();
  const formattedArgs = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  return `${timestamp} [${level}] ${message} ${formattedArgs}`.trim();
};

// Browser logging
const browserLog = (level: 'log' | 'info' | 'warn' | 'error', message: string, ...args: any[]) => {
  const style = `color: ${browserColors[level]}; font-weight: bold`;
  const timestamp = getTimestamp();
  
  if (level === 'log') {
    console.log(`%c${timestamp} [${level.toUpperCase()}]`, style, message, ...args);
  } else if (level === 'info') {
    console.info(`%c${timestamp} [${level.toUpperCase()}]`, style, message, ...args);
  } else if (level === 'warn') {
    console.warn(`%c${timestamp} [${level.toUpperCase()}]`, style, message, ...args);
  } else if (level === 'error') {
    console.error(`%c${timestamp} [${level.toUpperCase()}]`, style, message, ...args);
  }
};

// Node.js logging
const nodeLog = (level: 'log' | 'info' | 'warn' | 'error', message: string, ...args: any[]) => {
  let color = '';
  let levelStr = level.toUpperCase();
  
  switch (level) {
    case 'debug':
      color = colors.cyan;
      break;
    case 'info':
      color = colors.blue;
      break;
    case 'warn':
      color = colors.yellow;
      levelStr = 'WARN';
      break;
    case 'error':
      color = colors.red;
      levelStr = 'ERROR';
      break;
    default:
      color = colors.green;
  }
  
  const formatted = formatMessage(levelStr, message, ...args);
  const output = `${color}${formatted}${colors.reset}`;
  
  if (level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
};

// Logger implementation
interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, error?: Error) => void;
  log: (message: string, ...args: any[]) => void;
  setLevel: (level: 'debug' | 'info' | 'warn' | 'error' | 'none') => void;
  getLevel: () => string;
}

const logger: Logger = {
  debug: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      if (isBrowser) {
        browserLog('log', `[DEBUG] ${message}`, ...args);
      } else if (isNode) {
        nodeLog('log', `[DEBUG] ${message}`, ...args);
      } else {
        console.log(formatMessage('DEBUG', message, ...args));
      }
    }
  },
  
  info: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.INFO) {
      if (isBrowser) {
        browserLog('info', message, ...args);
      } else if (isNode) {
        nodeLog('info', message, ...args);
      } else {
        console.info(formatMessage('INFO', message, ...args));
      }
    }
  },
  
  warn: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.WARN) {
      if (isBrowser) {
        browserLog('warn', message, ...args);
      } else if (isNode) {
        nodeLog('warn', message, ...args);
      } else {
        console.warn(formatMessage('WARN', message, ...args));
      }
    }
  },
  
  error: (message: string, error?: Error): void => {
    if (currentLogLevel <= LogLevel.ERROR) {
      if (isBrowser) {
        browserLog('error', message, error);
      } else if (isNode) {
        nodeLog('error', message, error);
      } else {
        console.error(formatMessage('ERROR', message, error));
      }
    }
  },
  
  log: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.INFO) {
      if (isBrowser) {
        browserLog('log', message, ...args);
      } else if (isNode) {
        nodeLog('log', message, ...args);
      } else {
        console.log(formatMessage('LOG', message, ...args));
      }
    }
  },
  
  setLevel: (level: 'debug' | 'info' | 'warn' | 'error' | 'none'): void => {
    switch (level) {
      case 'debug':
        currentLogLevel = LogLevel.DEBUG;
        break;
      case 'info':
        currentLogLevel = LogLevel.INFO;
        break;
      case 'warn':
        currentLogLevel = LogLevel.WARN;
        break;
      case 'error':
        currentLogLevel = LogLevel.ERROR;
        break;
      case 'none':
        currentLogLevel = LogLevel.NONE;
        break;
      default:
        currentLogLevel = LogLevel.INFO;
    }
  },
  
  getLevel: (): string => {
    switch (currentLogLevel) {
      case LogLevel.DEBUG: return 'debug';
      case LogLevel.INFO: return 'info';
      case LogLevel.WARN: return 'warn';
      case LogLevel.ERROR: return 'error';
      case LogLevel.NONE: return 'none';
      default: return 'info';
    }
  },
};

// For backward compatibility
export const devLogger = (message: string, ...args: any[]): void => {
  if (isDev()) {
    logger.debug(message, ...args);
  }
};

// Check if file exists (Node.js only)
export const fileExists = (path: string): boolean => {
  if (!isNode) return false;
  
  try {
    // Using require to avoid top-level await
    const fs = require('fs');
    return fs.existsSync(path);
  } catch (error) {
    return false;
  }
};

export { logger };
export type { Logger };

export default logger;
