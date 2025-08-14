/**
 * React DevTools for the Salahor event streaming library
 * 
 * @packageDocumentation
 */

export * from './SalahorDevTools';

export { useTrackedStream } from './SalahorDevTools';

export type { DevToolsProps } from './SalahorDevTools';

// Re-export core types for convenience
export type { EventStream } from '@salahor/core';

// Initialize the dev tools when this module is imported
import './initializeDevTools';

// Default export for easier usage with React.lazy
import { SalahorDevTools } from './SalahorDevTools';
export default SalahorDevTools;
