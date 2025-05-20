import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import styles from './MainPage.module.css';
import * as AppStrings from '../../constants/strings';
import { CREDIT_MESSAGES } from '../../constants/credits';
import './Switch.css';
import { useCreditCheck } from '../../hooks/useCreditCheck';
import { Socket } from 'socket.io-client';
import { UserProfile } from '../../api';

// UI strings
const MALE_SWITCH_LABEL = '자동 매칭 활성화';

// 매칭에 필요한 크레딧
const REQUIRED_MATCHING_CREDIT = 10;


// --- 남성용 매칭 박스 Props 정의 ---
interface MaleMatchingBoxProps {
  profile: UserProfile;
  isMatching: boolean;
  isButtonDisabled: boolean;
  matchedRoomId: string | null;
  buttonText: string;
  isLoadingRoomStatus: boolean;
  matchSocket: typeof Socket | null;
  matchError: string | null;
  setMatchError: (error: string | null) => void;
  setIsMatching: (isMatching: boolean) => void;
  onMatchButtonClick: () => void;
  onCreditUpdate: () => Promise<void>;
  isAutoSearchEnabled?: boolean; // App.tsx에서 관리하는 상태
  onAutoSearchChange?: (enabled: boolean) => void; // App.tsx 상태 변경 콜백
}

