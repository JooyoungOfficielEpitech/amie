import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import { useAuth } from './AuthContext';

// 환경에 맞는 소켓 베이스 URL을 반환하는 함수
const getSocketBaseUrl = () => {
  // 프로덕션 환경에서는 현재 호스트 기반으로 WebSocket URL 생성
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;  // host는 도메인과 포트를 포함합니다
    const url = `${protocol}//${host}`;
    return url;
  }
  
  // 개발 환경에서는 환경 변수 또는 기본값 사용
  const devUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  return devUrl;
};

interface SocketContextType {
  matchSocket: any | null;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
  initializationAttempted: boolean; // 초기화 시도 여부 추가
}

const SocketContext = createContext<SocketContextType>({
  matchSocket: null,
  isConnected: false,
  reconnect: () => {},
  disconnect: () => {},
  initializationAttempted: false
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<any | null>(null);
  const { token, userId } = useAuth(); // AuthContext에서 인증 정보 가져오기
  const [initializationAttempted, setInitializationAttempted] = useState<boolean>(false);

  // 소켓 연결 초기화 함수
  const initSocket = () => {
    if (!token || !userId) {
      return null; // 명시적으로 null 반환
    }

    // 이미 연결된 소켓이 있으면 먼저 연결 해제
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // 소켓 기본 URL 결정
    const baseUrl = getSocketBaseUrl();
    
    // 소켓 연결 설정
    const socket = io(`${baseUrl}/match`, {
      auth: { 
        token,
        userId
      },
      query: {
        token,
        userId
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
      autoConnect: true,
      forceNew: true
    });

    socketRef.current = socket;

    // 소켓 수동 연결 시도
    socket.connect();

    // 소켓 이벤트 리스너 설정
    socket.on('connect', () => {
      setIsConnected(true);
      
      // 수동 인증 이벤트 호출 - 데이터 형식 변경
      
      // 인증 데이터 준비
      let authToken = token;
      let userIdToSend = userId;
      
      // 디버깅을 위한 토큰과 userId 로그
      if (!authToken) {
        console.error('인증 토큰이 없습니다!');
      }
      
      if (!userIdToSend) {
        console.error('사용자 ID가 없습니다!');
      }
      
      // 인증 이벤트 발송
      socket.emit('authenticate', { 
        userId: userIdToSend, 
        token: authToken 
      });
      
      // 소켓 인증 상태 확인을 위한 타임아웃 설정
      setTimeout(() => {
        // 연결은 되었지만 인증이 안되어 끊긴 경우
        if (!socket.connected) {
          console.error('소켓 인증 실패: 서버에서 연결 종료');
        }
      }, 3000);
    });
    
    socket.on('error', (error: any) => {
      console.error('소켓 오류:', error);
    });

    socket.on('disconnect', (reason: string) => {
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
    initSocket();
  };

  // 소켓 연결 해제 함수
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  };

  // 인증 정보(토큰, 유저ID)가 변경될 때마다 소켓 재연결
  useEffect(() => {
    if (token && userId) {
      const socket = initSocket();
      setInitializationAttempted(true);
    } else {
      setInitializationAttempted(true);
    }
    
    // 컴포넌트 언마운트 시 정리
    return () => {
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

  // 소켓 객체를 상태에 저장해서 컴포넌트에 전달
  const [matchSocket, setMatchSocket] = useState<any | null>(null);
  
  // 소켓 참조가 변경될 때마다 상태 업데이트
  useEffect(() => {
    if (socketRef.current !== matchSocket) {
      setMatchSocket(socketRef.current);
    }
  }, [socketRef.current]);

  return (
    <SocketContext.Provider value={{ 
      matchSocket: matchSocket, // socketRef.current 대신 상태값 사용
      isConnected, 
      reconnect, 
      disconnect,
      initializationAttempted
    }}>
      {children}
    </SocketContext.Provider>
  );
}; 