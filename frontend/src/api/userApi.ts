import axiosInstance from './axiosConfig';

export interface ProfileData {
  nickname?: string;
  birthYear?: number;
  height?: number;
  city?: string;
  gender?: 'male' | 'female';
  profileImages?: string[];
  businessCardImage?: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  birthYear?: number;
  age?: number;
  height: number;
  city: string;
  gender: string;
  credit: number;
  profileImages: string[];
  isActive: boolean;
  isWaitingForMatch: boolean;
  matchedRoomId?: string | null;
}

export const updateUserProfile = async (profileData: {
  name: string;
  age: number;
  height: number;
  city: string;
}): Promise<boolean> => {
  try {
    console.log('[userApi.updateUserProfile] 프로필 업데이트 요청:', profileData);
    const response = await axiosInstance.patch('/user/profile', profileData);
    console.log('[userApi.updateUserProfile] API 응답:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('[userApi.updateUserProfile] API 호출 오류:', error);
    throw error;
  }
};

export const updateUserPhoto = async (photoIndex: number, photoData: string): Promise<boolean> => {
  try {
    console.log(`[userApi.updateUserPhoto] 사진 업데이트 요청: 인덱스 ${photoIndex}`);
    // 스웨거 문서에 해당 엔드포인트가 없으므로 프로필 수정 API로 대체
    // 실제로는 백엔드와 협의 필요
    const response = await axiosInstance.patch('/user/profile', { 
      profileImages: [photoData] 
    });
    console.log('[userApi.updateUserPhoto] API 응답:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('[userApi.updateUserPhoto] API 호출 오류:', error);
    throw error;
  }
};

export const userApi = {
  getProfile: async (): Promise<{ success: boolean; user?: UserProfile; message?: string }> => {
    try {
      // console.log('[userApi.getProfile] 프로필 조회 요청');
      const response = await axiosInstance.get('/user/profile');
      // console.log('[userApi.getProfile] API 응답:', response.data);
      
      // Return the structure expected by App.tsx, based on Swagger definition
      if (response.data.success && response.data.profile) {
        const profile = response.data.profile;
        const userProfile: UserProfile = {
            id: profile.id || 'unknown',
            nickname: profile.nickname || '',
            birthYear: profile.birthYear,
            // Calculate age from birthYear if available
            age: profile.birthYear ? new Date().getFullYear() - profile.birthYear : 0, 
            height: profile.height || 0,
            city: profile.city || '',
            gender: profile.gender || '',
            credit: profile.credit || 0, // Extract credit here
            // profileImages 사용
            profileImages: Array.isArray(profile.profileImages) ? profile.profileImages : [], 
            isActive: true, // Assuming active if profile is fetched
            isWaitingForMatch: profile.isWaitingForMatch,
            matchedRoomId: profile.matchedRoomId
        };
        return {
          success: true,
          user: userProfile
        };
      }
      // If API response structure is different or call failed on backend side
      return { success: false, message: response.data.message || 'Failed to parse profile data' };
    } catch (error: any) {
      console.error('[userApi.getProfile] API 호출 오류:', error);
      const message = error.response?.data?.error || error.message || '프로필 정보 로딩 중 오류 발생';
      return { success: false, message };
    }
  },
  
  updateProfile: async (data: ProfileData) => {
    try {
      // console.log('[userApi.updateProfile] 프로필 업데이트 요청:', data);
      const response = await axiosInstance.patch('/user/profile', data);
      // console.log('[userApi.updateProfile] API 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('[userApi.updateProfile] API 호출 오류:', error);
      throw error;
    }
  },
  
  deleteAccount: async (userId: string) => {
    // console.log(`[userApi.deleteAccount] 계정 삭제 요청: ID=${userId}`);
    try {
      const response = await axiosInstance.delete(`/users/${userId}`); // Note: path might be /user/:id
      // console.log('[userApi.deleteAccount] API 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('[userApi.deleteAccount] API 호출 오류:', error);
      throw error;
    }
  },
  
  // getUserCredit function restored to use /credit/current
  getUserCredit: async (): Promise<{ success: boolean; credit?: number; message?: string }> => {
    try {
      console.log('[userApi.getUserCredit] 크레딧 조회 요청 (/credit/current)');
      const response = await axiosInstance.get('/credit/current');
      console.log('[userApi.getUserCredit] API 응답:', response.data);
      
      // Expecting backend response { success: true, data: { credit: number } }
      if (response.data.success && response.data.data?.credit !== undefined) {
        // Extract credit from the nested data object
        return { success: true, credit: response.data.data.credit }; 
      } else {
        // Handle cases where success is false or data/credit is missing
        return { success: false, message: response.data.message || '크레딧 정보 로딩 실패 (데이터 구조 오류)' };
      }
    } catch (error: any) {
      console.error('[userApi.getUserCredit] API 호출 오류:', error);
      const message = error.response?.data?.message || error.message || '크레딧 정보 로딩 중 오류 발생';
      return { success: false, message };
    }
  },
  
  rechargeCredit: async (amount: number): Promise<{ success: boolean; credit?: number; message?: string }> => {
    try {
      // console.log('[userApi.rechargeCredit] 크레딧 충전 요청:', amount);
      // Assuming a recharge endpoint exists, e.g., /user/recharge
      // The actual endpoint might differ based on backend routes
      const response = await axiosInstance.post('/user/recharge', { amount }); 
      // console.log('[userApi.rechargeCredit] API 응답:', response.data);
      
      // Assuming response contains { success: boolean, credit: number } or { success: false, message: string }
      if (response.data.success) {
          return { success: true, credit: response.data.credit };
      } else {
          return { success: false, message: response.data.message || '크레딧 충전에 실패했습니다.' };
      }
    } catch (error: any) {
      console.error('[userApi.rechargeCredit] API 호출 오류:', error);
      const message = error.response?.data?.message || error.message || '크레딧 충전 중 오류 발생';
      return { success: false, message };
    }
  }
}; 