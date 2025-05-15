import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { creditApi, ChargeData, UseData } from '../api/creditApi';
import { useAuth } from './AuthContext';

export interface CreditLog {
  action: string;
  amount: number;
  createdAt: string;
}

export interface CreditUsageInfo {
  matching: {
    description: string;
    cost: number;
  }
  profileUnlock: {
    description: string;
    cost: number;
  }
}

interface CreditContextType {
  credit: number;
  logs: CreditLog[];
  usageInfo: CreditUsageInfo | null;
  loading: boolean;
  error: string | null;
  fetchCredit: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  fetchUsageInfo: () => Promise<void>;
  charge: (data: ChargeData) => Promise<void>;
  use: (data: UseData) => Promise<void>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const useCredit = () => {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredit must be used within a CreditProvider');
  }
  return context;
};

interface CreditProviderProps {
  children: ReactNode;
  onCreditUpdate?: () => Promise<void>;
}

export const CreditProvider: React.FC<CreditProviderProps> = ({ children }) => {
  const { token, userId } = useAuth();
  const [credit, setCredit] = useState<number>(0);
  const [logs, setLogs] = useState<CreditLog[]>([]);
  const [usageInfo, setUsageInfo] = useState<CreditUsageInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 요청 디바운싱 및 캐싱을 위한 참조 변수
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const cachedCreditRef = useRef<number>(0);
  
  // 크레딧 업데이트 콜백 실행 중복 방지
  useRef<boolean>(false);

  // 인증 상태가 변경되면 크레딧 정보 불러오기
  useEffect(() => {
    if (token && userId) {
      fetchCredit();
      fetchUsageInfo();
    } else {
      setCredit(0);
      setLogs([]);
      setUsageInfo(null);
    }
  }, [token, userId]);

  const fetchCredit = useCallback(async () => {
    // 이미 요청 중이면 무시
    if (isFetchingRef.current) {
      console.log('[CreditContext] Skipping fetch, already in progress');
      return cachedCreditRef.current;
    }
    
    // 2초 이내에 이미 가져온 경우 캐싱된 값 반환
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      console.log('[CreditContext] Using cached credit:', cachedCreditRef.current);
      return cachedCreditRef.current;
    }
    
    setLoading(true);
    setError(null);
    isFetchingRef.current = true;
    
    try {
      console.log('[CreditContext] Fetching latest credit data from server...');
      const response = await creditApi.getCurrent();
      
      if (response.success && response.data) {
        // 캐시 업데이트
        lastFetchTimeRef.current = now;
        cachedCreditRef.current = response.data.credit;
        
        // 상태 업데이트
        setCredit(response.data.credit);
        console.log('[CreditContext] Credit updated to:', response.data.credit);
        
        return response.data.credit;
      } else {
        throw new Error('크레딧 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '크레딧 정보를 가져오는 중 오류가 발생했습니다.');
      console.error('[CreditContext] Credit fetch error:', err);
      throw err;
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await creditApi.getLogs();
      
      if (response.success && response.data) {
        setLogs(response.data);
      } else {
        throw new Error('크레딧 사용 내역을 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '크레딧 사용 내역을 가져오는 중 오류가 발생했습니다.');
      console.error('Credit logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsageInfo = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await creditApi.getUsageInfo();
      
      if (response.success && response.data) {
        setUsageInfo(response.data);
      } else {
        throw new Error('크레딧 사용 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '크레딧 사용 정보를 가져오는 중 오류가 발생했습니다.');
      console.error('Credit usage info fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const charge = useCallback(async (data: ChargeData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await creditApi.charge(data);
      
      if (response.success) {
        // 크레딧 정보 갱신
        await fetchCredit();
        await fetchLogs();
      } else {
        throw new Error('크레딧 충전에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '크레딧 충전 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCredit, fetchLogs]);

  const use = useCallback(async (data: UseData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await creditApi.use(data);
      
      if (response.success) {
        // 크레딧 정보 갱신
        await fetchCredit();
        await fetchLogs();
      } else {
        throw new Error('크레딧 사용에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '크레딧 사용 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCredit, fetchLogs]);

  const value = {
    credit,
    logs,
    usageInfo,
    loading,
    error,
    fetchCredit,
    fetchLogs,
    fetchUsageInfo,
    charge,
    use
  };

  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
}; 