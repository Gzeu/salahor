/**
 * Environment detection utilities
 */
/**
 * Check if the code is running in a development environment
 * @returns boolean indicating if in development
 */
export function isDevelopment() {
    return (process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'dev' ||
        process.env.NODE_ENV === 'test' ||
        (typeof __DEV__ !== 'undefined' && __DEV__) ||
        (typeof process !== 'undefined' &&
            typeof process.execPath === 'string' &&
            process.execPath.includes('node_modules/.bin/jest')));
}
/**
 * Check if the code is running in a production environment
 * @returns boolean indicating if in production
 */
export function isProduction() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
}
let _isTestEnvironment = null;
/**
 * Check if the code is running in a test environment
 * @returns boolean indicating if in test environment
 */
export function isTest() {
    // Cache the result to avoid repeated checks
    if (_isTestEnvironment !== null) {
        return _isTestEnvironment;
    }
    // Check if we're running in a test environment
    _isTestEnvironment = (
    // Check for test runner environment variables
    process.env.VITEST_WORKER_ID !== undefined ||
        process.env.JEST_WORKER_ID !== undefined ||
        // Check NODE_ENV
        process.env.NODE_ENV === 'test' ||
        // Check if we're running in a test file
        (typeof process !== 'undefined' &&
            typeof process.execPath === 'string' &&
            (process.execPath.includes('node_modules/.bin/jest') ||
                process.execPath.includes('node_modules/.bin/vitest') ||
                process.execPath.includes('node_modules/jest/') ||
                process.execPath.includes('node_modules/vitest/'))));
    return _isTestEnvironment;
}
/**
 * Development-only logger that only logs in non-production environments
 */
/**
 * Development logger that shows messages only in non-production environments
 * or when DEBUG environment variable is set
 */
export const devLogger = {
    log: (...args) => {
        if (!isProduction()) {
            console.log('[DEV]', ...args);
        }
    },
    warn: (...args) => {
        if (!isProduction()) {
            console.warn('[DEV]', ...args);
        }
    },
    error: (...args) => {
        // Always show errors, even in production
        console.error('[DEV]', ...args);
    },
    debug: (...args) => {
        // Log debug messages in development or when DEBUG is set
        if (!isProduction() || process.env.DEBUG) {
            console.debug('[DEBUG]', ...args);
        }
    }
};
//# sourceMappingURL=env-utils.js.map