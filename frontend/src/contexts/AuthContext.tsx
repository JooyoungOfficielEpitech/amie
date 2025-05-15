import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { userApi } from '../api';

export interface AuthContextType {
  isLoggedIn: boolean;
  token: string | null;
  userId: string | null;
  login: (token: string) => void;
  logout: () => void;
  refreshUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  token: null,
  userId: null,
  login: () => {},
  logout: () => {},
  refreshUserInfo: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // 요청 상태 추적을 위한 참조 변수
  const isRefreshingRef = useRef<boolean>(false);
  const lastRefreshTimeRef = useRef<number>(0);

  // 컴포넌트 마운트 시 로컬 스토리지에서 토큰 확인
  useEffect(() => {
    console.log('[App isLoggedIn] Checking auth state...');
    
    // 토큰 확인 - 'token'과 'accessToken' 둘 다 확인
    const storedToken = localStorage.getItem('accessToken');
    const legacyToken = localStorage.getItem('token');
    
    if (storedToken) {
      // 새 토큰 형식 사용
      setToken(storedToken);
      setIsLoggedIn(true);
      console.log('[App isLoggedIn] is true, fetching user credit.');
      
      // 토큰이 있으면 사용자 정보 가져오기
      refreshUserInfo();
    } else if (legacyToken) {
      // 레거시 토큰이 있으면 새 형식으로 마이그레이션
      localStorage.setItem('accessToken', legacyToken);
      localStorage.removeItem('token');
      
      setToken(legacyToken);
      setIsLoggedIn(true);
      console.log('[App isLoggedIn] Legacy token migrated, fetching user info.');
      
      // 토큰이 있으면 사용자 정보 가져오기
      refreshUserInfo();
    }
  }, []);

  // 사용자 정보 업데이트 함수
  const refreshUserInfo = useCallback(async () => {
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
        console.log('[AuthContext] User info refreshed, userId:', profileResponse.user.id);
      } else {
        console.error('[AuthContext] Failed to get user profile:', profileResponse.message);
        
        // 오류가 토큰 만료 또는 인증 오류인 경우 자동 로그아웃
        if (profileResponse.message?.includes('인증') || profileResponse.message?.includes('만료') || 
            profileResponse.message?.includes('auth') || profileResponse.message?.includes('expired')) {
          console.log('[AuthContext] Auth error detected, logging out');
          logout();
        }
      }
    } catch (error: any) {
      console.error('[AuthContext] Error fetching user profile:', error);
      
      // 401 오류시 자동 로그아웃
      if (error.status === 401 || error.message?.includes('unauthorized')) {
        console.log('[AuthContext] 401 error detected, logging out');
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
    
    // 새 표준 키에 저장
    localStorage.setItem('accessToken', processedToken);
    
    // 레거시 키 제거
    localStorage.removeItem('token');
    
    setToken(processedToken);
    setIsLoggedIn(true);
    
    // 로그인 시 사용자 정보 가져오기
    refreshUserInfo();
  }, [refreshUserInfo]);

  // 로그아웃 처리 함수
  const logout = useCallback(() => {
    // 모든 토큰 키 제거
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    
    // 모든 localStorage 항목 제거 (완전 초기화)
    localStorage.clear();
    
    setToken(null);
    setUserId(null);
    setIsLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        token,
        userId,
        login,
        logout,
        refreshUserInfo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 