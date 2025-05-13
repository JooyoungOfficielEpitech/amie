import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userApi } from '../api/userApi';

interface User {
  id: string;
  nickname: string;
  age?: number;
  height?: number;
  city?: string;
  photos?: (string | null)[];
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await userApi.getProfile();
      
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        throw new Error('사용자 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '사용자 정보를 가져오는 중 오류가 발생했습니다.');
      console.error('User fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    await fetchUserData();
  };

  // 컴포넌트 마운트 시 사용자 정보 불러오기
  useEffect(() => {
    fetchUserData();
  }, []);

  const value = {
    user,
    loading,
    error,
    refreshUserData
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}; 