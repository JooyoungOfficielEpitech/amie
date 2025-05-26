import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useCredit } from './CreditContext';
import { userApi } from '../api';

interface MatchContextType {
  isAutoMatchEnabled: boolean;
  setIsAutoMatchEnabled: (enabled: boolean) => void;
  toggleAutoMatch: () => void;
  isToggling: boolean; // 토글 처리 중 상태 추가
}

const MatchContext = createContext<MatchContextType>({
  isAutoMatchEnabled: false,
  setIsAutoMatchEnabled: () => {},
  toggleAutoMatch: () => {},
  isToggling: false
});

export const useMatch = () => useContext(MatchContext);

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAutoMatchEnabled, setIsAutoMatchEnabled] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false); // 토글 처리 중 상태
  const [userGender, setUserGender] = useState<string | null>(null);
  const { matchSocket } = useSocket();
  const { userId } = useAuth(); // userId 정보 가져오기
  const { credit } = useCredit(); // 크레딧 정보 가져오기
  const lastToggleTime = useRef<number>(0); // 마지막 토글 시간
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null); // 디바운스 타임아웃
  
  // 사용자 프로필 정보 가져오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (userId) {
        try {
          const profileResponse = await userApi.getProfile();
          if (profileResponse.success && profileResponse.user) {
            setUserGender(profileResponse.user.gender);
          }
        } catch (error) {
          console.error('[MatchContext] Error fetching user profile:', error);
        }
      }
    };
    
    fetchUserProfile();
  }, [userId]);
  
  // 사용자 성별 확인 (남성인 경우에만 자동 매칭 기능 활성화)
  const isMaleUser = userGender === 'male';
  
  // 크레딧 충분한지 확인 (10 이상 있는지)
  const hasSufficientCredit = credit !== null && credit >= 10;

  // 서버에서 받은 매칭 상태 이벤트 처리 함수
  const setupMatchSocketListeners = useCallback(() => {
    if (!matchSocket) return;

    // 서버에서 보내는 매칭 상태 응답 처리
    const handleToggleMatchResult = (data: { success: boolean; isMatching: boolean; message: string }) => {
      if (data.success) {
        // 서버 응답에 따라 UI 상태 업데이트 (서버 상태를 신뢰)
        setIsAutoMatchEnabled(data.isMatching);
        localStorage.setItem('isAutoMatchEnabled', data.isMatching ? 'true' : 'false');
      }
      setIsToggling(false); // 토글 처리 완료
    };

    // 현재 매칭 상태 응답 처리
    const handleCurrentMatchStatus = (data: { isMatching: boolean }) => {
      // 서버의 상태와 로컬 상태가 다를 경우 서버 상태로 동기화
      if (data.isMatching !== isAutoMatchEnabled) {
        setIsAutoMatchEnabled(data.isMatching);
        localStorage.setItem('isAutoMatchEnabled', data.isMatching ? 'true' : 'false');
      }
    };

    // 매칭 취소 이벤트 처리
    const handleMatchCancelled = () => {
      setIsAutoMatchEnabled(false);
      localStorage.removeItem('isAutoMatchEnabled');
      setIsToggling(false);
    };

    // 에러 처리
    const handleMatchError = (error: { message: string }) => {
      console.error('[MatchContext] Match error:', error.message);
      setIsToggling(false); // 에러 발생 시 토글 처리 종료
    };

    // 소켓 연결 이벤트
    const handleConnect = () => {
      // 연결되면 현재 상태 확인 요청
      matchSocket.emit('check_match_status');
    };

    // 이벤트 리스너 등록
    matchSocket.on('toggle_match_result', handleToggleMatchResult);
    matchSocket.on('current_match_status', handleCurrentMatchStatus);
    matchSocket.on('match_cancelled', handleMatchCancelled);
    matchSocket.on('match_error', handleMatchError);
    matchSocket.on('connect', handleConnect);

    // 이미 연결되어 있으면 상태 확인
    if (matchSocket.connected) {
      matchSocket.emit('check_match_status');
    }

    // 클린업 함수
    return () => {
      matchSocket.off('toggle_match_result', handleToggleMatchResult);
      matchSocket.off('current_match_status', handleCurrentMatchStatus);
      matchSocket.off('match_cancelled', handleMatchCancelled);
      matchSocket.off('match_error', handleMatchError);
      matchSocket.off('connect', handleConnect);
    };
  }, [matchSocket, isAutoMatchEnabled]);

  // 소켓 이벤트 리스너 설정
  useEffect(() => {
    const cleanup = setupMatchSocketListeners();
    return cleanup;
  }, [setupMatchSocketListeners]);

  // 초기 자동 매칭 상태 로드
  useEffect(() => {
    // 남성 사용자인 경우에만 상태 로드
    if (isMaleUser) {
      const savedAutoMatchState = localStorage.getItem('isAutoMatchEnabled') === 'true';
      
      // 크레딧이 부족한 경우 강제로 비활성화
      if (!hasSufficientCredit && savedAutoMatchState) {
        setIsAutoMatchEnabled(false);
        localStorage.setItem('isAutoMatchEnabled', 'false');
        
        // 서버 상태도 업데이트
        if (matchSocket?.connected) {
          matchSocket.emit('toggle_match', { isEnabled: false });
        }
      } else {
        setIsAutoMatchEnabled(savedAutoMatchState);
      }
    } else {
      // 여성 사용자인 경우 항상 비활성화
      setIsAutoMatchEnabled(false);
      localStorage.setItem('isAutoMatchEnabled', 'false');
    }
  }, [isMaleUser, userId, hasSufficientCredit, matchSocket]);

  // 크레딧 변경 시 자동 매칭 상태 업데이트
  useEffect(() => {
    // 남성 사용자이고 크레딧이 부족한 경우 자동 매칭 비활성화
    if (isMaleUser && !hasSufficientCredit && isAutoMatchEnabled) {
      setIsAutoMatchEnabled(false);
      localStorage.setItem('isAutoMatchEnabled', 'false');
      
      // 서버에 자동 매칭 비활성화 이벤트 전송
      if (matchSocket?.connected) {
        matchSocket.emit('toggle_match', {
          isEnabled: false
        });
      }
    }
  }, [credit, isMaleUser, isAutoMatchEnabled, hasSufficientCredit, matchSocket]);

  // 자동 매칭 토글 함수 (디바운스 적용)
  const toggleAutoMatch = useCallback(() => {
    // 이미 처리 중이면 무시
    if (isToggling) {
      return;
    }

    // 디바운스 처리 (500ms 이내 중복 클릭 방지)
    const now = Date.now();
    if (now - lastToggleTime.current < 500) {
      return;
    }
    lastToggleTime.current = now;

    // 이전 디바운스 취소
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // 남성 사용자만 토글 가능
    if (!isMaleUser) {
      return;
    }
    
    // 켜려고 할 때 크레딧 부족하면 토글 차단
    const newState = !isAutoMatchEnabled;
    if (newState && !hasSufficientCredit) {
      return;
    }
    
    setIsToggling(true); // 토글 처리 시작
    
    // 디바운스 처리
    debounceTimeout.current = setTimeout(() => {
      // 로컬 스토리지에 자동 매칭 상태 저장
      localStorage.setItem('isAutoMatchEnabled', newState ? 'true' : 'false');
      
      // 서버에 토글 상태 변경 이벤트 전송 (소켓 연결 시)
      if (matchSocket?.connected) {
        // 토글 이벤트 전송
        matchSocket.emit('toggle_match', {
          isEnabled: newState
        });
        
        // 즉시 UI 상태 업데이트
        setIsAutoMatchEnabled(newState);
      } else {
        setIsToggling(false); // 소켓 연결 안 됨, 토글 처리 종료
      }
    }, 150); // 짧은 디바운스
  }, [isMaleUser, isAutoMatchEnabled, hasSufficientCredit, matchSocket, isToggling]);

  return (
    <MatchContext.Provider value={{ 
      isAutoMatchEnabled, 
      setIsAutoMatchEnabled,
      toggleAutoMatch,
      isToggling
    }}>
      {children}
    </MatchContext.Provider>
  );
}; 