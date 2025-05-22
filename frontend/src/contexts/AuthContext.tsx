import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { userApi } from '../api';

export interface AuthContextType {
  isLoggedIn: boolean;
  token: string | null;
  userId: string | null;
  login: (token: string) => void;
  logout: () => void;
  refreshUserInfo: () => Promise<void>;
  verifyToken: () => Promise<boolean>;
  isTokenVerified: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  token: null,
  userId: null,
  login: () => {},
  logout: () => {},
  refreshUserInfo: async () => {},
  verifyToken: async () => false,
  isTokenVerified: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTokenVerified, setIsTokenVerified] = useState<boolean>(false);
  
  // 요청 상태 추적을 위한 참조 변수
  const isRefreshingRef = useRef<boolean>(false);
  const lastRefreshTimeRef = useRef<number>(0);

  // 컴포넌트 마운트 시 로컬 스토리지에서 토큰 확인
  useEffect(() => {
    // 토큰 확인 - 통일된 방식으로 accessToken만 사용
    const storedToken = localStorage.getItem('accessToken');
    
    if (storedToken) {
      // 토큰 저장 및 로그인 상태 설정
      setToken(storedToken);
      setIsLoggedIn(true);
      
      // 토큰이 있으면 사용자 정보 가져오기
      refreshUserInfo();
    }
  }, []);

  // 사용자 정보 업데이트 함수
  const refreshUserInfo = useCallback(async () => {
    // 토큰 유효성 검사 먼저 수행
    const accessToken = localStorage.getItem('accessToken');
    
    if (!accessToken) {
      return;
    }
    
    // 이미 요청 중이면 무시
    if (isRefreshingRef.current) {
      return;
    }
    
    // 3초 이내에 이미 갱신한 경우 스킵
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 3000) {
      return;
    }
    
    isRefreshingRef.current = true;
    
    try {
      const profileResponse = await userApi.getProfile();
      lastRefreshTimeRef.current = now;
      
      if (profileResponse.success && profileResponse.user) {
        setUserId(profileResponse.user.id);
      } else {
        console.error('[AuthContext] Failed to get user profile:', profileResponse.message);
        
        // 오류가 토큰 만료 또는 인증 오류인 경우 자동 로그아웃
        if (profileResponse.message?.includes('인증') || profileResponse.message?.includes('만료') || 
            profileResponse.message?.includes('auth') || profileResponse.message?.includes('expired')) {
          logout();
        }
      }
    } catch (error: any) {
      console.error('[AuthContext] Error fetching user profile:', error);
      
      // 401 오류시 자동 로그아웃
      if (error.status === 401 || error.message?.includes('unauthorized')) {
        logout();
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // 로그인 처리 함수
  const login = useCallback((newToken: string) => {
    // 'Bearer ' 접두사가 있으면 제거
    let processedToken = newToken;
    if (processedToken.startsWith('Bearer ')) {
      processedToken = processedToken.substring(7);
    }
    
    // JSON 문자열 형태인 경우 추출
    try {
      const tokenObj = JSON.parse(processedToken);
      if (tokenObj.token || tokenObj.accessToken) {
        processedToken = tokenObj.token || tokenObj.accessToken;
      }
    } catch (e) {
      // JSON이 아니면 그대로 사용
    }
    
    // 확실하게 localStorage 비우고 시작
    localStorage.clear();
    
    // 새 표준 키에 저장
    localStorage.setItem('accessToken', processedToken);
    
    setToken(processedToken);
    setIsLoggedIn(true);
    
    // 로그인 시 사용자 정보 가져오기
    refreshUserInfo();
  }, [refreshUserInfo]);

  // 로그아웃 처리 함수
  const logout = useCallback(() => {
    // 토큰 제거 (통일된 방식)
    localStorage.removeItem('accessToken');
    
    // 모든 localStorage 항목 제거 (완전 초기화)
    localStorage.clear();
    
    setToken(null);
    setUserId(null);
    setIsLoggedIn(false);
  }, []);

  // 토큰 검증 함수
  const verifyToken = useCallback(async (): Promise<boolean> => {
    try {
      // 실제 검증 로직: 서버에 요청하여 토큰 유효성 확인
      const response = await userApi.getProfile();
      const isValid = response.success;
      
      setIsTokenVerified(isValid);
      
      if (!isValid) {
        // 토큰이 유효하지 않으면 로그아웃
        logout();
      }
      
      return isValid;
    } catch (error) {
      console.error("[AuthContext] Token verification failed:", error);
      setIsTokenVerified(false);
      logout();
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        token,
        userId,
        login,
        logout,
        refreshUserInfo,
        verifyToken,
        isTokenVerified
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 