import { useState } from 'react';
import axios from 'axios';

interface FileUploadOptions {
  url?: string;
  fieldName?: string;
  headers?: Record<string, string>;
  allowedTypes?: string[];
  maxSize?: number; // bytes
}

export const useFileUpload = (options?: FileUploadOptions) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const defaultOptions: FileUploadOptions = {
    url: '/api/upload/file', // 실제 백엔드 업로드 URL로 변경 필요
    fieldName: 'file',
    headers: {},
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 5 * 1024 * 1024 // 5MB
  };

  const mergedOptions = { ...defaultOptions, ...options };

  const validateFile = (file: File): boolean => {
    if (
      mergedOptions.allowedTypes &&
      !mergedOptions.allowedTypes.includes(file.type)
    ) {
      setError(`지원하지 않는 파일 형식입니다. 지원 형식: ${mergedOptions.allowedTypes.join(', ')}`);
      return false;
    }

    if (mergedOptions.maxSize && file.size > mergedOptions.maxSize) {
      setError(`파일 크기가 너무 큽니다. 최대 크기: ${Math.floor(
        mergedOptions.maxSize / (1024 * 1024)
      )}MB`);
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File): Promise<string> => {
    setLoading(true);
    setError(null);

    if (!validateFile(file)) {
      setLoading(false);
      throw new Error('파일 유효성 검사 실패');
    }

    try {
      const formData = new FormData();
      formData.append(mergedOptions.fieldName || 'file', file);

      // 토큰 가져오기
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
        ...mergedOptions.headers
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(
        mergedOptions.url || '/upload/file',
        formData,
        { headers }
      );

      if (response.data && response.data.fileUrl) {
        setUploadedUrl(response.data.fileUrl);
        return response.data.fileUrl;
      } else {
        throw new Error('파일 URL을 받지 못했습니다.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '파일 업로드 중 오류가 발생했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadFile,
    loading,
    error,
    uploadedUrl
  };
}; 