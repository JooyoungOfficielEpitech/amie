import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useCredit } from './CreditContext';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { CREDIT_COSTS, CREDIT_DESCRIPTIONS } from '../constants/credits';

interface PaymentOptions {
  service: string;
  amount: number;
  description?: string;
  onSuccess?: () => void;  // Callback for successful payment
  onError?: (errorMsg: string) => void; // Callback for payment error
}

interface PaymentContextType {
  requestPayment: (options: PaymentOptions) => boolean;
  confirmPayment: () => Promise<boolean>;
  cancelPayment: () => boolean;
  requestMatchPayment: (onSuccess?: () => void, onError?: (errorMsg: string) => void) => boolean;
  requestProfileUnlockPayment: (index: number, onSuccess?: (index: number) => void, onError?: (errorMsg: string) => void) => boolean;
  loading: boolean;
  error: string | null;
  success: boolean;
  hasEnoughCredit: (amount: number) => boolean;
  currentCredit: number;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

interface PaymentProviderProps {
  children: ReactNode;
  onCreditUpdate?: () => Promise<void>;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children, onCreditUpdate }) => {
  const { credit, use, loading: creditLoading, error: creditError, usageInfo, fetchUsageInfo } = useCredit();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState<boolean>(false);
  const [currentPaymentOptions, setCurrentPaymentOptions] = useState<PaymentOptions | null>(null);

  // 앱 초기화 시 서버에서 최신 크레딧 비용 정보 가져오기
  useEffect(() => {
    const fetchCreditUsageInfo = async () => {
      // usageInfo가 이미 있으면 다시 가져오지 않음
      if (usageInfo) {
        return;
      }

      try {
        await fetchUsageInfo();
      } catch (error) {
        console.error('크레딧 사용 정보 로딩 오류:', error);
      }
    };

    fetchCreditUsageInfo();
  }, [usageInfo, fetchUsageInfo]);

  const getServiceInfo = (service: string) => {
    if (!usageInfo) return null;
    
    switch(service) {
      case 'match':
        return usageInfo.matching;
      case 'profileUnlock':
        return usageInfo.profileUnlock;
      default:
        return null;
    }
  };

  const requestPayment = (options: PaymentOptions) => {
    setError(null);
    
    // 크레딧 잔액 확인
    if (credit < options.amount) {
      // 크레딧 부족 시 모달 표시 (간단한 에러 메시지 대신)
      setCurrentPaymentOptions(options);
      setShowInsufficientCreditsModal(true);
      
      // 콜백은 호출하지 않고 모달만 표시
      return false;
    }
    
    // Store payment options for later use
    setCurrentPaymentOptions(options);
    
    // Show confirmation modal
    setShowConfirmation(true);
    return true;
  };

  // 매칭 결제 요청 헬퍼 함수
  const requestMatchPayment = (onSuccess?: () => void, onError?: (errorMsg: string) => void) => {
    return requestPayment({
      service: 'match',
      amount: CREDIT_COSTS.MATCHING,
      description: CREDIT_DESCRIPTIONS.MATCHING,
      onSuccess,
      onError
    });
  };

  // 프로필 잠금 해제 결제 요청 헬퍼 함수
  const requestProfileUnlockPayment = (index: number, onSuccess?: (index: number) => void, onError?: (errorMsg: string) => void) => {
    return requestPayment({
      service: 'profileUnlock',
      amount: CREDIT_COSTS.PROFILE_UNLOCK,
      description: CREDIT_DESCRIPTIONS.PROFILE_UNLOCK,
      onSuccess: onSuccess ? () => onSuccess(index) : undefined,
      onError
    });
  };

  const confirmPayment = async () => {
    if (!currentPaymentOptions) return false;
    
    const options = {...currentPaymentOptions}; // Save callbacks before clearing
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    setShowConfirmation(false);

    try {
      await use({
        amount: options.amount,
        service: options.service,
        description: options.description
      });
      
      // 크레딧 사용 후 App.tsx의 fetchUserProfile 호출하여 헤더 업데이트
      if (onCreditUpdate) {
        try {
          await onCreditUpdate();
        } catch (updateErr) {
          console.error("크레딧 업데이트 중 오류:", updateErr);
          // 크레딧 업데이트 실패해도 결제는 성공했으므로 진행
        }
      }
      
      setSuccess(true);
      
      // Call success callback if provided
      if (options.onSuccess) {
        options.onSuccess();
      }
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '결제 처리 중 오류가 발생했습니다.';
      setError(errorMessage);
      
      // Call error callback if provided
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      return false;
    } finally {
      setLoading(false);
      setCurrentPaymentOptions(null);
    }
  };

  const cancelPayment = () => {
    setShowConfirmation(false);
    setShowInsufficientCreditsModal(false);
    setCurrentPaymentOptions(null);
    
    return false;
  };

  const isProcessing = loading || creditLoading;
  const paymentError = error || creditError;

  const value = {
    requestPayment,
    confirmPayment,
    cancelPayment,
    requestMatchPayment,
    requestProfileUnlockPayment,
    loading: isProcessing,
    error: paymentError,
    success,
    hasEnoughCredit: (amount: number) => credit >= amount,
    currentCredit: credit
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
      
      {/* 결제 확인 모달 */}
      {currentPaymentOptions && (
        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={cancelPayment}
          onConfirm={confirmPayment}
          title="Credit Payment Confirmation"
          message="Are you sure you want to use credits for this service?"
          amount={currentPaymentOptions.amount}
          serviceDescription={
            getServiceInfo(currentPaymentOptions.service)?.description || 
            currentPaymentOptions.description || 
            'Service'
          }
        />
      )}

      {/* 크레딧 부족 모달 */}
      {currentPaymentOptions && (
        <ConfirmationModal
          isOpen={showInsufficientCreditsModal}
          onClose={() => setShowInsufficientCreditsModal(false)}
          onConfirm={() => setShowInsufficientCreditsModal(false)}
          title="Insufficient Credits"
          message={`You don't have enough credits for this service. You need ${currentPaymentOptions.amount} credits but you only have ${credit} credits. Please charge credits to use this service.`}
          amount={currentPaymentOptions.amount}
          serviceDescription={
            getServiceInfo(currentPaymentOptions.service)?.description || 
            currentPaymentOptions.description || 
            'Service'
          }
          currentCredit={credit}
          isInformationOnly={true}
        />
      )}
    </PaymentContext.Provider>
  );
}; 