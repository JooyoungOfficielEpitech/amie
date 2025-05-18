import { useState } from 'react';
import axios from 'axios';

interface UploadImageOptions {
  url?: string;
  fieldName?: string;
  headers?: Record<string, string>;
}

export const useUploadImage = (options?: UploadImageOptions) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const defaultOptions: UploadImageOptions = {
    url: '/api/upload', // 이 부분은 실제 백엔드 업로드 URL로 변경 필요
    fieldName: 'image',
    headers: {}
  };

  const mergedOptions = { ...defaultOptions, ...options };

  const uploadImage = async (file: File): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append(mergedOptions.fieldName || 'image', file);

      // 토큰 가져오기
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
        ...mergedOptions.headers
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(
        mergedOptions.url || '/upload',
        formData,
        { headers }
      );

      if (response.data && response.data.imageUrl) {
        setUploadedUrls(prev => [...prev, response.data.imageUrl]);
        return response.data.imageUrl;
      } else {
        throw new Error('이미지 URL을 받지 못했습니다.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '이미지 업로드 중 오류가 발생했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
    setLoading(true);
    setError(null);

    try {
      const uploadPromises = files.map(file => uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (err: any) {
      setError(err.message || '이미지 업로드 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadImage,
    uploadMultipleImages,
    loading,
    error,
    uploadedUrls
  };
}; 