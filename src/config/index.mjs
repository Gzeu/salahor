/**
 * Configuration module for uniconnect
 * Handles environment variables and configuration with zero dependencies
 * @module config
 */

/**
 * Merges multiple configuration objects with environment variables
 * @param {...Object} configs - Configuration objects to merge
 * @returns {Object} Merged configuration
 */
function mergeConfigs(...configs) {
  const result = {};
  
  for (const config of configs) {
    if (!config) continue;
    
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    }
  }
  
  return result;
}

/**
 * Gets the configuration from environment variables and overrides
 * @param {Object} [overrides={}] - Configuration overrides
 * @returns {Object} Configuration object
 */
export function getConfig(overrides = {}) {
  // Default configuration
  const defaults = {
    // Worker settings
    useWorker: true,
    workerPath: undefined,
    workerOptions: {},
    
    // HTTP settings
    httpTimeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    
    // Logging
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  };
  
  // Environment variable overrides
  const envVars = {
    useWorker: process.env.UNICONNECT_USE_WORKER !== 'false',
    workerPath: process.env.UNICONNECT_WORKER_PATH,
    httpTimeout: process.env.UNICONNECT_HTTP_TIMEOUT 
      ? parseInt(process.env.UNICONNECT_HTTP_TIMEOUT, 10) 
      : undefined,
    maxRetries: process.env.UNICONNECT_MAX_RETRIES
      ? parseInt(process.env.UNICONNECT_MAX_RETRIES, 10)
      : undefined,
    retryDelay: process.env.UNICONNECT_RETRY_DELAY
      ? parseInt(process.env.UNICONNECT_RETRY_DELAY, 10)
      : undefined,
    logLevel: process.env.UNICONNECT_LOG_LEVEL,
  };
  
  // Merge all configurations with overrides taking precedence
  const config = mergeConfigs(
    defaults,
    envVars,
    overrides
  );
  
  // Post-processing
  if (config.workerPath) {
    config.workerPath = String(config.workerPath);
  }
  
  return Object.freeze({
    ...config,
    // Ensure worker options is always an object
    workerOptions: {
      ...(defaults.workerOptions || {}),
      ...(envVars.workerOptions || {}),
      ...(overrides.workerOptions || {}),
    },
  });
}

/**
 * Validates the configuration
 * @param {Object} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(config) {
  if (config.useWorker && !config.workerPath) {
    throw new Error('workerPath is required when useWorker is true');
  }
  
  if (config.httpTimeout < 0) {
    throw new Error('httpTimeout must be a positive number');
  }
  
  if (config.maxRetries < 0) {
    throw new Error('maxRetries must be a non-negative number');
  }
  
  if (config.retryDelay < 0) {
    throw new Error('retryDelay must be a non-negative number');
  }
  
  const validLogLevels = ['error', 'warn', 'info', 'debug', 'trace'];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error(`logLevel must be one of: ${validLogLevels.join(', ')}`);
  }
}

// Default export with the current configuration
export default getConfig();
