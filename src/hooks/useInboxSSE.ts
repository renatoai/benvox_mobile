import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getStorageItem } from '../utils/storage';

const API_BASE_URL = 'https://api.voxbel.com';
const CONNECTION_TIMEOUT = 10000;
const MAX_RETRIES = 5;
const BASE_DELAY = 2000;

export interface InboxEvent {
  type: 'new_message' | 'status_update' | 'message_updated' | 'conversation_updated';
  data: {
    id_message?: string;
    id_conversation: string;
    id_tenant: string;
    id_channel?: string;
    contact_name?: string;
    contact_phone?: string;
    last_message_text?: string;
    last_message_at?: string;
    unread_count?: number;
    status?: string;
    direction?: string;
    [key: string]: any;
  };
}

interface UseInboxSSEOptions {
  onNewMessage?: (event: InboxEvent['data']) => void;
  onConversationUpdated?: (event: InboxEvent['data']) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useInboxSSE(options: UseInboxSSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const optionsRef = useRef(options);
  
  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const connect = useCallback(async () => {
    const token = await getStorageItem('token');
    if (!token) {
      console.warn('[InboxSSE] No token available');
      return;
    }

    if (isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);
    
    const url = `${API_BASE_URL}/messages/events/tenant`;
    console.log('[InboxSSE] Connecting to', url);

    let connectionTimeout: NodeJS.Timeout | null = null;

    try {
      abortControllerRef.current = new AbortController();

      connectionTimeout = setTimeout(() => {
        if (abortControllerRef.current) {
          console.warn('[InboxSSE] Connection timeout, aborting');
          abortControllerRef.current.abort();
        }
      }, CONNECTION_TIMEOUT);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        signal: abortControllerRef.current.signal,
      });

      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      setIsConnecting(false);
      setIsConnected(true);
      retryCountRef.current = 0;
      optionsRef.current.onConnected?.();
      console.log('[InboxSSE] Connected to tenant events');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[InboxSSE] Stream ended');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = line.slice(6);
              const event: InboxEvent = JSON.parse(eventData);
              
              switch (event.type) {
                case 'new_message':
                  optionsRef.current.onNewMessage?.(event.data);
                  break;
                case 'conversation_updated':
                case 'status_update':
                case 'message_updated':
                  optionsRef.current.onConversationUpdated?.(event.data);
                  break;
              }
            } catch (e) {
              // Ignore parsing errors (heartbeats, etc)
            }
          }
        }
      }

      // Stream ended normally, reconnect
      setIsConnected(false);
      setIsConnecting(false);
      optionsRef.current.onDisconnected?.();
      
      if (appStateRef.current === 'active') {
        retryTimeoutRef.current = setTimeout(() => connect(), 1000);
      }
      
    } catch (error: any) {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }

      if (error?.name === 'AbortError') {
        console.log('[InboxSSE] Connection aborted');
        setIsConnecting(false);
        setIsConnected(false);
        return;
      }

      console.error('[InboxSSE] Connection error:', error?.message);
      setIsConnecting(false);
      setIsConnected(false);
      optionsRef.current.onDisconnected?.();

      // Reconnect with backoff
      if (retryCountRef.current < MAX_RETRIES && appStateRef.current === 'active') {
        const delay = BASE_DELAY * Math.pow(2, Math.min(retryCountRef.current, 4));
        retryCountRef.current++;
        console.log(`[InboxSSE] Reconnecting in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
        retryTimeoutRef.current = setTimeout(() => connect(), delay);
      }
    }
  }, [isConnecting, isConnected]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isActive = nextAppState === 'active';
      
      appStateRef.current = nextAppState;
      
      if (wasBackground && isActive) {
        // App came to foreground, reconnect
        console.log('[InboxSSE] App foregrounded, reconnecting...');
        cleanup();
        retryCountRef.current = 0;
        connect();
      } else if (!isActive) {
        // App went to background, disconnect to save resources
        console.log('[InboxSSE] App backgrounded, disconnecting...');
        cleanup();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [cleanup, connect]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      cleanup();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    reconnect: connect,
    disconnect: cleanup,
  };
}
