import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useCredit } from './contexts/CreditContext';
import App from './App';

const AuthAwareApp: React.FC = () => {
  const { isLoggedIn, verifyToken, isTokenVerified } = useAuth();
  const { credit, loading: creditLoading } = useCredit();
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationAttempted, setVerificationAttempted] = useState<boolean>(false);
  const [allDataReady, setAllDataReady] = useState<boolean>(false);

  // 토큰 검증 처리
  useEffect(() => {
    const verifyAuthentication = async () => {
      // 로그인 상태이고 토큰 검증이 아직 수행되지 않은 경우에만 실행
      if (isLoggedIn && !isTokenVerified && !isVerifying) {
        console.log('[AuthAwareApp] 로그인 상태이지만 토큰 검증이 필요함');
        setIsVerifying(true);
        
        try {
          const isValid = await verifyToken();
          console.log('[AuthAwareApp] 토큰 검증 결과:', isValid);
        } catch (error) {
          console.error('[AuthAwareApp] 토큰 검증 중 오류:', error);
        } finally {
          setIsVerifying(false);
          setVerificationAttempted(true);
        }
      } else if (!isLoggedIn) {
        // 로그인 상태가 아니면 검증 시도 표시만 업데이트
        setVerificationAttempted(true);
        setAllDataReady(true); // 로그인 안 된 상태면 모든 데이터 준비 완료로 간주
      }
    };

    verifyAuthentication();
  }, [isLoggedIn, isTokenVerified, isVerifying, verifyToken]);

  // 모든 필수 데이터가 로드됐는지 확인
  useEffect(() => {
    if (isLoggedIn && isTokenVerified) {
      console.log('[AuthAwareApp] 토큰 검증 완료, 크레딧 데이터 확인 중:', credit);
      
      // 크레딧 값이 유효하고 로딩중이 아닌 경우
      if (credit !== undefined && credit !== null && !creditLoading) {
        console.log('[AuthAwareApp] 모든 데이터 준비 완료, 앱 렌더링');
        setAllDataReady(true);
      } else {
        console.log('[AuthAwareApp] 크레딧 데이터 로딩 중 또는 아직 유효하지 않음');
      }
    }
  }, [isLoggedIn, isTokenVerified, credit, creditLoading]);

  // 로그인 안했거나 모든 데이터가 준비된 경우에만 App 렌더링
  if (!isLoggedIn || allDataReady) {
    return <App />;
  }

  // 검증이 끝났지만 데이터가 아직 준비되지 않았을 경우 더 상세한 로딩 상태 표시
  if (verificationAttempted && !allDataReady) {
    return (
      <div className="auth-verification-loading">
        <p>데이터 로딩 중...</p>
        <p><small>잠시만 기다려주세요...</small></p>
      </div>
    );
  }

  // 토큰 검증 중일 때 기본 로딩 표시
  return (
    <div className="auth-verification-loading">
      <p>인증 확인 중...</p>
    </div>
  );
};

export default AuthAwareApp; 