import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, LoginCredentials } from '../api/authApi';
import { SignupData } from '../types';

interface User {
  id: string;
  nickname: string;
  gender: 'male' | 'female';
  credit: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: SignupData) => Promise<void>;
  socialLogin: (provider: 'google' | 'kakao', token: string) => Promise<void>;
  logout: () => void;
  token: string | null;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [token] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    // 토큰 유효성 검사 및 사용자 정보 불러오기
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }
      
      try {
        // 토큰이 유효한지 확인하는 방법은 주로 사용자 정보를 불러오는 API를 호출하는 것
        // 이 부분은 실제 API 엔드포인트를 사용하도록 수정해야 함
        const userData = await getUserData();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Authentication check failed:', err);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 실제 API 호출로 구현할 필요가 있음
  const getUserData = async (): Promise<User> => {
    try {
      // 여기서는 userApi.getProfile()을 사용해야 하지만, 지금은 목업 데이터를 반환
      const userData = {
        id: 'user-id',
        nickname: '사용자',
        gender: 'male' as const,
        credit: 50
      };
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login(credentials);
      
      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        throw new Error('로그인에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: SignupData) => {
    setLoading(true);
    setError(null);
    
    try {
      // SignupData와 RegisterData 타입을 맞추기 위한 변환
      const registerData = {
        email: data.email,
        password: data.password,
        nickname: data.nickname,
        birthYear: parseInt(data.dob.split('-')[0], 10),
        height: parseInt(data.height, 10),
        city: data.city,
        gender: data.gender === '' ? 'male' : data.gender,
        profileImages: [], // API 호출 전에 이미지 업로드 처리 필요
        businessCardImage: data.businessCard ? '' : undefined
      };
      
      // 파일 업로드 로직은 별도로 구현 필요
      
      const response = await authApi.register(registerData);
      
      if (response.success) {
        // 회원가입 성공 후 자동 로그인 처리
        if (response.token) {
          localStorage.setItem('token', response.token);
          setUser(response.user);
          setIsAuthenticated(true);
        }
      } else {
        throw new Error('회원가입에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = async (provider: 'google' | 'kakao', token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.socialLogin({ provider, token });
      
      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        throw new Error('소셜 로그인에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '소셜 로그인 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  const getToken = async (): Promise<string | null> => {
    return token;
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    register,
    socialLogin,
    logout,
    token,
    getToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 