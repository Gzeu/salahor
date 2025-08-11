/**
 * Type definitions for Worker RPC utility
 * @module workers/workerRPC
 */

declare type WorkerPool = import('./WorkerPool').default;

declare interface WorkerRPCOptions {
  minWorkers?: number;
  maxWorkers?: number;
  idleTimeout?: number;
  timeout?: number;
  workerOptions?: Record<string, unknown>;
}

declare type RPCMethod = (...args: any[]) => Promise<any>;
declare type RPCMethods = Record<string, RPCMethod | RPCMethods>;

declare interface WorkerRPC {
  /**
   * Call an RPC method
   * @param method - Method name (can be dot-separated for nested methods)
   * @param params - Method parameters
   */
  call(method: string, ...params: any[]): Promise<any>;
  
  /**
   * Terminate the RPC interface and clean up resources
   */
  terminate(): Promise<void>;
  
  /**
   * Access methods as properties (e.g., rpc.calculate.add(1, 2))
   */
  [key: string]: any;
}

/**
 * Create a Worker RPC interface
 * @param workerScript - Worker script or function
 * @param options - RPC options
 */
declare function createWorkerRPC(
  workerScript: string | Function,
  options?: WorkerRPCOptions
): WorkerRPC;

/**
 * Create an RPC handler for a worker
 * @param methods - Object containing method implementations
 * @returns Worker script as a string
 */
declare function createRPCHandler(methods: RPCMethods): string;

export {
  createWorkerRPC,
  createRPCHandler,
  WorkerRPC,
  WorkerRPCOptions,
  RPCMethod,
  RPCMethods
};

export default {
  createWorkerRPC,
  createRPCHandler
};
