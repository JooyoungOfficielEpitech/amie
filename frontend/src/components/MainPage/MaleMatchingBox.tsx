import React, { useEffect, useState, useCallback } from 'react';
import styles from './MainPage.module.css';
import { UserProfile, userApi } from '../../api';
import * as AppStrings from '../../constants/strings';
import { usePayment } from '../../contexts/PaymentContext';
import { useCredit } from '../../contexts/CreditContext';
import { CREDIT_MESSAGES } from '../../constants/credits';
import './Switch.css';

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
  matchSocket: any;
  matchError: string | null;
  setMatchError: (error: string | null) => void;
  setIsMatching: (isMatching: boolean) => void;
  onMatchButtonClick: () => void;
  onCreditUpdate: () => Promise<void>;
}

const MaleMatchingBox: React.FC<MaleMatchingBoxProps> = ({
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
  // usePayment 훅 사용
  const { requestMatchPayment } = usePayment();
  
  // useCredit 훅 사용
  const { use, credit: currentCredit } = useCredit(); // credit 값 직접 구독
  
  // 자동 매칭 상태
  const [isAutoMatchEnabled, setIsAutoMatchEnabled] = useState<boolean>(false);
  
  // 자동 매칭 초기화 여부
  const [isAutoMatchInitialized, setIsAutoMatchInitialized] = useState<boolean>(false);

  // 크레딧 부족 상태 추적
  const [isInsufficientCredit, setIsInsufficientCredit] = useState<boolean>(false);

  // 현재 크레딧으로 매칭 가능 여부 확인
  const hasSufficientCredit = useCallback(() => {
    return currentCredit >= REQUIRED_MATCHING_CREDIT;
  }, [currentCredit]);

  // 크레딧 상태 변화 감지 및 UI 업데이트
  useEffect(() => {
    const isSufficient = hasSufficientCredit();
    
    // 프로필의 크레딧과 CreditContext의 크레딧이 다를 수 있으므로 로그로 기록
    if (profile && profile.credit !== currentCredit) {
      console.log(`[MaleMatchingBox] Credit mismatch detected - Profile: ${profile.credit}, Context: ${currentCredit}`);
      // 차이가 있다면 프로필의 크레딧보다 CreditContext의 크레딧을 신뢰
    }
    
    // 크레딧 상태 변화 시 오류 메시지 처리
    if (isSufficient && isInsufficientCredit) {
      console.log('[MaleMatchingBox] Credit is now sufficient, clearing error message');
      setMatchError(null);
      setIsInsufficientCredit(false);
    } else if (!isSufficient && !isInsufficientCredit) {
      console.log('[MaleMatchingBox] Insufficient credit detected');
      setIsInsufficientCredit(true);
      // 자동 매칭 활성화 상태인 경우만 오류 메시지 표시
      if (isAutoMatchEnabled) {
        setMatchError(CREDIT_INSUFFICIENT);
      }
    }
    
    // 프로필 정보와 크레딧 정보가 일치하지 않을 수 있으므로, 
    // 자동 매칭 상태도 현재 크레딧에 맞게 조정
    if (isAutoMatchEnabled && !isSufficient) {
      console.log('[MaleMatchingBox] Disabling auto matching due to insufficient credit');
      localStorage.setItem('isAutoMatchEnabled', 'false');
      setIsAutoMatchEnabled(false);
    }
    
    console.log(`[MaleMatchingBox] Credit status updated - Current: ${currentCredit}, Required: ${REQUIRED_MATCHING_CREDIT}`);
  }, [currentCredit, hasSufficientCredit, isInsufficientCredit, isAutoMatchEnabled, setMatchError, profile]);
  
  // 초기 자동 매칭 상태 설정
  useEffect(() => {
    if (profile) {
      // 로컬 스토리지에서 자동 매칭 상태 확인
      const savedAutoMatchState = localStorage.getItem('isAutoMatchEnabled') === 'true';
      // 현재 크레딧 기반으로 자동 매칭 활성화 결정 (로컬스토리지 값 + 크레딧 충분)
      const shouldEnableAutoMatch = savedAutoMatchState && hasSufficientCredit();
      
      setIsAutoMatchEnabled(shouldEnableAutoMatch);
      console.log(`[MaleMatchingBox] Initial auto match state: ${shouldEnableAutoMatch} (saved: ${savedAutoMatchState}, sufficient: ${hasSufficientCredit()})`);
    }
  }, [profile, hasSufficientCredit]);
  
  // 주요 소켓 이벤트 처리를 담당하는 useEffect
  useEffect(() => {
    if (!matchSocket) return;
    
    console.log('[MaleMatchingBox] Setting up socket event listeners');
    
    // 매칭 오류 핸들러 - 중복 등록 방지를 위해 먼저 모든 리스너 제거
    matchSocket.off('match_error');
    matchSocket.on('match_error', (errorData: { message: string }) => {
      console.error('[MaleMatchingBox] Match error from server:', errorData.message);
      
      // "이미 매칭 중" 오류는 단순히 상태 동기화로 처리
      if (errorData.message.includes('이미') && errorData.message.includes('대기')) {
        console.log('[MaleMatchingBox] Already in matching queue according to server, updating UI');
        // 프론트엔드 상태를 서버 상태와 동기화
        setIsMatching(true);
        // 경고 메시지 숨김 (실제 오류 상황이 아님)
        setMatchError(null);
      } else {
        // 다른 오류는 정상적으로 표시
        setMatchError(errorData.message);
      }
    });
    
    // 매칭 취소 성공 핸들러
    matchSocket.off('match_cancelled');
    matchSocket.on('match_cancelled', () => {
      console.log('[MaleMatchingBox] Match cancelled by server');
      setIsMatching(false);
      setMatchError(null);
    });
    
    // 매칭 상태 업데이트 핸들러
    matchSocket.off('current_match_status');
    matchSocket.on('current_match_status', (data: { isMatching: boolean }) => {
      console.log('[MaleMatchingBox] Received match status update:', data);
      // 서버 상태에 따라 클라이언트 상태 업데이트
      setIsMatching(data.isMatching);
      // 스위치 상태는 자동 매칭 활성화 상태와 별개로 관리
      // (자동 매칭은 끌 수 있어도 매칭 자체는 서버 상태에 따라 유지)
    });
    
    // 매칭 성공 핸들러는 MainPage에서 처리
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      console.log('[MaleMatchingBox] Cleaning up socket event listeners');
      matchSocket.off('match_error');
      matchSocket.off('match_cancelled');
      matchSocket.off('current_match_status');
    };
  }, [matchSocket, setMatchError, setIsMatching]);

  // 매칭 상태 확인 후 안전하게 매칭 시작하는 Promise 기반 함수
  const checkMatchStatusAndStart = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!matchSocket) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      console.log('[MaleMatchingBox] Checking match status before start');
      
      // 혹시 모를 이전 리스너 제거
      matchSocket.off('current_match_status_response');
      matchSocket.off('match_error_for_check');
      
      // 매칭 상태 확인용 일회성 리스너
      matchSocket.once('current_match_status', (data: { isMatching: boolean }) => {
        console.log('[MaleMatchingBox] Received match status for check:', data);
        
        // 이미 매칭 중이면 상태만 동기화하고 종료
        if (data.isMatching) {
          console.log('[MaleMatchingBox] Already in matching state according to server, just syncing');
          setIsMatching(true); // 프론트엔드 상태 동기화
          resolve(); // 추가 작업 없이 종료
          return;
        }
        
        // 매칭 중이 아니면 매칭 시작 (이 요청에 대한 에러 처리를 위한 일회성 리스너 등록)
        console.log('[MaleMatchingBox] Not in matching state, safe to start match');
        
        // 매칭 시작 요청에 대한 오류 처리 (일회성)
        matchSocket.once('match_error', (errorData: { message: string }) => {
          // 오류 메시지가 "이미 매칭 중"인 경우 정상 종료 처리
          if (errorData.message.includes('이미') && errorData.message.includes('대기')) {
            console.log('[MaleMatchingBox] Already in queue according to server response');
            setIsMatching(true);
            resolve();
          } else {
            console.error('[MaleMatchingBox] Error starting match:', errorData.message);
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
      
      // 타임아웃 설정 (3초)
      setTimeout(() => {
        console.log('[MaleMatchingBox] Status check timed out, proceeding with match');
        
        // 일회성 리스너 제거
        matchSocket.off('current_match_status');
        
        // 매칭 시작 시도
        setIsMatching(true);
        matchSocket.emit('start_match');
        resolve();
      }, 3000);
      
      // 상태 확인 요청
      matchSocket.emit('check_match_status');
    });
  };

  // 자동 매칭 처리 및 크레딧 확인 useEffect
  useEffect(() => {
    if (!matchSocket || !profile) {
      return;
    }
    
    // 연결 시 현재 매칭 상태 요청
    if (matchSocket && matchSocket.connected) {
      console.log('[MaleMatchingBox] Requesting current match status');
      matchSocket.emit('check_match_status');
    }
    
    // 매칭 시도 관련 상태
    let matchingInProgress = false;
    let lastMatchAttemptTime = 0;
    
    // 주기적으로 프로필과 매칭 상태를 확인하고 자동 매칭 처리
    const checkProfileAndMatch = async () => {
      try {
        // 이미 처리 중이면 스킵
        if (matchingInProgress) {
          console.log('[MaleMatchingBox] Matching process already in progress, skipping check');
          return;
        }
        
        // 마지막 매칭 시도 후 60초 이내인 경우 스킵 (재시도 간격 확대)
        const now = Date.now();
        const timeSinceLastAttempt = now - lastMatchAttemptTime;
        if (lastMatchAttemptTime > 0 && timeSinceLastAttempt < 60000) {
          console.log(`[MaleMatchingBox] Skipping check, last attempt was ${Math.round(timeSinceLastAttempt/1000)}s ago`);
          return;
        }
        
        // 프로필 정보 갱신 (크레딧 확인)
        matchingInProgress = true;
        const profileResponse = await userApi.getProfile();
        
        if (!profileResponse.success || !profileResponse.user) {
          console.error("[MaleMatchingBox] Failed to get profile for auto match check");
          matchingInProgress = false;
          return;
        }
        
        const currentUser = profileResponse.user;
        const hasSufficientCredit = currentUser.credit >= REQUIRED_MATCHING_CREDIT;
        
        // 로컬 스토리지에서 자동 매칭 설정 가져오기
        const shouldAutoMatch = localStorage.getItem('isAutoMatchEnabled') === 'true';
        
        // 자동 매칭 상태 업데이트
        if (shouldAutoMatch !== isAutoMatchEnabled) {
          setIsAutoMatchEnabled(shouldAutoMatch);
        }
        
        // 크레딧 부족한 경우 자동 매칭 비활성화
        if (shouldAutoMatch && !hasSufficientCredit) {
          console.log('[MaleMatchingBox] Insufficient credit, disabling auto matching');
          setIsAutoMatchEnabled(false);
          localStorage.setItem('isAutoMatchEnabled', 'false');
          setMatchError(CREDIT_INSUFFICIENT);
          
          // 현재 매칭 중이면 취소
          if (isMatching) {
            matchSocket.emit('cancel_match');
          }
          
          matchingInProgress = false;
          return;
        }
        
        // 이미 매칭이 진행 중이거나, 채팅방이 있는 경우 새로운 매칭 시도 안함
        if (isMatching || currentUser.matchedRoomId || currentUser.isWaitingForMatch) {
          console.log('[MaleMatchingBox] Already in matching state or has matched room, skip auto matching');
          // 프론트엔드 상태 동기화
          if (currentUser.isWaitingForMatch && !isMatching) {
            setIsMatching(true);
          }
          
          matchingInProgress = false;
          return;
        }
        
        // 채팅방이 없고, 매칭 중이 아니고, 자동 매칭이 활성화되어 있으면 매칭 시작
        if (shouldAutoMatch && hasSufficientCredit && !isMatching && !currentUser.matchedRoomId) {
          console.log('[MaleMatchingBox] Auto matching condition met, checking server state');
          
          // 매칭 시도 타임스탬프 기록
          lastMatchAttemptTime = Date.now();
          
          // 초기화 여부 확인 (첫 스위치 ON 이후 매칭인지)
          const isInitialized = localStorage.getItem(AUTO_MATCH_INIT_KEY) === 'true';
          
          try {
            // Promise 기반 순차 처리: 상태 확인 후 안전하게 매칭 시작
            await checkMatchStatusAndStart();
            
            // 첫 매칭이면 초기화 플래그 설정
            if (!isInitialized) {
              localStorage.setItem(AUTO_MATCH_INIT_KEY, 'true');
              console.log('[MaleMatchingBox] Auto matching initialized');
            }
            
            console.log('[MaleMatchingBox] Auto matching process completed');
            
            // 크레딧 정보 업데이트
            if (onCreditUpdate) {
              await onCreditUpdate().catch(err => {
                console.error('[MaleMatchingBox] Error updating credit after match start:', err);
              });
            }
          } catch (error) {
            console.error('[MaleMatchingBox] Error in auto matching process:', error);
          }
        }
      } catch (error) {
        console.error('[MaleMatchingBox] Error in checkProfileAndMatch:', error);
      } finally {
        // 처리 완료 플래그
        matchingInProgress = false;
      }
    };
    
    // 초기 실행
    checkProfileAndMatch();
    
    // 주기적으로 실행 (60초마다 - 훨씬 긴 간격으로 수정)
    const interval = setInterval(checkProfileAndMatch, 60000);
    
    return () => clearInterval(interval);
  }, [matchSocket, profile, isMatching, isAutoMatchEnabled, requestMatchPayment, use, onCreditUpdate, setIsMatching, setMatchError]);
  
  // 매칭 취소 요청 함수
  async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!matchSocket) {
        console.error('[MaleMatchingBox] Cannot cancel match: socket not connected');
        resolve(false);
        return;
      }
      
      console.log('[MaleMatchingBox] Requesting to cancel match before auto re-matching');
      
      // 취소 요청 타임아웃
      const timeoutId = setTimeout(() => {
        console.log('[MaleMatchingBox] Cancel match request timed out');
        resolve(false);
      }, 3000);
      
      // 취소 성공 이벤트 리스너
      const cancelSuccessListener = () => {
        console.log('[MaleMatchingBox] Match cancelled successfully before auto re-matching');
        clearTimeout(timeoutId);
        matchSocket.off('match_cancelled', cancelSuccessListener);
        matchSocket.off('cancel_error', cancelErrorListener);
        resolve(true);
      };
      
      // 취소 실패 이벤트 리스너
      const cancelErrorListener = (data: any) => {
        console.error('[MaleMatchingBox] Failed to cancel match before auto re-matching:', data.message);
        clearTimeout(timeoutId);
        matchSocket.off('match_cancelled', cancelSuccessListener);
        matchSocket.off('cancel_error', cancelErrorListener);
        resolve(false);
      };
      
      // 이벤트 리스너 등록
      matchSocket.on('match_cancelled', cancelSuccessListener);
      matchSocket.on('cancel_error', cancelErrorListener);
      
      // 취소 요청 전송
      matchSocket.emit('cancel_match');
    });
  };
  
  // 자동 매칭 토글 시 처리
  const handleToggleAutoMatch = () => {
    // 크레딧 충분한지 먼저 확인
    if (!isAutoMatchEnabled && !hasSufficientCredit()) {
      console.log('[MaleMatchingBox] Cannot enable auto match: insufficient credit');
      setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
      return; // 크레딧 부족 시 토글 안됨
    }
    
    const newState = !isAutoMatchEnabled;
    console.log(`[MaleMatchingBox] Auto match toggled to: ${newState}`);
    
    // 로컬 스토리지에 자동 매칭 상태 저장
    localStorage.setItem('isAutoMatchEnabled', newState ? 'true' : 'false');
    
    // 스위치를 끄는 경우: 현재 매칭 중이면 매칭 취소 요청
    if (!newState && isMatching) {
      console.log('[MaleMatchingBox] Switch turned OFF - Canceling match...');
      if (matchSocket) {
        matchSocket.emit('cancel_match');
        // 상태 업데이트는 cancel_match 이벤트 응답에서 처리됨
      }
    }
    // 스위치를 켜는 경우: 초기화 및 매칭 시작
    else if (newState && !isAutoMatchInitialized) {
      // 처음 켤 때만 즉시 매칭 시작 및 초기화 표시
      setIsAutoMatchInitialized(true);
      
      if (!isMatching && !matchedRoomId) {
        checkMatchStatusAndStart(); // 안전한 매칭 시작 함수 호출
      }
    }
    
    setIsAutoMatchEnabled(newState);
    
    // 오류 메시지 초기화
    if (newState) {
      setMatchError(null);
    }
  };

  // 자동 매칭 스위치 비활성화 조건
  const isToggleDisabled = 
    isButtonDisabled || 
    !matchSocket || 
    isLoadingRoomStatus || 
    (!isAutoMatchEnabled && !hasSufficientCredit()); // 켜져있지 않은 상태에서 크레딧 부족시 비활성화

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
    </section>
  );
};

export default MaleMatchingBox; 