import React, { createContext, useContext, useState, ReactNode } from 'react';
import RechargeModal from '../components/common/RechargeModal';
import { useCredit } from './CreditContext';

interface CreditModalContextType {
  openCreditModal: () => void;
}

const CreditModalContext = createContext<CreditModalContextType | undefined>(undefined);

export const useCreditModal = () => {
  const ctx = useContext(CreditModalContext);
  if (!ctx) throw new Error('useCreditModal must be used within CreditModalProvider');
  return ctx.openCreditModal;
};

export const CreditModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { charge, fetchCredit } = useCredit();
  const [isLoading, setIsLoading] = useState(false);

  const openCreditModal = () => setIsOpen(true);
  const closeCreditModal = () => {
    setIsOpen(false);
    window.location.reload();
  };

  // 실제 충전 로직
  const handleRecharge = async (amount: number) => {
    setIsLoading(true);
    try {
      await charge({ amount, description: '크레딧 충전 (Modal)' });
      await fetchCredit();
      closeCreditModal();
    } catch (err) {
      // 에러 처리 필요시 추가
      closeCreditModal();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CreditModalContext.Provider value={{ openCreditModal }}>
      {children}
      <RechargeModal
        isOpen={isOpen}
        onClose={closeCreditModal}
        onConfirm={handleRecharge}
      />
    </CreditModalContext.Provider>
  );
}; 