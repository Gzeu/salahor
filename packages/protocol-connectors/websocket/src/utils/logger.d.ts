import { Logger } from './logger';

export * from './logger';

declare const logger: Logger;

export { logger };

declare global {
  interface Window {
    logger: Logger;
  }
}
