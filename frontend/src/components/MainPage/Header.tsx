import React, { useState, useEffect } from 'react';
import styles from './Header.module.css';
import { FaCoins } from 'react-icons/fa'; // Changed icon import
import RechargeModal from '../common/RechargeModal'; // Import RechargeModal
// Import strings
import * as AppStrings from '../../constants/strings';
import { useCredit } from '../../contexts/CreditContext'; // useCredit 훅 추가
import { useSocket } from '../../contexts/SocketContext'; // 소켓 컨텍스트 추가

// Interface for props - Updated
interface HeaderProps {
    creditBalance: number | null;
    onRefetchCredit: () => Promise<void>; // Expecting an async function
}

const Header: React.FC<HeaderProps> = ({ creditBalance: propsCreditBalance }) => {
    const { credit: contextCredit, loading: creditLoading, fetchCredit, charge } = useCredit();
    const { matchSocket, isConnected } = useSocket(); // 소켓 컨텍스트 사용
    
    const [displayCredit, setDisplayCredit] = useState<number | null>(null);
    
    // 컴포넌트 마운트 시 초기 크레딧 데이터 가져오기
    useEffect(() => {
        const initCredit = async () => {
            console.log('[Header] Initial credit fetch');
            await fetchCredit();
        };
        initCredit();
    }, []); // 마운트 시 한 번만 실행
    
    // 크레딧 상태 변경 감지 및 표시
    useEffect(() => {
        // 컨텍스트 크레딧 업데이트가 있을 경우
        if (contextCredit !== undefined && contextCredit !== null) {
            console.log('[Header] Context credit updated:', contextCredit);
            setDisplayCredit(contextCredit);
        } 
        // 백업: 프롭스 크레딧 업데이트가 있을 경우
        else if (propsCreditBalance !== null && propsCreditBalance !== displayCredit) {
            console.log('[Header] Props credit updated:', propsCreditBalance);
            setDisplayCredit(propsCreditBalance);
        }
    }, [contextCredit, propsCreditBalance, displayCredit]);
    
    // 소켓 이벤트를 통한 크레딧 업데이트 처리
    useEffect(() => {
        if (!matchSocket || !isConnected) return;
        
        console.log('[Header] Setting up socket listeners for credit updates');
        
        // 크레딧 업데이트 이벤트 리스너
        const handleCreditUpdate = (data: { credit: number }) => {
            console.log('[Header] Received credit update via socket:', data);
            if (data && typeof data.credit === 'number') {
                setDisplayCredit(data.credit);
            }
        };
        
        // 소켓 이벤트 등록
        matchSocket.on('credit_update', handleCreditUpdate);
        
        // 컴포넌트 언마운트 시 이벤트 리스너 제거
        return () => {
            console.log('[Header] Cleaning up socket listeners');
            matchSocket.off('credit_update', handleCreditUpdate);
        };
    }, [matchSocket, isConnected]);

    // Removed internal state for recharge
    const [isLoadingRecharge, setIsLoadingRecharge] = useState<boolean>(false);
    const [rechargeError, setRechargeError] = useState<string | null>(null); // Separate error state for recharge
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    // Handle recharge confirmation from modal
    const handleRecharge = async (amount: number) => {
        closeModal();
        setIsLoadingRecharge(true);
        setRechargeError(null);
        try {
            console.log(`[Header] Processing recharge of ${amount} credits`);
            await charge({ amount, description: '크레딧 충전 (Modal)' });
            
            // 크레딧 데이터 즉시 갱신
            await fetchCredit();
            console.log('[Header] Recharge completed successfully');
        } catch (err: any) {
            console.error("[Header] Error during recharge:", err);
            const errorMsg = err.message || '충전 중 오류 발생';
            setRechargeError(errorMsg); // Set recharge specific error
            alert(`충전 오류: ${errorMsg}`);
        } finally {
            setIsLoadingRecharge(false);
        }
    };

    return (
        <header className={styles.appHeader}>
            <div className={styles.logoContainer}>
                 {/* Can use image logo here too */}
                 <span className={styles.logoText}>Amié</span>
            </div>
            <div className={styles.userInfo}>
                <span className={styles.connectionStatus}>
                    <span className={styles.statusDot}></span> {AppStrings.HEADER_CONNECTION_STATUS_CONNECTED}
                </span>
                <span className={styles.creditCount}>
                    <FaCoins /> 
                    {creditLoading ? '로딩 중...' : displayCredit !== null ? displayCredit : '0'}
                </span>
                <button 
                    onClick={openModal} 
                    className={styles.rechargeButton}
                    disabled={isLoadingRecharge} // Only disable based on recharge loading
                >
                    {isLoadingRecharge ? '처리중' : AppStrings.HEADER_RECHARGE_BUTTON}
                </button>
                {rechargeError && <span className={styles.creditError}>!</span>} 
            </div>

            <RechargeModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onConfirm={handleRecharge}
            />
        </header>
    );
};

export default Header; 