import { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';

interface PollingOptions {
  enabled?: boolean;
  interval?: number; // ms
}

export const useChatPolling = (options?: PollingOptions) => {
  const { currentRoomId, fetchMessages, fetchRooms } = useChat();
  
  const [polling, setPolling] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const defaultOptions: Required<PollingOptions> = {
    enabled: true,
    interval: 3000, // 3초
  };

  const mergedOptions = { ...defaultOptions, ...options };

  const startPolling = () => {
    if (!mergedOptions.enabled || !currentRoomId) {
      return;
    }
    
    setPolling(true);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // 메시지 폴링
    timerRef.current = setInterval(() => {
      if (currentRoomId) {
        fetchMessages(currentRoomId);
      }
      
      // 10번마다 채팅방 목록도 갱신 (30초마다)
      if (Math.floor(Date.now() / (mergedOptions.interval * 10)) % 10 === 0) {
        fetchRooms();
      }
    }, mergedOptions.interval);
  };

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPolling(false);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // currentRoomId 변경 시 폴링 시작/중지
  useEffect(() => {
    if (currentRoomId) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [currentRoomId]);

  return {
    polling,
    currentRoomId,
    startPolling,
    stopPolling
  };
}; 