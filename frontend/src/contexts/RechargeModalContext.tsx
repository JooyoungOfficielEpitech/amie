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
  const { charge, fetchCredit } = useCredit();

  const handleConfirm = async (amount: number) => {
    setIsOpen(false);
    try {
      await charge({ amount, description: '크레딧 충전 (RechargeModal)' });
      await fetchCredit();
      // alert('충전이 완료되었습니다!'); // 필요시 알림
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