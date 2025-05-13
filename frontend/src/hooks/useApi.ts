import { useState, useCallback } from 'react';
import { useLoading } from '../contexts/LoadingContext';
import { useError } from '../contexts/ErrorContext';

type ApiFunction<T, P> = (params: P) => Promise<T>;

interface UseApiOptions {
  loadingMessage?: string;
  errorMessage?: string;
  showLoading?: boolean;
  showError?: boolean;
}

/**
 * API 호출 시 로딩 상태와 에러 처리를 자동화하는 훅
 */
export const useApi = <T, P = any>(
  apiFunction: ApiFunction<T, P>,
  options: UseApiOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { setLoading: setGlobalLoading, setLoadingMessage } = useLoading();
  const { setError: setGlobalError } = useError();

  const {
    loadingMessage,
    errorMessage = '요청 처리 중 오류가 발생했습니다.',
    showLoading = true,
    showError = true,
  } = options;

  const execute = useCallback(
    async (params: P): Promise<T | null> => {
      setLoading(true);
      setError(null);

      if (showLoading) {
        setGlobalLoading(true);
        if (loadingMessage) {
          setLoadingMessage(loadingMessage);
        }
      }

      try {
        const result = await apiFunction(params);
        setData(result);
        return result;
      } catch (err: any) {
        const errorMsg = err.message || errorMessage;
        setError(errorMsg);
        
        if (showError) {
          setGlobalError(errorMsg);
        }
        
        return null;
      } finally {
        setLoading(false);
        
        if (showLoading) {
          setGlobalLoading(false);
          setLoadingMessage(null);
        }
      }
    },
    [
      apiFunction, 
      setGlobalLoading,
      setLoadingMessage,
      setGlobalError,
      loadingMessage,
      errorMessage,
      showLoading,
      showError
    ]
  );

  return {
    data,
    loading,
    error,
    execute,
    setData
  };
};

/**
 * 동기화 작업을 위한 API 훅 (데이터 가져오기용)
 */
export const useSyncApi = <T, P = void>(
  apiFunction: ApiFunction<T, P>,
  options: UseApiOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { setLoading: setGlobalLoading, setLoadingMessage } = useLoading();
  const { setError: setGlobalError } = useError();

  const {
    loadingMessage,
    errorMessage = '데이터 조회 중 오류가 발생했습니다.',
    showLoading = true,
    showError = true,
  } = options;

  const sync = useCallback(
    async (params: P): Promise<T | null> => {
      setLoading(true);

      if (showLoading) {
        setGlobalLoading(true);
        if (loadingMessage) {
          setLoadingMessage(loadingMessage);
        }
      }

      try {
        const result = await apiFunction(params);
        setData(result);
        setLastUpdated(new Date());
        setError(null);
        return result;
      } catch (err: any) {
        const errorMsg = err.message || errorMessage;
        setError(errorMsg);
        
        if (showError) {
          setGlobalError(errorMsg);
        }
        
        return null;
      } finally {
        setLoading(false);
        
        if (showLoading) {
          setGlobalLoading(false);
          setLoadingMessage(null);
        }
      }
    },
    [
      apiFunction, 
      setGlobalLoading,
      setLoadingMessage,
      setGlobalError,
      loadingMessage,
      errorMessage,
      showLoading,
      showError
    ]
  );

  return {
    data,
    loading,
    error,
    lastUpdated,
    sync,
    setData
  };
}; 