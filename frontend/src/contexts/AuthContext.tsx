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
    
    // 토큰 확인 - 통일된 방식으로 accessToken만 사용
    const storedToken = localStorage.getItem('accessToken');
    
    if (storedToken) {
      // 토큰 저장 및 로그인 상태 설정
      setToken(storedToken);
      setIsLoggedIn(true);
      console.log('[App isLoggedIn] is true, fetching user credit.');
      
      // 토큰이 있으면 사용자 정보 가져오기
      refreshUserInfo();
    }
  }, []);

  // 사용자 정보 업데이트 함수
  const refreshUserInfo = useCallback(async () => {
    // 토큰 유효성 검사 먼저 수행
    const accessToken = localStorage.getItem('accessToken');
    console.log('[AuthContext] refreshUserInfo - token exists:', !!accessToken);
    
    if (!accessToken) {
      console.log('[AuthContext] No token found, skipping user info refresh');
      return;
    }
    
    // 이미 요청 중이면 무시
    if (isRefreshingRef.current) {
      console.log('[AuthContext] Already refreshing user info, skipping duplicate request');
      return;
    }
    
    // 3초 이내에 이미 갱신한 경우 스킵
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 3000) {
      console.log('[AuthContext] Recently refreshed user info, using cached data');
      return;
    }
    
    console.log('[AuthContext] Starting user info refresh');
    isRefreshingRef.current = true;
    
    try {
      const profileResponse = await userApi.getProfile();
      lastRefreshTimeRef.current = now;
      
      if (profileResponse.success && profileResponse.user) {
        setUserId(profileResponse.user.id);
        console.log('[AuthContext] User info refreshed successfully, userId:', profileResponse.user.id);
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
      console.log('[AuthContext] User info refresh complete');
    }
  }, []);

  // 로그인 처리 함수
  const login = useCallback((newToken: string) => {
    // 들어오는 토큰 로깅
    console.log('[AuthContext] Processing login token (length):', newToken ? newToken.length : 0);
    
    // 'Bearer ' 접두사가 있으면 제거
    let processedToken = newToken;
    if (processedToken.startsWith('Bearer ')) {
      processedToken = processedToken.substring(7);
      console.log('[AuthContext] Removed Bearer prefix');
    }
    
    // JSON 문자열 형태인 경우 추출
    try {
      const tokenObj = JSON.parse(processedToken);
      if (tokenObj.token || tokenObj.accessToken) {
        processedToken = tokenObj.token || tokenObj.accessToken;
        console.log('[AuthContext] Extracted token from JSON object');
      }
    } catch (e) {
      // JSON이 아니면 그대로 사용
      console.log('[AuthContext] Token is not in JSON format, using as is');
    }
    
    // 확실하게 localStorage 비우고 시작
    console.log('[AuthContext] Clearing localStorage before setting new token');
    localStorage.clear();
    
    // 새 표준 키에 저장
    localStorage.setItem('accessToken', processedToken);
    console.log('[AuthContext] Token saved to localStorage as accessToken');
    
    setToken(processedToken);
    setIsLoggedIn(true);
    console.log('[AuthContext] Login state updated: isLoggedIn=true');
    
    // 로그인 시 사용자 정보 가져오기
    console.log('[AuthContext] Refreshing user info after login');
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