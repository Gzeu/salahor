/**
 * Environment detection utilities
 */
/**
 * Check if the code is running in a development environment
 * @returns boolean indicating if in development
 */
export declare function isDevelopment(): boolean;
/**
 * Check if the code is running in a production environment
 * @returns boolean indicating if in production
 */
export declare function isProduction(): boolean;
/**
 * Check if the code is running in a test environment
 * @returns boolean indicating if in test environment
 */
export declare function isTest(): boolean;
/**
 * Development-only logger that only logs in non-production environments
 */
/**
 * Development logger that shows messages only in non-production environments
 * or when DEBUG environment variable is set
 */
export declare const devLogger: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
};
//# sourceMappingURL=env-utils.d.ts.map