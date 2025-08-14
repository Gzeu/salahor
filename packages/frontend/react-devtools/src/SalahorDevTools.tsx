import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EventStream } from '@salahor/core';
import type { 
  StreamInfo, 
  SalahorDevToolsAPI 
} from './types';

type DevToolsProps = {
  /**
   * Whether the dev tools are open by default
   * @default false
   */
  defaultOpen?: boolean;
  
  /**
   * Position of the dev tools panel
   * @default 'right'
   */
  position?: 'left' | 'right' | 'top' | 'bottom';
  
  /**
   * Custom styles for the dev tools panel
   */
  panelStyle?: React.CSSProperties;
  
  /**
   * Custom styles for the toggle button
   */
  buttonStyle?: React.CSSProperties;
  
  /**
   * Custom class name for the dev tools panel
   */
  panelClassName?: string;
  
  /**
   * Custom class name for the toggle button
   */
  buttonClassName?: string;
  
  /**
   * Children elements to render inside the dev tools panel
   */
  children?: React.ReactNode;
};

// Extend the global Window interface with our dev tools API
declare global {
  interface Window {
    __SALAHOR_DEVTOOLS__?: SalahorDevToolsAPI;
  }
}

// Initialize the global dev tools state
function initializeDevTools() {
  if (typeof window === 'undefined') return;
  
  if (!window.__SALAHOR_DEVTOOLS__) {
    const streams = new Map<string, StreamInfo>();
    const subscribers = new Set<(streams: Map<string, StreamInfo>) => void>();
    
    const devTools = {
      streams,
      subscribers,
      
      addStream(id: string, name: string, stream: EventStream<any>) {
        if (streams.has(id)) return;
        
        const streamInfo: StreamInfo = {
          id,
          name,
          value: undefined,
          lastUpdated: Date.now(),
          subscriberCount: 0,
          isPaused: false,
        };
        
        // Track the original subscribe method
        const originalSubscribe = stream.subscribe;
        
        // Track subscribers
        stream.subscribe = (listener: (value: any) => void) => {
          streamInfo.subscriberCount++;
          this.updateStream(id, { subscriberCount: streamInfo.subscriberCount });
          
          const unsubscribe = originalSubscribe.call(stream, (value: any) => {
            if (!streamInfo.isPaused) {
              return listener(value);
            }
          });
          
          // Return a wrapped unsubscribe function
          return () => {
            streamInfo.subscriberCount = Math.max(0, streamInfo.subscriberCount - 1);
            this.updateStream(id, { subscriberCount: streamInfo.subscriberCount });
            return unsubscribe();
          };
        };
        
        streams.set(id, streamInfo);
        this.notifySubscribers();
      },
      
      removeStream(id: string) {
        if (streams.delete(id)) {
          this.notifySubscribers();
        }
      },
      
      updateStream(id: string, updates: Partial<StreamInfo>) {
        const stream = streams.get(id);
        if (!stream) return;
        
        Object.assign(stream, { ...updates, lastUpdated: Date.now() });
        this.notifySubscribers();
      },
      
      subscribe(callback: (streams: Map<string, StreamInfo>) => void) {
        subscribers.add(callback);
        callback(new Map(streams));
        
        return () => {
          subscribers.delete(callback);
        };
      },
      
      notifySubscribers() {
        const snapshot = new Map(streams);
        subscribers.forEach(callback => callback(snapshot));
      },
    };
    
    window.__SALAHOR_DEVTOOLS__ = devTools;
  }
  
  return window.__SALAHOR_DEVTOOLS__;
}

