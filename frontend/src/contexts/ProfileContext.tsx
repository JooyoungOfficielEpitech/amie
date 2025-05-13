import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userApi, ProfileData } from '../api/userApi';
import { useAuth } from './AuthContext';

export interface UserProfile {
  nickname: string;
  birthYear: number;
  height: number;
  city: string;
  gender: 'male' | 'female';
  profileImages: string[];
  credit: number;
  businessCardImage?: string;
}

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: ProfileData) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 인증 상태가 변경되면 프로필 정보 불러오기
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await userApi.getProfile();
      
      if (response.success && response.user) {
        // user 객체를 UserProfile 형태로 변환
        setProfile({
          nickname: response.user.nickname,
          birthYear: new Date().getFullYear() - (response.user.age || 20),
          height: response.user.height || 170,
          city: response.user.city || '',
          gender: 'male', // 기본값 설정
          profileImages: (response.user.profileImages || []).filter(Boolean) as string[],
          credit: 0, // 기본값 설정
          businessCardImage: undefined
        });
      } else {
        throw new Error('프로필 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '프로필 정보를 가져오는 중 오류가 발생했습니다.');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: ProfileData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await userApi.updateProfile(data);
      
      if (response.success) {
        // 프로필 업데이트 후 최신 정보 불러오기
        await fetchProfile();
      } else {
        throw new Error('프로필 업데이트에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '프로필 업데이트 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}; 