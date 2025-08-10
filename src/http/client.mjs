/**
 * HTTP client for uniconnect
 * Provides a zero-dependency HTTP client with retry logic
 * @module http/client
 */

import { setTimeout } from 'node:timers/promises';

/**
 * Performs an HTTP request with retry logic
 * @param {string} url - The URL to request
 * @param {Object} [options] - Request options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.headers={}] - Request headers
 * @param {any} [options.body] - Request body
 * @param {number} [options.timeout=30000] - Request timeout in ms
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.retryDelay=1000] - Delay between retries in ms
 * @param {Function} [options.retryIf] - Function to determine if a retry should be attempted
 * @param {AbortSignal} [options.signal] - AbortSignal for cancelling the request
 * @returns {Promise<Response>} The response object
 */
export async function httpRequest(url, {
  method = 'GET',
  headers = {},
  body,
  timeout = 30000,
  maxRetries = 3,
  retryDelay = 1000,
  retryIf = defaultRetryCondition,
  signal,
} = {}) {
  let lastError;
  let attempt = 0;
  
  // Use the global fetch if available (Node.js 18+), otherwise fall back to https module
  const fetchImpl = globalThis.fetch || (await import('node:https')).request;
  
  while (attempt <= maxRetries) {
    // Create a new AbortController for each attempt
    const controller = new AbortController();
    const abort = () => controller.abort();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeout}ms`));
    }, timeout);
    
    // Set up abort signal
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException('The user aborted a request.', 'AbortError');
      }
      signal.addEventListener('abort', abort, { once: true });
    }
    
    try {
      const response = await fetchImpl(url, {
        method,
        headers: {
          'user-agent': 'uniconnect/1.0',
          'accept': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      
      // Clear timeout and cleanup
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', abort);
      
      // Check if we should retry
      if (attempt < maxRetries && await retryIf(response, lastError)) {
        const delay = calculateBackoff(attempt, retryDelay);
        await setTimeout(delay);
        attempt++;
        continue;
      }
      
      return response;
      
    } catch (error) {
      // Clear timeout and cleanup
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', abort);
      
      lastError = error;
      
      // Don't retry if aborted or not a network error
      if (error.name === 'AbortError' || attempt >= maxRetries) {
        throw error;
      }
      
      // Calculate backoff and wait
      const delay = calculateBackoff(attempt, retryDelay);
      await setTimeout(delay);
      attempt++;
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error('Request failed');
}

/**
 * Default retry condition
 * @private
 */
async function defaultRetryCondition(response, error) {
  // Retry on network errors or 5xx server errors
  if (error) return true;
  return response.status >= 500;
}

/**
 * Calculates exponential backoff with jitter
 * @private
 */
function calculateBackoff(attempt, baseDelay) {
  const backoff = Math.min(1000 * 2 ** attempt, 30000); // Cap at 30s
  const jitter = Math.random() * baseDelay;
  return Math.min(backoff + jitter, 60000); // Absolute max 60s
}

/**
 * Performs a GET request
 * @param {string} url - The URL to request
 * @param {Object} [options] - Request options
 * @returns {Promise<Response>} The response object
 */
export function get(url, options = {}) {
  return httpRequest(url, { ...options, method: 'GET' });
}

/**
 * Performs a POST request
 * @param {string} url - The URL to request
 * @param {Object} [data] - Request data
 * @param {Object} [options] - Request options
 * @returns {Promise<Response>} The response object
 */
export function post(url, data, options = {}) {
  return httpRequest(url, {
    ...options,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
    body: data,
  });
}

/**
 * Performs a PUT request
 * @param {string} url - The URL to request
 * @param {Object} [data] - Request data
 * @param {Object} [options] - Request options
 * @returns {Promise<Response>} The response object
 */
export function put(url, data, options = {}) {
  return httpRequest(url, {
    ...options,
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
    body: data,
  });
}

/**
 * Performs a DELETE request
 * @param {string} url - The URL to request
 * @param {Object} [options] - Request options
 * @returns {Promise<Response>} The response object
 */
export function del(url, options = {}) {
  return httpRequest(url, { ...options, method: 'DELETE' });
}

export default {
  request: httpRequest,
  get,
  post,
  put,
  delete: del,
};
