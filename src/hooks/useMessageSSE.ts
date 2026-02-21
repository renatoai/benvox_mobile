import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getStorageItem } from '../utils/storage';

const API_BASE_URL = 'https://api.voxbel.com';
const CONNECTION_TIMEOUT = 10000;
const MAX_RETRIES = 5;
const BASE_DELAY = 2000;

export interface MessageStatusEvent {
  id_message: string;
  id_conversation: string;
  id_tenant: string;
  status: string;
  external_message_id?: string;
  timestamp: string;
  delivered_at?: string;
  read_at?: string;
  error_details?: string;
}

export interface SSEEvent {
  type: 'status_update' | 'new_message' | 'message_deleted' | 'message_updated';
  data: MessageStatusEvent;
}

interface UseMessageSSEOptions {
  onStatusUpdate?: (event: MessageStatusEvent) => void;
  onNewMessage?: (event: MessageStatusEvent) => void;
  onMessageUpdated?: (event: MessageStatusEvent) => void;
  onMessageDeleted?: (event: MessageStatusEvent) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useMessageSSE(
  conversationId: string | null,
  options: UseMessageSSEOptions = {}
) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

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
    if (!conversationId) return;

    const token = await getStorageItem('token');
    if (!token) {
      console.warn('[MessageSSE] No token available');
      return;
    }

    if (isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);
    
    const url = `${API_BASE_URL}/messages/events/conversation/${conversationId}`;
    console.log('[MessageSSE] Connecting to', url);

    let connectionTimeout: NodeJS.Timeout | null = null;

    try {
      abortControllerRef.current = new AbortController();

      connectionTimeout = setTimeout(() => {
        if (abortControllerRef.current) {
          console.warn('[MessageSSE] Connection timeout, aborting');
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
      options.onConnected?.();
      console.log(`[MessageSSE] Connected to ${conversationId}`);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[MessageSSE] Stream ended for ${conversationId}`);
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
              const event: SSEEvent = JSON.parse(eventData);
              
              // Only process events for this conversation
              if (event.data.id_conversation !== conversationId) continue;
              
              switch (event.type) {
                case 'status_update':
                  options.onStatusUpdate?.(event.data);
                  break;
                case 'new_message':
                  options.onNewMessage?.(event.data);
                  break;
                case 'message_updated':
                  options.onMessageUpdated?.(event.data);
                  break;
                case 'message_deleted':
                  options.onMessageDeleted?.(event.data);
                  break;
              }
            } catch (e) {
              console.error('[MessageSSE] Failed to parse event:', e);
            }
          }
        }
      }

      // Stream ended normally, reconnect
      setIsConnected(false);
      setIsConnecting(false);
      options.onDisconnected?.();
      
      if (appStateRef.current === 'active') {
        retryTimeoutRef.current = setTimeout(() => connect(), 1000);
      }
      
    } catch (error: any) {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }

      if (error?.name === 'AbortError') {
        console.log(`[MessageSSE] Connection aborted for ${conversationId}`);
        setIsConnecting(false);
        setIsConnected(false);
        return;
      }

      console.error('[MessageSSE] Connection error:', error?.message);
      setIsConnecting(false);
      setIsConnected(false);
      options.onDisconnected?.();

      // Reconnect with backoff
      if (retryCountRef.current < MAX_RETRIES && appStateRef.current === 'active') {
        const delay = BASE_DELAY * Math.pow(2, Math.min(retryCountRef.current, 4));
        retryCountRef.current++;
        console.log(`[MessageSSE] Reconnecting in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
        retryTimeoutRef.current = setTimeout(() => connect(), delay);
      }
    }
  }, [conversationId, isConnecting, isConnected, options]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isActive = nextAppState === 'active';
      
      appStateRef.current = nextAppState;
      
      if (wasBackground && isActive && conversationId) {
        // App came to foreground, reconnect
        console.log('[MessageSSE] App foregrounded, reconnecting...');
        cleanup();
        retryCountRef.current = 0;
        connect();
      } else if (!isActive && conversationId) {
        // App went to background, disconnect to save resources
        console.log('[MessageSSE] App backgrounded, disconnecting...');
        cleanup();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [conversationId, cleanup, connect]);

  // Connect when conversation changes
  useEffect(() => {
    if (conversationId) {
      cleanup();
      retryCountRef.current = 0;
      connect();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [conversationId]);

  return {
    isConnected,
    isConnecting,
    reconnect: connect,
    disconnect: cleanup,
  };
}
