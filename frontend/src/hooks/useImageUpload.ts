import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

const SUPABASE_BUCKET_NAME = 'profile-images';

interface UseImageUploadOptions {
  userId: string | null;
  folderPath?: string; // 'profile' 또는 'business_card' 등 폴더 경로
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const useImageUpload = ({ userId, folderPath = 'profile' }: UseImageUploadOptions) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 이미지 업로드 함수
  const uploadImage = async (file: File): Promise<UploadResult> => {
    if (!userId) {
      return { 
        success: false, 
        error: '사용자 ID가 없습니다. 로그인 상태를 확인해주세요.' 
      };
    }

    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const imageUuid = uuidv4();
      const filePath = `${folderPath}/${userId}/${imageUuid}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET_NAME)
        .upload(filePath, file, { 
          cacheControl: '3600', 
          upsert: false 
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('이미지 URL을 가져오는데 실패했습니다.');
      }

      return {
        success: true,
        url: publicUrlData.publicUrl
      };
    } catch (err: any) {
      const errorMessage = err.message || '이미지 업로드 중 오류가 발생했습니다.';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsUploading(false);
    }
  };

  // 이미지 삭제 함수
  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    if (!imageUrl || !imageUrl.startsWith('https')) {
      return false; // 유효하지 않은 URL
    }

    setIsUploading(true);
    setError(null);

    try {
      const pathParts = new URL(imageUrl).pathname.split('/');
      const filePathToDelete = pathParts.slice(pathParts.indexOf(SUPABASE_BUCKET_NAME) + 1).join('/');
      
      if (!filePathToDelete) {
        throw new Error('이미지 경로를 파싱할 수 없습니다.');
      }

      const { error: deleteError } = await supabase.storage
        .from(SUPABASE_BUCKET_NAME)
        .remove([filePathToDelete]);

      if (deleteError) throw deleteError;
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '이미지 삭제 중 오류가 발생했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadImage,
    deleteImage,
    isUploading,
    error,
    clearError: () => setError(null)
  };
}; 