import React, { createContext, useContext, useState, ReactNode } from 'react';
import RechargeModal from '../components/common/RechargeModal';
import { useCredit } from './CreditContext';

interface RechargeModalContextType {
  openRechargeModal: () => void;
}

const RechargeModalContext = createContext<RechargeModalContextType>({
  openRechargeModal: () => {},
});

export const useRechargeModal = () => useContext(RechargeModalContext);

interface RechargeModalProviderProps {
  children: ReactNode;
}

export const RechargeModalProvider: React.FC<RechargeModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { charge } = useCredit();

  const handleConfirm = async (amount: number) => {
    setIsOpen(false);
    try {
      await charge({ amount, description: '크레딧 충전 (RechargeModal)' });
      window.location.reload(); // 충전 성공 시 새로고침
    } catch (err: any) {
      alert('충전 실패: ' + (err.message || '')); // 필요시 에러 알림
    }
  };

  const openRechargeModal = () => setIsOpen(true);
  const closeRechargeModal = () => setIsOpen(false);

  return (
    <RechargeModalContext.Provider value={{ openRechargeModal }}>
      {children}
      <RechargeModal isOpen={isOpen} onClose={closeRechargeModal} onConfirm={handleConfirm} />
    </RechargeModalContext.Provider>
  );
}; 