// Hook to track a stream in the dev tools
export function useTrackedStream<T>(
  stream: EventStream<T> | null | undefined,
  name: string
) {
  const idRef = useRef<string>();
  const devTools = typeof window !== 'undefined' ? window.__SALAHOR_DEVTOOLS__ : null;
  
  useEffect(() => {
    if (!devTools || !stream) return;
    
    // Generate a stable ID for this stream
    const id = idRef.current || `stream-${Math.random().toString(36).substr(2, 9)}`;
    idRef.current = id;
    
    // Add the stream to the dev tools
    devTools.addStream(id, name, stream);
    
    // Set up a subscription to track values
    const unsubscribe = stream.subscribe((value: any) => {
      devTools.updateStream(id, { value });
    });
    
    return () => {
      unsubscribe();
      devTools.removeStream(id);
    };
  }, [devTools, stream, name]);
  
  // Return a function to update the stream's name
  const updateName = useCallback((newName: string) => {
    if (devTools && idRef.current) {
      devTools.updateStream(idRef.current, { name: newName });
    }
  }, [devTools]);
  
  return { updateName };
}

// Main DevTools component
export function SalahorDevTools({
  defaultOpen = false,
  position = 'right',
  panelStyle = {},
  buttonStyle = {},
  panelClassName = '',
  buttonClassName = '',
}: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [streams, setStreams] = useState<Map<string, StreamInfo>>(new Map());
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light'
  );
  
  // Toggle dev tools panel
  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  // Toggle pause updates
  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const newPaused = !prev;
      
      // Update all streams
      streams.forEach((_, id) => {
        if (window.__SALAHOR_DEVTOOLS__) {
          window.__SALAHOR_DEVTOOLS__.updateStream(id, { isPaused: newPaused });
        }
      });
      
      return newPaused;
    });
  }, [streams]);
  
  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);
  
  // Subscribe to stream updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize dev tools if needed
    const devTools = initializeDevTools();
    if (!devTools) return;
    
    // Subscribe to stream updates
    const unsubscribe = devTools.subscribe((updatedStreams) => {
      setStreams(new Map(updatedStreams));
    });
    
    // Clean up
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Toggle stream selection
  const toggleStreamSelection = useCallback((id: string) => {
    setSelectedStream(prev => (prev === id ? null : id));
  }, []);
  
  // Filter streams by search term
  const filteredStreams = Array.from(streams.entries()).filter(([_, stream]) => {
    return (
      stream.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(stream.value).toLowerCase().includes(searchTerm.toLowerCase()) ||
      stream.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Get the currently selected stream
  const currentStream = selectedStream ? streams.get(selectedStream) : null;
  
  // Format value for display
  const formatValue = (value: any): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    
    try {
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    } catch (error) {
      return '[Unserializable value]';
    }
  };
  
  // Panel position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    right: { right: 0, top: 0, bottom: 0, width: '350px' },
    left: { left: 0, top: 0, bottom: 0, width: '350px' },
    top: { top: 0, left: 0, right: 0, height: '300px' },
    bottom: { bottom: 0, left: 0, right: 0, height: '300px' },
  };
  
  // Theme styles
  const themeStyles = {
    light: {
      background: '#ffffff',
      text: '#333333',
      border: '#e0e0e0',
      hover: '#f5f5f5',
      selected: '#e3f2fd',
      button: '#f0f0f0',
      buttonHover: '#e0e0e0',
    },
    dark: {
      background: '#1e1e1e',
      text: '#e0e0e0',
      border: '#444444',
      hover: '#2d2d2d',
      selected: '#0d47a1',
      button: '#333333',
      buttonHover: '#444444',
    },
  };
  
  const currentTheme = themeStyles[theme];
  
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={togglePanel}
        style={{
          position: 'fixed',
          [position]: '20px',
          bottom: position === 'bottom' ? 'calc(300px + 20px)' : '20px',
          zIndex: 9998,
          padding: '8px 12px',
          borderRadius: '4px',
          border: 'none',
          background: currentTheme.button,
          color: currentTheme.text,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          ...buttonStyle,
        }}
        className={`salahor-devtools-toggle ${buttonClassName}`}
        aria-label={isOpen ? 'Close Salahor DevTools' : 'Open Salahor DevTools'}
      >
        <span style={{ fontSize: '16px' }}>🔌</span>
        <span>Salahor</span>
      </button>
      
      {/* DevTools Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            zIndex: 9997,
            background: currentTheme.background,
            color: currentTheme.text,
            boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...positionStyles[position],
            ...panelStyle,
          }}
          className={`salahor-devtools-panel ${panelClassName}`}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px',
              borderBottom: `1px solid ${currentTheme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: currentTheme.background,
            }}
          >
            <div style={{ fontWeight: 'bold' }}>Salahor DevTools</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={togglePause}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTheme.text,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
                title={isPaused ? 'Resume updates' : 'Pause updates'}
              >
                {isPaused ? '▶️' : '⏸️'}
              </button>
              <button
                onClick={toggleTheme}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTheme.text,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={togglePanel}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTheme.text,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div style={{ padding: '10px', borderBottom: `1px solid ${currentTheme.border}` }}>
            <input
              type="text"
              placeholder="Search streams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '4px',
                border: `1px solid ${currentTheme.border}`,
                background: currentTheme.background,
                color: currentTheme.text,
              }}
            />
          </div>
          
          {/* Main Content */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Stream List */}
            <div
              style={{
                width: '150px',
                borderRight: `1px solid ${currentTheme.border}`,
                overflowY: 'auto',
                background: currentTheme.background,
              }}
            >
              {filteredStreams.length === 0 ? (
                <div style={{ padding: '10px', color: '#999', fontStyle: 'italic' }}>
                  No streams found
                </div>
              ) : (
                filteredStreams.map(([id, stream]) => (
                  <div
                    key={id}
                    onClick={() => toggleStreamSelection(id)}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${currentTheme.border}`,
                      background: selectedStream === id ? currentTheme.selected : 'transparent',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      position: 'relative',
                    }}
                    title={`${stream.name} (${stream.subscriberCount} subscribers)`}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{stream.name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>
                      {stream.subscriberCount} {stream.subscriberCount === 1 ? 'sub' : 'subs'}
                    </div>
                    {stream.isPaused && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          fontSize: '10px',
                          background: '#ff9800',
                          color: 'white',
                          borderRadius: '3px',
                          padding: '1px 3px',
                        }}
                      >
                        Paused
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Stream Details */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
              {currentStream ? (
                <div>
                  <div style={{ marginBottom: '15px' }}>
                    <h3 style={{ margin: '0 0 5px 0' }}>{currentStream.name}</h3>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                      ID: {currentStream.id} • {currentStream.subscriberCount} {currentStream.subscriberCount === 1 ? 'subscriber' : 'subscribers'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                      Last updated: {new Date(currentStream.lastUpdated).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Current Value:</div>
                    <pre
                      style={{
                        background: theme === 'light' ? '#f5f5f5' : '#2d2d2d',
                        padding: '10px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '200px',
                        margin: 0,
                        fontSize: '13px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {formatValue(currentStream.value)}
                    </pre>
                  </div>
                  
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Actions:</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          if (window.__SALAHOR_DEVTOOLS__) {
                            window.__SALAHOR_DEVTOOLS__.updateStream(currentStream.id, { 
                              isPaused: !currentStream.isPaused 
                            });
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          background: currentTheme.button,
                          color: currentTheme.text,
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        {currentStream.isPaused ? 'Resume' : 'Pause'} Updates
                      </button>
                      <button
                        onClick={() => {
                          try {
                            const value = JSON.parse(prompt('Enter new value (valid JSON):', '') || '');
                            if (window.__SALAHOR_DEVTOOLS__) {
                              window.__SALAHOR_DEVTOOLS__.updateStream(currentStream.id, { 
                                value,
                                lastUpdated: Date.now(),
                              });
                            }
                          } catch (error) {
                            alert('Invalid JSON');
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          background: currentTheme.button,
                          color: currentTheme.text,
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Emit New Value
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#999', textAlign: 'center', marginTop: '20px' }}>
                  Select a stream to inspect
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Higher-order component for easier usage
export function withSalahorDevTools<P extends JSX.IntrinsicAttributes>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<DevToolsProps, 'children'> = {}
) {
  return function WithSalahorDevTools(props: P) {
    return (
      <>
        <WrappedComponent {...props} />
        <SalahorDevTools {...options} />
      </>
    );
  };
}

// Initialize the dev tools when this module is imported
if (typeof window !== 'undefined') {
  initializeDevTools();
}