const MaleMatchingBox: React.FC<MaleMatchingBoxProps> = React.memo(({
  profile,
  isMatching,
  isButtonDisabled,
  matchedRoomId,
  isLoadingRoomStatus,
  matchSocket,
  matchError,
  setMatchError,
  setIsMatching,
  onMatchButtonClick,
  onCreditUpdate,
  isAutoSearchEnabled: externalAutoSearchEnabled = false, // 외부에서 전달받은 값
  onAutoSearchChange // 외부 상태 업데이트 콜백
}) => {
  const [isAutoMatchEnabled, setIsAutoMatchEnabled] = useState<boolean>(externalAutoSearchEnabled);
  // 상태 변경 디바운싱을 위한 레퍼런스
  const lastStatusCheckRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  // 토글 처리 중 상태 추가
  const [isTogglingInProgress, setIsTogglingInProgress] = useState<boolean>(false);
  // 토글 쿨다운 타이머 상태 추가
  const [isToggleCooldown, setIsToggleCooldown] = useState<boolean>(false);
  
  // 드래그 관련 상태 추가
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [dragPosition, setDragPosition] = useState<number>(0);
  
  // useCreditCheck 훅 사용하여 크레딧 상태 관리
  const { 
    hasSufficientCredit, 
    isLoading: isCreditLoading,
    refreshCredit 
  } = useCreditCheck(profile, REQUIRED_MATCHING_CREDIT, 'matching');
  
  // 크레딧 부족 상태 확인 함수
  const isInsufficientCredit = useCallback(() => {
    return !hasSufficientCredit;
  }, [hasSufficientCredit]);
  
  // 크레딧 상태 업데이트 useEffect - 의존성 최적화
  useEffect(() => {
    const currentCredit = profile?.credit || 0;
    
    // 매칭 중이 아닐 때만 크레딧 부족 에러 표시
    // 이미 매칭 중이라면 크레딧이 부족해도 에러 메시지 표시하지 않음
    if (isInsufficientCredit() && isAutoMatchEnabled && !isMatching) {
      // 크레딧 부족하면 자동 매칭 비활성화하고 에러 표시
      setIsAutoMatchEnabled(false);
      localStorage.setItem('isAutoMatchEnabled', 'false');
      setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
    }
    // 크레딧이 충분하고 이전에 크레딧 부족 오류가 표시된 경우, 오류 메시지 제거
    else if (!isInsufficientCredit() && matchError === CREDIT_MESSAGES.INSUFFICIENT_CREDITS) {
      setMatchError(null);
    }
    
    console.log(`[MaleMatchingBox] Credit status updated - Current: ${currentCredit}, Required: ${REQUIRED_MATCHING_CREDIT}`);
  }, [profile?.credit, isInsufficientCredit, isAutoMatchEnabled, setMatchError, hasSufficientCredit, isMatching, matchError]);
  
  // 초기 자동 매칭 상태 설정 - 한 번만 실행되도록 의존성 최적화
  useEffect(() => {
    if (profile?.id) {  // profile이 로드되었는지 확인
      // 로컬 스토리지에서 자동 매칭 상태 확인
      const savedAutoMatchState = localStorage.getItem('isAutoMatchEnabled') === 'true';
      
      // 페이지 로드 시 강제로 OFF 설정하지 않고 (이 라인 삭제됨)
      // 로컬 상태 가져오기 (사용자 선호도 유지)
      setIsAutoMatchEnabled(savedAutoMatchState);
      
      // 실제 매칭 상태는 서버에서 받아올 예정
      console.log(`[MaleMatchingBox] Initial auto match UI state set to ${savedAutoMatchState}, waiting for server status`);
      
      // 소켓 연결되어 있으면 즉시 서버 상태 확인 요청
      if (matchSocket?.connected) {
        console.log('[MaleMatchingBox] Socket connected on initial load, requesting match status');
        matchSocket.emit('check_match_status');
      }
    }
  }, [profile?.id, matchSocket]);
  
  // 소켓 이벤트 설정 - 의존성 최적화
  useEffect(() => {
    if (!matchSocket?.connected) return;
    
    console.log('[MaleMatchingBox] Setting up socket event listeners');
    
    // 이벤트 핸들러 정의
    const handleMatchError = (errorData: { message: string }) => {
      console.error('[MaleMatchingBox] Match error from server:', errorData.message);
      
      // 토글 처리 완료
      setIsTogglingInProgress(false);
      
      // "이미 매칭 중" 오류는 단순히 상태 동기화로 처리
      if (errorData.message.includes('이미') && errorData.message.includes('대기')) {
        // 프론트엔드 상태를 서버 상태와 동기화
        setIsMatching(true);
        // 경고 메시지 숨김 (실제 오류 상황이 아님)
        setMatchError(null);
      } else {
        // 다른 오류는 정상적으로 표시
        setMatchError(errorData.message);
      }
    };
    
    const handleMatchCancelled = () => {
      console.log('[MaleMatchingBox] Match cancelled by server');
      setIsMatching(false);
      setMatchError(null);
      
      // 매칭이 취소되면 자동 매칭도 OFF로 설정
      if (isAutoMatchEnabled) {
        console.log('[MaleMatchingBox] Server cancelled match, disabling auto match locally');
        setIsAutoMatchEnabled(false);
        localStorage.setItem('isAutoMatchEnabled', 'false');
      }
      
      // 토글 처리 중이었다면 완료 처리
      setIsTogglingInProgress(false);
    };
    
    const handleMatchStatus = (data: { isMatching: boolean, userId: string, timestamp?: number, credit?: number }) => {
      // 서버 상태에 따라 클라이언트 상태 업데이트
      console.log('[MaleMatchingBox] Received current_match_status:', data);
      
      // 토글 처리 완료
      setIsTogglingInProgress(false);
      
      // 1. 먼저 서버 매칭 상태를 UI에 반영
      if (data.isMatching !== isMatching) {
        console.log(`[MaleMatchingBox] Synchronizing match state with server: ${data.isMatching}`);
        setIsMatching(data.isMatching);
        
        // 매칭 중으로 변경될 때 크레딧 부족 오류 메시지가 표시되어 있다면 제거
        if (data.isMatching && matchError === CREDIT_MESSAGES.INSUFFICIENT_CREDITS) {
          setMatchError(null);
        }
      }
      
      // 2. 자동 매칭 스위치와 서버 매칭 상태 동기화 우선순위 조정
      // 서버가 매칭 중이라고 하면 무조건 스위치 ON (크레딧 상태 관계없이)
      if (data.isMatching) {
        if (!isAutoMatchEnabled) {
          console.log('[MaleMatchingBox] Server says user is matching, enabling auto match locally');
          setIsAutoMatchEnabled(true);
          localStorage.setItem('isAutoMatchEnabled', 'true');
          
          // 상태가 변경되면 쿨다운 설정 (2초)
          setIsToggleCooldown(true);
          setTimeout(() => {
            setIsToggleCooldown(false);
          }, 2000);
          
          // 매칭 중일 때는 크레딧 부족 경고를 표시하지 않음
          // 이 부분 삭제
        }
      } 
      // 서버가 매칭 중이 아니라고 하면 무조건 스위치 OFF
      else {
        if (isAutoMatchEnabled) {
          console.log('[MaleMatchingBox] Server says user is NOT matching, disabling auto match locally');
          setIsAutoMatchEnabled(false);
          localStorage.setItem('isAutoMatchEnabled', 'false');
          
          // 상태가 변경되면 쿨다운 설정 (2초)
          setIsToggleCooldown(true);
          setTimeout(() => {
            setIsToggleCooldown(false);
          }, 2000);
          
          // 매칭이 종료되고 크레딧이 부족하면 에러 메시지 표시
          if (!hasSufficientCredit) {
            setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
          }
        }
      }
      
      // 서버가 크레딧 정보도 보내주면 업데이트
      if (data.credit !== undefined && data.credit !== profile?.credit) {
        console.log(`[MaleMatchingBox] Server reported updated credit: ${data.credit}`);
        refreshCredit().catch(err => {
          console.error('[MaleMatchingBox] Error refreshing credit after status update:', err);
        });
      }
    };
    
    const handleToggleResult = (result: { success: boolean, isMatching: boolean, message: string }) => {
      console.log('[MaleMatchingBox] Received toggle_match_result:', result);
      
      // 토글 처리 완료
      setIsTogglingInProgress(false);
      
      // 성공 시 상태 업데이트
      if (result.success) {
        // 서버 상태에 맞게 매칭 상태 업데이트
        if (result.isMatching !== isMatching) {
          console.log(`[MaleMatchingBox] Updating matching state to: ${result.isMatching}`);
          setIsMatching(result.isMatching);
        }
        
        // 자동 매칭 스위치 상태도 서버 매칭 상태에 맞게 동기화
        // 서버 매칭 상태가 true면 자동 매칭도 true여야 함
        if (result.isMatching !== isAutoMatchEnabled) {
          console.log(`[MaleMatchingBox] Synchronizing auto match UI state with server: ${result.isMatching}`);
          setIsAutoMatchEnabled(result.isMatching);
          localStorage.setItem('isAutoMatchEnabled', result.isMatching ? 'true' : 'false');
          
          // App.tsx의 상태도 업데이트 (부모 컴포넌트에 변경 알림)
          if (onAutoSearchChange) {
            console.log(`[MaleMatchingBox] Updating parent component auto search state: ${result.isMatching}`);
            onAutoSearchChange(result.isMatching);
          }
          
          // 토글 성공 후 쿨다운 설정 (2초)
          setIsToggleCooldown(true);
          setTimeout(() => {
            setIsToggleCooldown(false);
          }, 2000);
        }
        
        setMatchError(null);
        
        // 상태가 변경되었을 때만 크레딧 정보 업데이트
        refreshCredit().catch(err => {
          console.error('[MaleMatchingBox] Error updating credit after toggle:', err);
        });
        
        // 필요한 경우 추가 업데이트 콜백 실행
        if (onCreditUpdate) {
          onCreditUpdate().catch(err => {
            console.error('[MaleMatchingBox] Error in onCreditUpdate callback:', err);
          });
        }
      } else {
        // 실패 시 에러 메시지 표시
        console.error('[MaleMatchingBox] Toggle failed:', result.message);
        setMatchError(result.message);
        
        // 실패 시 로컬 자동 매칭 상태를 서버 상태와 동기화
        const correctState = !result.isMatching;
        console.log(`[MaleMatchingBox] Reverting auto match state to: ${correctState}`);
        setIsAutoMatchEnabled(correctState);
        localStorage.setItem('isAutoMatchEnabled', correctState ? 'true' : 'false');
        
        // 즉시 상태 확인 요청하여 정확한 서버 상태와 동기화
        if (matchSocket?.connected) {
          console.log('[MaleMatchingBox] Requesting current match status after toggle failure');
          setTimeout(() => {
            matchSocket.emit('check_match_status');
          }, 500); // 약간의 지연을 두고 상태 확인
        }
      }
    };
    
    // 이벤트 리스너 등록 - 중복 등록 방지를 위해 먼저 모든 리스너 제거
    matchSocket.off('match_error').on('match_error', handleMatchError);
    matchSocket.off('match_cancelled').on('match_cancelled', handleMatchCancelled);
    matchSocket.off('current_match_status').on('current_match_status', handleMatchStatus);
    matchSocket.off('toggle_match_result').on('toggle_match_result', handleToggleResult);
    
    // 연결 시 한 번만 현재 매칭 상태 요청 - 이미 매칭 중인지 확인
    if (!isProcessingRef.current) {
      isProcessingRef.current = true;
      matchSocket.emit('check_match_status');
      // 3초 후 처리 완료 상태로 변경
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 3000);
    }
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      if (matchSocket?.connected) {
        matchSocket.off('match_error');
        matchSocket.off('match_cancelled');
        matchSocket.off('current_match_status');
        matchSocket.off('toggle_match_result');
      }
    };
  }, [matchSocket?.connected, setMatchError, setIsMatching, refreshCredit, onCreditUpdate, isAutoMatchEnabled, onAutoSearchChange]);

  // 매칭 상태 확인 후 안전하게 매칭 시작하는 Promise 기반 함수 - useCallback으로 메모이제이션
  const checkMatchStatusAndStart = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!matchSocket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      // 마지막 요청 이후 5초 이내라면 요청 무시
      const now = Date.now();
      if (now - lastStatusCheckRef.current < 5000) {
        resolve(); // 추가 작업 없이 종료
        return;
      }
      
      lastStatusCheckRef.current = now;
      
      // 이미 매칭 중인 상태면 작업 스킵
      if (isMatching) {
        resolve();
        return;
      }
      
      // 매칭 상태 확인용 일회성 리스너
      matchSocket.once('current_match_status', (data: { isMatching: boolean }) => {
        // 이미 매칭 중이면 상태만 동기화하고 종료
        if (data.isMatching) {
          setIsMatching(true); // 프론트엔드 상태 동기화
          resolve(); // 추가 작업 없이 종료
          return;
        }
        
        // 매칭 중이 아니면 매칭 시작
        // 매칭 시작 요청에 대한 오류 처리 (일회성)
        matchSocket.once('match_error', (errorData: { message: string }) => {
          // 오류 메시지가 "이미 매칭 중"인 경우 정상 종료 처리
          if (errorData.message.includes('이미') && errorData.message.includes('대기')) {
            setIsMatching(true);
            resolve();
          } else {
            setMatchError(errorData.message);
            reject(new Error(errorData.message));
          }
        });
        
        // 매칭 시작
        setIsMatching(true);
        matchSocket.emit('start_match');
        
        // 즉시 해결 (실제 매칭 성공/실패는 별도 이벤트로 처리)
        resolve();
      });
      
      // 타임아웃 설정 (3초) - 타임아웃 시간 감소
      const timeoutId = setTimeout(() => {
        // 일회성 리스너 제거 (중요: 메모리 누수 방지)
        matchSocket.off('current_match_status');
        matchSocket.off('match_error');
        
        // 매칭 시작 시도
        setIsMatching(true);
        matchSocket.emit('start_match');
        resolve();
      }, 2000);
      
      // 상태 확인 요청
      matchSocket.emit('check_match_status');
      
      // Promise cleanup 함수 (Promise rejected/resolved 시 타임아웃 취소)
      return () => clearTimeout(timeoutId);
    });
  }, [matchSocket, isMatching, setIsMatching, setMatchError]);

  // 자동 매칭 처리 및 크레딧 확인 useEffect - 의존성 최적화 및 타이머 간격 증가
  useEffect(() => {
    if (!matchSocket?.connected || !profile?.id) {
      return;
    }
    
    // 매칭 시도 관련 상태
    let matchingInProgress = false;
    let lastMatchAttemptTime = 0;
    
    // 주기적으로 프로필과 매칭 상태를 확인하고 자동 매칭 처리
    const checkProfileAndMatch = async () => {
      // 이미 처리 중이거나 소켓 연결이 끊어진 경우 스킵
      if (matchingInProgress || !matchSocket.connected) {
        return;
      }
      
      // 마지막 매칭 시도 후 120초 이내인 경우 스킵 (재시도 간격 확대)
      const now = Date.now();
      const timeSinceLastAttempt = now - lastMatchAttemptTime;
      if (lastMatchAttemptTime > 0 && timeSinceLastAttempt < 120000) {
        return;
      }
      
      // 이미 매칭이 진행 중이거나, 채팅방이 있는 경우 새로운 매칭 시도 안함
      if (isMatching || matchedRoomId || profile.isWaitingForMatch) {
        return;
      }
      
      // 자체적인 로컬 스토리지 체크 대신 컴포넌트 상태 사용
      // 이 부분을 수정하여 App 컴포넌트에서 관리하는 isAutoMatchEnabled 사용
      console.log('[MaleMatchingBox] 자동 매칭 확인 - isAutoMatchEnabled 상태:', isAutoMatchEnabled);
      
      // 채팅방이 없고, 매칭 중이 아니고, 자동 매칭이 활성화되어 있으면 매칭 시작
      if (isAutoMatchEnabled && hasSufficientCredit && !isMatching && !matchedRoomId) {
        console.log('[MaleMatchingBox] Auto matching condition met, checking server state');
        
        // 매칭 시도 타임스탬프 기록
        lastMatchAttemptTime = now;
        matchingInProgress = true;
        
        try {
          // Promise 기반 순차 처리: 상태 확인 후 안전하게 매칭 시작
          await checkMatchStatusAndStart();
          
          // 매칭 후 크레딧 정보 새로고침
          await refreshCredit();
        } catch (error) {
          console.error('[MaleMatchingBox] Error in auto matching process:', error);
        } finally {
          matchingInProgress = false;
        }
      }
    };
    
    // 초기 실행 (첫 마운트 시 한 번)
    checkProfileAndMatch();
    
    // 주기적으로 실행 (3분마다 - 더 긴 간격으로 수정)
    const interval = setInterval(checkProfileAndMatch, 180000);
    
    return () => clearInterval(interval);
  }, [
    matchSocket?.connected, 
    profile?.id, 
    profile?.isWaitingForMatch, 
    isMatching, 
    matchedRoomId, 
    isAutoMatchEnabled, // 컴포넌트 상태 사용 
    hasSufficientCredit, 
    checkMatchStatusAndStart, 
    setMatchError,
    refreshCredit
  ]);
  
  // 자동 매칭 토글 시 처리 - useCallback으로 메모이제이션
  const handleToggleAutoMatch = useCallback(() => {
    // 이미 토글 처리 중이면 무시
    if (isTogglingInProgress) {
      console.log('[MaleMatchingBox] Toggle already in progress, ignoring');
      return;
    }
    
    // 쿨다운 중이면 무시
    if (isToggleCooldown) {
      console.log('[MaleMatchingBox] Toggle in cooldown period, ignoring');
      return;
    }
    
    // 크레딧 충분한지 먼저 확인
    if (!isAutoMatchEnabled && !hasSufficientCredit) {
      console.log('[MaleMatchingBox] Cannot enable auto match: insufficient credit');
      setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
      return; // 크레딧 부족 시 토글 안됨
    }
    
    const newState = !isAutoMatchEnabled;
    console.log(`[MaleMatchingBox] Auto match toggle requested: ${newState}`);
    
    // 서버에 토글 상태 변경 이벤트 전송
    if (matchSocket?.connected) {
      console.log('[MaleMatchingBox] Sending toggle_match event to server:', newState);
      
      // 토글 요청 중임을 표시 (스위치 비활성화)
      setIsTogglingInProgress(true);
      
      // 토글 전에 먼저 서버의 현재 상태 확인
      matchSocket.emit('check_match_status');
      
      // 짧은 지연 후 토글 요청 전송 (서버 상태 확인 후)
      setTimeout(() => {
        if (matchSocket?.connected) {
          // 토글 이벤트 전송 (새로운 방식)
          matchSocket.emit('toggle_match', {
            enable: newState
          });
          
          // 로컬 스토리지 업데이트 - App.tsx의 isAutoSearchEnabled 상태와 동기화 하기 위함
          localStorage.setItem('isAutoMatchEnabled', newState ? 'true' : 'false');
          
          // 내부 상태 업데이트 (서버 응답 이전에 UI 먼저 업데이트)
          setIsAutoMatchEnabled(newState);
          
          // App.tsx의 상태도 업데이트 (부모 컴포넌트에 변경 알림)
          if (onAutoSearchChange) {
            console.log(`[MaleMatchingBox] Updating parent component auto search state: ${newState}`);
            onAutoSearchChange(newState);
          }
        }
      }, 500);
    } else {
      // 소켓 연결이 없어도 로컬 상태는 업데이트
      setIsAutoMatchEnabled(newState);
      localStorage.setItem('isAutoMatchEnabled', newState ? 'true' : 'false');
      
      // App.tsx의 상태도 업데이트
      if (onAutoSearchChange) {
        console.log(`[MaleMatchingBox] Updating parent component auto search state (no socket): ${newState}`);
        onAutoSearchChange(newState);
      }
    }
  }, [isTogglingInProgress, isToggleCooldown, isAutoMatchEnabled, hasSufficientCredit, matchSocket?.connected, setMatchError, onAutoSearchChange]);

  // 자동 매칭 스위치 비활성화 조건 - useMemo로 메모이제이션
  const isToggleDisabled = useMemo(() => (
    isButtonDisabled || 
    !matchSocket?.connected || 
    isLoadingRoomStatus || 
    (!isAutoMatchEnabled && !hasSufficientCredit) ||
    isCreditLoading ||
    isTogglingInProgress ||
    isToggleCooldown // 쿨다운 상태 추가
  ), [
    isButtonDisabled, 
    matchSocket?.connected, 
    isLoadingRoomStatus, 
    isAutoMatchEnabled, 
    hasSufficientCredit,
    isCreditLoading,
    isTogglingInProgress,
    isToggleCooldown // 의존성 배열에 추가
  ]);

  // 컴포넌트 마운트 시 서버에서 현재 매칭 상태를 확인하는 useEffect
  useEffect(() => {
    // 서버에 연결되어 있지 않으면 건너뜀
    if (!matchSocket?.connected) return;
    
    console.log('[MaleMatchingBox] Component mounted, checking server match status');
    
    // 페이지 로딩 시 항상 서버 상태 확인
    matchSocket.emit('check_match_status');
    
    // 만약 서버 응답이 없는 경우를 대비해 타임아웃 설정
    const timeout = setTimeout(() => {
      if (matchSocket.connected) {
        console.log('[MaleMatchingBox] No status response received, requesting again');
        matchSocket.emit('check_match_status');
      }
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [matchSocket?.connected]); // 소켓 연결 상태가 변경될 때만 실행

  // 드래그 처리 함수
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isToggleDisabled) return;
    
    // 드래그 시작
    setIsDragging(true);
    
    // 터치이벤트와 마우스이벤트 구분
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const sliderRect = sliderRef.current?.getBoundingClientRect();
    
    if (sliderRect) {
      // 현재 위치 계산 (0 ~ 1 사이의 값)
      const position = (clientX - sliderRect.left) / sliderRect.width;
      setDragPosition(Math.max(0, Math.min(1, position)));
    }
    
    // 이벤트 전파 방지
    e.preventDefault();
    e.stopPropagation();
  }, [isToggleDisabled]);
  
  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    // 터치이벤트와 마우스이벤트 구분
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const sliderRect = sliderRef.current?.getBoundingClientRect();
    
    if (sliderRect) {
      // 현재 위치 계산 (0 ~ 1 사이의 값)
      const position = (clientX - sliderRect.left) / sliderRect.width;
      setDragPosition(Math.max(0, Math.min(1, position)));
    }
    
    // 이벤트 전파 방지
    e.preventDefault();
    e.stopPropagation();
  }, [isDragging]);
  
  const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    // 드래그 종료
    setIsDragging(false);
    
    // 위치에 따라 토글 상태 변경
    if (dragPosition > 0.7 && !isAutoMatchEnabled) {
      // OFF -> ON으로 변경
      handleToggleAutoMatch();
    } else if (dragPosition < 0.3 && isAutoMatchEnabled) {
      // ON -> OFF로 변경
      handleToggleAutoMatch();
    }
    
    // 드래그 위치 초기화
    setDragPosition(0);
    
    // 이벤트 전파 방지
    e.preventDefault();
    e.stopPropagation();
  }, [isDragging, dragPosition, isAutoMatchEnabled, handleToggleAutoMatch]);
  
  // 전역 마우스/터치 이벤트 등록
  useEffect(() => {
    // 드래그 중일 때만 이벤트 리스너 등록
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchend', handleDragEnd);
    }
    
    return () => {
      // 컴포넌트 언마운트 또는 드래그 종료 시 이벤트 리스너 제거
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);
  
  // 드래그 중인 슬라이더 핸들 위치 계산
  const handlePosition = useMemo(() => {
    if (!isDragging) {
      return isAutoMatchEnabled ? 'calc(100% - 40px)' : '4px';
    }
    
    // 드래그 중일 때는 위치에 따라 계산
    const maxPosition = sliderRef.current?.clientWidth || 140;
    const handleSize = 36; // 핸들 크기
    const padding = 4; // 패딩
    
    // 슬라이더 내에서 핸들이 이동할 수 있는 최대 범위
    const maxHandlePosition = maxPosition - handleSize - padding * 2;
    
    // 현재 드래그 위치에 따른 핸들 위치 계산
    return `${padding + dragPosition * maxHandlePosition}px`;
  }, [isDragging, isAutoMatchEnabled, dragPosition]);
  
  // 슬라이더 배경 색상 계산
  const sliderBackground = useMemo(() => {
    if (!isDragging) {
      return isAutoMatchEnabled ? '#FE466C' : '#ddd';
    }
    
    // 드래그 중일 때는 위치에 따라 점진적으로 색상 변경
    if (dragPosition > 0.5) {
      // 0.5 이상이면 점점 활성화 색상으로
      const intensity = (dragPosition - 0.5) * 2; // 0.5 ~ 1.0 -> 0 ~ 1.0
      return `rgba(254, 70, 108, ${intensity})`;
    }
    return '#ddd';
  }, [isDragging, isAutoMatchEnabled, dragPosition]);

  return (
    <section className={styles.contentBox}>
      <div className={styles.profileHeader}>
        <span className={styles.profileTitle}>{`${AppStrings.MAINPAGE_PROFILE_TITLE_PREFIX}${profile.nickname}${AppStrings.MAINPAGE_PROFILE_TITLE_SUFFIX}`}</span>
        <span className={styles.statusBadge}>{profile.isActive ? AppStrings.MAINPAGE_STATUS_ACTIVE : '비활성'}</span>
      </div>
      
      {/* 남성 사용자용 UI - 슬라이더 방식 */}
      <div className="switch-container">
        <label className="switch-label">
          {MALE_SWITCH_LABEL}
        </label>
        <div 
          ref={sliderRef}
          className={`toggle-switch ${isAutoMatchEnabled ? 'active' : ''} ${isToggleCooldown ? 'cooldown' : ''}`}
          style={{ background: sliderBackground }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <input
            type="checkbox"
            checked={isAutoMatchEnabled}
            onChange={handleToggleAutoMatch}
            disabled={isToggleDisabled}
            className="toggle-switch-checkbox"
            id="matchSwitch"
          />
          <label className="toggle-switch-label" htmlFor="matchSwitch">
            <span 
              className="toggle-switch-switch" 
              style={{ left: handlePosition }}
            ></span>
          </label>
        </div>
        
        {/* 상태 텍스트 표시 */}
        <div className="switch-status-text">
          {isAutoMatchEnabled ? 'ON' : 'OFF'}
        </div>
        
        {/* 쿨다운 표시 */}
        {isToggleCooldown && (
          <span className="cooldown-indicator" style={{ color: '#ff9800', fontWeight: 'bold' }}>
            잠시 기다려주세요...
          </span>
        )}
        
        {/* 현재 상태 표시 */}
        {isMatching && (
          <div className="status-indicator matching">
            {AppStrings.MAINPAGE_MATCHING_IN_PROGRESS}
          </div>
        )}
        
        {/* 매칭된 경우 채팅방으로 이동하는 버튼 표시 */}
        {matchedRoomId && (
          <button
            className={styles.actionButton}
            onClick={onMatchButtonClick}
            disabled={isLoadingRoomStatus}
          >
            {AppStrings.MAINPAGE_GO_TO_CHATROOM_BUTTON}
          </button>
        )}
      </div>
      
      {/* 오류 메시지 표시 */}
      {matchError && <p className={styles.errorMessage}>{matchError}</p>}
      
      {/* 크레딧 상태 표시 - 부족한 경우에만 */}
      {!hasSufficientCredit && !isCreditLoading && (
        <p className={styles.creditInfo}>
          현재 크레딧: {profile?.credit || 0} / 필요 크레딧: {REQUIRED_MATCHING_CREDIT}
        </p>
      )}
    </section>
  );
});

export default MaleMatchingBox; 