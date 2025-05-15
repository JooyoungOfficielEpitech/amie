import { useState, useEffect, useCallback, useRef } from 'react';
import { useCredit } from '../contexts/CreditContext';
import { UserProfile } from '../api';

type CreditCheckResult = {
  hasSufficientCredit: boolean;
  isLoading: boolean;
  error: string | null;
  refreshCredit: () => Promise<void>;
};

/**
 * 크레딧 잔액을 확인하고 특정 서비스에 대한 충분한 크레딧이 있는지 확인하는 훅
 * 
 * @param profile 사용자 프로필 객체
 * @param requiredAmount 필요한 크레딧 양
 * @param serviceType 서비스 유형 (매칭, 프로필 열람 등)
 * @returns {CreditCheckResult} 크레딧 확인 결과와 상태
 */
export function useCreditCheck(
  profile: UserProfile | null,
  requiredAmount: number,
  serviceType: 'matching' | 'profile_unlock' | 'other' = 'other'
): CreditCheckResult {
  // 상태
  const [hasSufficientCredit, setHasSufficientCredit] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Context에서 크레딧 정보 가져오기
  const creditContext = useCredit();
  const credit = creditContext?.credit || 0;
  const fetchCredit = creditContext?.fetchCredit;
  const contextLoading = creditContext?.loading || false;
  
  // 마지막 확인 시간 추적
  const lastCheckTimeRef = useRef<number>(0);
  
  // 크레딧 갱신 함수 - useCallback으로 최적화
  const refreshCredit = useCallback(async () => {
    if (typeof fetchCredit !== 'function') {
      console.error('[useCreditCheck] fetchCredit is not a function');
      setError('크레딧 정보를 가져오는데 실패했습니다.');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 마지막 갱신 시간 확인 (2초 이내 중복 요청 방지)
      const now = Date.now();
      if (now - lastCheckTimeRef.current < 2000) {
        console.log('[useCreditCheck] Skipping refresh, checked recently');
        return;
      }
      
      await fetchCredit();
      lastCheckTimeRef.current = now;
      
      console.log(`[useCreditCheck] Credit refreshed for ${serviceType}: ${credit}`);
    } catch (err: any) {
      setError(err.message || '크레딧 정보를 가져오는데 실패했습니다.');
      console.error('[useCreditCheck] Error refreshing credit:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCredit, credit, serviceType]);
  
  // 프로필 또는 크레딧 변경 시 크레딧 충분성 확인
  useEffect(() => {
    // 프로필이나 크레딧 중 하나라도 없으면 계산 불가
    if (!profile) {
      setHasSufficientCredit(false);
      setIsLoading(contextLoading);
      return;
    }
    
    // 프로필에서 크레딧 또는 Context의 크레딧 사용 (둘 중 더 최신 정보)
    // profile.credit은 항상 숫자로 변환 (가끔 문자열로 전달됨)
    let profileCredit = 0;
    
    if (typeof profile.credit === 'number') {
      profileCredit = profile.credit;
    } else if (profile.credit) {
      // 문자열이나 다른 타입이 들어오면 안전하게 변환
      try {
        profileCredit = parseInt(String(profile.credit), 10) || 0;
      } catch (e) {
        console.error('[useCreditCheck] Failed to parse profile credit:', profile.credit);
        profileCredit = 0;
      }
    }
    
    const currentCredit = Math.max(profileCredit, credit || 0); // 둘 중 더 큰 값 사용 (최신값)
    
    // 요구 크레딧 이상인지 확인
    const hasEnoughCredit = currentCredit >= requiredAmount;
    setHasSufficientCredit(hasEnoughCredit);
    
    console.log(`[useCreditCheck] Credit check for ${serviceType}: ${currentCredit}/${requiredAmount} (${hasEnoughCredit ? 'sufficient' : 'insufficient'})`);
    
    // 로딩 상태 업데이트
    setIsLoading(false);
  }, [profile, credit, requiredAmount, contextLoading, serviceType]);
  
  // 초기 로딩 시 크레딧 갱신
  useEffect(() => {
    if (profile?.id && typeof fetchCredit === 'function') {
      refreshCredit();
    }
  }, [profile?.id, refreshCredit, fetchCredit]);
  
  return {
    hasSufficientCredit,
    isLoading,
    error,
    refreshCredit,
  };
} 