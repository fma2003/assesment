// src/hooks/useWebSocket.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WebSocketMessage, WebSocketResponse } from '../types/websocket';



interface UseWebSocketProps {
    url: string;
    onMessage?: (data: WebSocketResponse) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  }

export function useWebSocket({ 
  url, 
  onMessage, 
  onConnect, 
  onDisconnect 
}: UseWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const mountedRef = useRef(false);
  
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (wsRef.current) {
      // Remove all listeners before closing
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current || wsRef.current) return;

    cleanup();

    try {
      console.log('Attempting WebSocket connection...');
      const ws = new WebSocket(url);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        retryCountRef.current = 0;
        onConnect?.();
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log(`WebSocket closed: ${event.code}`);
        setIsConnected(false);
        wsRef.current = null;
        onDisconnect?.();

        // Only attempt reconnection for normal closure or network errors
        if ((event.code === 1000 || event.code === 1006) && retryCountRef.current < MAX_RETRIES) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current),
            MAX_RETRY_DELAY
          );
          
          console.log(`Reconnecting in ${delay}ms... (attempt ${retryCountRef.current + 1})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              retryCountRef.current++;
              connect();
            }
          }, delay);
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        console.error('WebSocket error:', error);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket setup error:', error);
    }
  }, [url, onMessage, onConnect, onDisconnect, cleanup]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [connect, cleanup]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected, message not sent:', message);
      return;
    }
    wsRef.current.send(JSON.stringify(message));
  }, []);

  return { 
    sendMessage, 
    isConnected,
    reconnect: connect 
  };
}