import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { EventStream } from '@salahor/core';

/**
 * Type for the stream context value
 */
type StreamContextValue = Map<string, EventStream<unknown>>;

/**
 * Context for managing event streams
 */
const StreamContext = createContext<StreamContextValue | undefined>(undefined);

/**
 * Props for the StreamProvider component
 */
export interface StreamProviderProps {
  /**
   * Initial streams to provide to the context
   */
  streams?: Record<string, EventStream<unknown>>;
  
  /**
   * Child components
   */
  children: ReactNode;
}

/**
 * Provider component that makes event streams available to child components
 * 
 * @example
 * ```tsx
 * const userStream = createEventStream<User>();
 * 
 * function App() {
 *   return (
 *     <StreamProvider streams={{ userStream }}>
 *       <UserProfile />
 *     </StreamProvider>
 *   );
 * }
 * ```
 */
export function StreamProvider({ streams = {}, children }: StreamProviderProps) {
  // Create a stable context value that won't change on re-renders
  const contextValue = useMemo(() => {
    const streamMap = new Map<string, EventStream<unknown>>();
    
    // Add initial streams to the map
    Object.entries(streams).forEach(([key, stream]) => {
      if (stream) {
        streamMap.set(key, stream);
      }
    });
    
    return streamMap;
  }, []); // Empty deps array means this only runs once on mount
  
  return (
    <StreamContext.Provider value={contextValue}>
      {children}
    </StreamContext.Provider>
  );
}

/**
 * Hook to access the stream context
 * 
 * @returns The stream context value
 * @throws Error if used outside of a StreamProvider
 */
function useStreamContext() {
  const context = useContext(StreamContext);
  
  if (context === undefined) {
    throw new Error('useStreamContext must be used within a StreamProvider');
  }
  
  return context;
}

/**
 * Hook to get a stream from the context by key
 * 
 * @param key The key of the stream to get
 * @returns The stream with the specified key, or undefined if not found
 * 
 * @example
 * ```tsx
 * function UserProfile() {
 *   const userStream = useStream('userStream') as EventStream<User>;
 *   const user = useEventStream(userStream);
 *   
 *   if (!user) return <div>Loading...</div>;
 *   
 *   return (
 *     <div>
 *       <h1>{user.name}</h1>
 *       <p>Email: {user.email}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStream<T = unknown>(key: string): EventStream<T> | undefined {
  const context = useStreamContext();
  return context.get(key) as EventStream<T> | undefined;
}

/**
 * Hook to get multiple streams from the context by keys
 * 
 * @param keys Array of stream keys to get
 * @returns An object mapping stream keys to their corresponding streams
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { userStream, notificationsStream } = useStreams(['userStream', 'notificationsStream']);
 *   const user = useEventStream(userStream);
 *   const notifications = useEventStream(notificationsStream);
 *   
 *   // ...
 * }
 * ```
 */
export function useStreams<T extends string>(
  keys: T[]
): { [K in T]: EventStream<unknown> | undefined } {
  const context = useStreamContext();
  
  return useMemo(() => {
    return keys.reduce((acc, key) => {
      acc[key] = context.get(key);
      return acc;
    }, {} as { [K in T]: EventStream<unknown> | undefined });
  }, [context, keys]);
}

/**
 * Hook to add a stream to the context
 * 
 * @param key The key to associate with the stream
 * @param stream The stream to add
 * @param deps Dependencies that should trigger the stream to be updated
 * 
 * @example
 * ```tsx
 * function UserProfile({ userId }) {
 *   const userStream = useEventStreamFactory(() => {
 *     const stream = createEventStream<User>();
 *     fetchUser(userId).then(user => stream.emit(user));
 *     return stream;
 *   }, [userId]);
 *   
 *   useAddStream('userStream', userStream, [userId]);
 *   
 *   // ...
 * }
 */
export function useAddStream<T>(
  key: string,
  stream: EventStream<T> | null | undefined,
  deps: React.DependencyList = []
) {
  const context = useStreamContext();
  
  useEffect(() => {
    if (!stream) return;
    
    // Add the stream to the context
    context.set(key, stream as EventStream<unknown>);
    
    // Clean up by removing the stream when the component unmounts or deps change
    return () => {
      if (context.get(key) === stream) {
        context.delete(key);
      }
    };
  }, [context, key, stream, ...deps]);
}

/**
 * Component that provides a stream to its children
 * 
 * @example
 * ```tsx
 * function UserProfile({ userId }) {
 *   return (
 *     <WithStream 
 *       name="userStream" 
 *       createStream={() => {
 *         const stream = createEventStream<User>();
 *         fetchUser(userId).then(user => stream.emit(user));
 *         return stream;
 *       }}
 *       deps={[userId]}
 *     >
 *       <UserDetails />
 *     </WithStream>
 *   );
 * }
 * 
 * function UserDetails() {
 *   const userStream = useStream('userStream') as EventStream<User>;
 *   const user = useEventStream(userStream);
 *   
 *   // ...
 * }
 */
export function WithStream<T>({
  name,
  createStream,
  deps = [],
  children,
}: {
  name: string;
  createStream: () => EventStream<T>;
  deps?: React.DependencyList;
  children: ReactNode;
}) {
  const stream = useMemo(createStream, deps);
  useAddStream(name, stream, deps);
  
  return <>{children}</>;
}
