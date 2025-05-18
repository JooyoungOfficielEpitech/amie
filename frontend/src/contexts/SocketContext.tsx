import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import { useAuth } from './AuthContext';

// 환경에 맞는 소켓 베이스 URL을 반환하는 함수
const getSocketBaseUrl = () => {
  // 프로덕션 환경에서는 현재 호스트 기반으로 WebSocket URL 생성
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;  // host는 도메인과 포트를 포함합니다
    return `${protocol}//${host}`;
  }
  
  // 개발 환경에서는 환경 변수 또는 기본값 사용
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
};

interface SocketContextType {
  matchSocket: any | null;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  matchSocket: null,
  isConnected: false,
  reconnect: () => {},
  disconnect: () => {}
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<any | null>(null);
  const { token, userId } = useAuth(); // AuthContext에서 인증 정보 가져오기

  // 소켓 연결 초기화 함수
  const initSocket = () => {
    if (!token || !userId) {
      console.log('인증 정보가 없어서 소켓 연결을 시도하지 않습니다.');
      return;
    }

    // 이미 연결된 소켓이 있으면 먼저 연결 해제
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // 소켓 기본 URL 결정
    const baseUrl = getSocketBaseUrl();
    console.log('소켓 연결 초기화 중...', baseUrl);
    console.log('토큰 존재 여부:', token ? '있음' : '없음');
    console.log('userId 존재 여부:', userId ? '있음' : '없음');
    
    // 소켓 연결 설정
    const socket = io(`${baseUrl}/match`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
      autoConnect: true
    });

    socketRef.current = socket;

    // 소켓 이벤트 리스너 설정
    socket.on('connect', () => {
      console.log('소켓 연결 성공:', socket.id);
      setIsConnected(true);
      
      // 수동 인증 이벤트 호출 - 데이터 형식 변경
      console.log('인증 이벤트 호출...');
      
      // 디버깅을 위한 토큰 로그 (일부만 출력)
      if (token) {
        console.log('인증 토큰:', token.slice(0, 15) + '...');
      }
      
      // 서버가 기대하는 형식으로 인증 데이터 전송
      socket.emit('authenticate', { 
        userId, 
        token 
      });
      
      // 소켓 인증 상태 확인을 위한 타임아웃 설정
      setTimeout(() => {
        // 연결은 되었지만 인증이 안되어 끊긴 경우
        if (!socket.connected) {
          console.error('소켓 인증 실패: 서버에서 연결 종료');
        }
      }, 3000);
    });

    // 인증 성공/실패 처리
    socket.on('authenticated', (data: { success: boolean }) => {
      console.log('인증 성공:', data);
    });
    
    socket.on('error', (error: { message: string }) => {
      console.error('소켓 오류:', error);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('소켓 연결 해제:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('소켓 연결 오류:', error.message);
      setIsConnected(false);
    });

    return socket;
  };

  // 소켓 재연결 함수
  const reconnect = () => {
    console.log('소켓 재연결 시도...');
    initSocket();
  };

  // 소켓 연결 해제 함수
  const disconnect = () => {
    console.log('소켓 연결 해제 중...');
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  };

  // 인증 정보(토큰, 유저ID)가 변경될 때마다 소켓 재연결
  useEffect(() => {
    initSocket();
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      console.log('소켓 컨텍스트 정리 중...');
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('authenticated');
        socketRef.current.off('error');
        socketRef.current.disconnect();
      }
    };
  }, [token, userId]);

  return (
    <SocketContext.Provider value={{ 
      matchSocket: socketRef.current, 
      isConnected, 
      reconnect, 
      disconnect 
    }}>
      {children}
    </SocketContext.Provider>
  );
}; 