import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import styles from './MainPage.module.css';
import { UserProfile, userApi } from '../../api';
import * as AppStrings from '../../constants/strings';
import { usePayment } from '../../contexts/PaymentContext';
import { useCredit } from '../../contexts/CreditContext';
import { CREDIT_MESSAGES } from '../../constants/credits';
import './Switch.css';
import { useCreditCheck } from '../../hooks/useCreditCheck';
import type { Socket } from 'socket.io-client';

// UI strings
const MALE_SWITCH_LABEL = '자동 매칭 활성화';
const CREDIT_INSUFFICIENT = '크레딧 부족';

// 매칭에 필요한 크레딧
const REQUIRED_MATCHING_CREDIT = 10;

// 자동 매칭 내부 플래그 (결제 모달 표시 여부)
const AUTO_MATCH_INIT_KEY = 'autoMatchInitialized';

// --- 남성용 매칭 박스 Props 정의 ---
interface MaleMatchingBoxProps {
  profile: UserProfile;
  isMatching: boolean;
  isButtonDisabled: boolean;
  matchedRoomId: string | null;
  buttonText: string;
  isLoadingRoomStatus: boolean;
  matchSocket: Socket | null;
  matchError: string | null;
  setMatchError: (error: string | null) => void;
  setIsMatching: (isMatching: boolean) => void;
  onMatchButtonClick: () => void;
  onCreditUpdate: () => Promise<void>;
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
  onCreditUpdate
}) => {
  const [isAutoMatchEnabled, setIsAutoMatchEnabled] = useState<boolean>(false);
  // 상태 변경 디바운싱을 위한 레퍼런스
  const lastStatusCheckRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  
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
    
    if (isInsufficientCredit() && isAutoMatchEnabled) {
      // 크레딧 부족하면 자동 매칭 비활성화하고 에러 표시
      setIsAutoMatchEnabled(false);
      localStorage.setItem('isAutoMatchEnabled', 'false');
      setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
    }
    
    console.log(`[MaleMatchingBox] Credit status updated - Current: ${currentCredit}, Required: ${REQUIRED_MATCHING_CREDIT}`);
  }, [profile?.credit, isInsufficientCredit, isAutoMatchEnabled, setMatchError, hasSufficientCredit]);
  
  // 초기 자동 매칭 상태 설정 - 한 번만 실행되도록 의존성 최적화
  useEffect(() => {
    if (profile?.id) {  // profile이 로드되었는지 확인
      // 로컬 스토리지에서 자동 매칭 상태 확인
      const savedAutoMatchState = localStorage.getItem('isAutoMatchEnabled') === 'true';
      // 현재 크레딧 기반으로 자동 매칭 활성화 결정 (로컬스토리지 값 + 크레딧 충분)
      const shouldEnableAutoMatch = savedAutoMatchState && hasSufficientCredit;
      
      setIsAutoMatchEnabled(shouldEnableAutoMatch);
      console.log(`[MaleMatchingBox] Initial auto match state: ${shouldEnableAutoMatch} (saved: ${savedAutoMatchState}, sufficient: ${hasSufficientCredit})`);
    }
  }, [profile?.id, hasSufficientCredit]); // profile 전체 대신 profile.id만 의존성으로 사용
  
  // 소켓 이벤트 설정 - 의존성 최적화
  useEffect(() => {
    if (!matchSocket?.connected) return;
    
    console.log('[MaleMatchingBox] Setting up socket event listeners');
    
    // 이벤트 핸들러 정의
    const handleMatchError = (errorData: { message: string }) => {
      console.error('[MaleMatchingBox] Match error from server:', errorData.message);
      
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
      setIsMatching(false);
      setMatchError(null);
    };
    
    const handleMatchStatus = (data: { isMatching: boolean, userId: string }) => {
      // 서버 상태에 따라 클라이언트 상태 업데이트 (불필요한 로그 제거)
      setIsMatching(data.isMatching);
    };
    
    const handleToggleResult = (result: { success: boolean, isMatching: boolean, message: string }) => {
      // 성공 시 상태 업데이트
      if (result.success) {
        setIsMatching(result.isMatching);
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
        setMatchError(result.message);
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
  }, [matchSocket?.connected, setMatchError, setIsMatching, refreshCredit, onCreditUpdate]); // 소켓 객체 자체가 아닌 connected 상태에만 의존

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
      
      // 로컬 스토리지에서 자동 매칭 설정 가져오기
      const shouldAutoMatch = localStorage.getItem('isAutoMatchEnabled') === 'true';
      
      // 자동 매칭 상태 업데이트
      if (shouldAutoMatch !== isAutoMatchEnabled) {
        setIsAutoMatchEnabled(shouldAutoMatch);
      }
      
      // 크레딧 부족한 경우 자동 매칭 비활성화
      if (shouldAutoMatch && !hasSufficientCredit) {
        setIsAutoMatchEnabled(false);
        localStorage.setItem('isAutoMatchEnabled', 'false');
        setMatchError(CREDIT_INSUFFICIENT);
        
        // 현재 매칭 중이면 취소
        if (isMatching) {
          matchSocket.emit('cancel_match');
        }
        
        return;
      }
      
      // 채팅방이 없고, 매칭 중이 아니고, 자동 매칭이 활성화되어 있으면 매칭 시작
      if (shouldAutoMatch && hasSufficientCredit && !isMatching && !matchedRoomId) {
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
    isAutoMatchEnabled, 
    hasSufficientCredit, 
    checkMatchStatusAndStart, 
    setMatchError,
    refreshCredit
  ]);
  
  // 자동 매칭 토글 시 처리 - useCallback으로 메모이제이션
  const handleToggleAutoMatch = useCallback(() => {
    // 크레딧 충분한지 먼저 확인
    if (!isAutoMatchEnabled && !hasSufficientCredit) {
      console.log('[MaleMatchingBox] Cannot enable auto match: insufficient credit');
      setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
      return; // 크레딧 부족 시 토글 안됨
    }
    
    const newState = !isAutoMatchEnabled;
    console.log(`[MaleMatchingBox] Auto match toggled to: ${newState}`);
    
    // 로컬 스토리지에 자동 매칭 상태 저장
    localStorage.setItem('isAutoMatchEnabled', newState ? 'true' : 'false');
    
    // 서버에 토글 상태 변경 이벤트 전송
    if (matchSocket?.connected) {
      console.log('[MaleMatchingBox] Sending toggle_match event to server:', newState);
      
      // 토글 이벤트 전송 (새로운 방식)
      matchSocket.emit('toggle_match', {
        isEnabled: newState,
        gender: profile?.gender || 'MALE'
      });
      
      // 상태 변경은 서버에서 받는 응답에 따라 처리됨
    } else {
      console.error('[MaleMatchingBox] Cannot toggle match: socket not connected');
      setMatchError('서버에 연결되어 있지 않습니다');
    }
    
    // 로컬 UI 즉시 업데이트 (서버 응답을 기다리지 않고)
    setIsAutoMatchEnabled(newState);
  }, [isAutoMatchEnabled, hasSufficientCredit, matchSocket?.connected, profile?.gender, setMatchError]);

  // 자동 매칭 스위치 비활성화 조건 - useMemo로 메모이제이션
  const isToggleDisabled = useMemo(() => (
    isButtonDisabled || 
    !matchSocket?.connected || 
    isLoadingRoomStatus || 
    (!isAutoMatchEnabled && !hasSufficientCredit) ||
    isCreditLoading
  ), [
    isButtonDisabled, 
    matchSocket?.connected, 
    isLoadingRoomStatus, 
    isAutoMatchEnabled, 
    hasSufficientCredit,
    isCreditLoading
  ]);

  return (
    <section className={styles.contentBox}>
      <div className={styles.profileHeader}>
        <span className={styles.profileTitle}>{`${AppStrings.MAINPAGE_PROFILE_TITLE_PREFIX}${profile.nickname}${AppStrings.MAINPAGE_PROFILE_TITLE_SUFFIX}`}</span>
        <span className={styles.statusBadge}>{profile.isActive ? AppStrings.MAINPAGE_STATUS_ACTIVE : '비활성'}</span>
      </div>
      
      {/* 남성 사용자용 UI - 스위치 방식 */}
      <div className="switch-container">
        <label className="switch-label">
          {MALE_SWITCH_LABEL}
        </label>
        <div className={`toggle-switch ${isAutoMatchEnabled ? 'active' : ''}`}>
          <input
            type="checkbox"
            checked={isAutoMatchEnabled}
            onChange={handleToggleAutoMatch}
            disabled={isToggleDisabled}
            className="toggle-switch-checkbox"
            id="matchSwitch"
          />
          <label className="toggle-switch-label" htmlFor="matchSwitch">
            <span className="toggle-switch-inner"></span>
            <span className="toggle-switch-switch"></span>
          </label>
        </div>
        
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