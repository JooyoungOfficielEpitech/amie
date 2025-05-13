import React, { useState, useEffect } from 'react';
import styles from './Header.module.css';
import { FaCoins } from 'react-icons/fa'; // Changed icon import
import RechargeModal from '../common/RechargeModal'; // Import RechargeModal
// Import strings
import * as AppStrings from '../../constants/strings';
import { useCredit } from '../../contexts/CreditContext'; // useCredit 훅 추가

// Interface for props - Updated
interface HeaderProps {
    creditBalance: number | null;
    onRefetchCredit: () => Promise<void>; // Expecting an async function
}

const Header: React.FC<HeaderProps> = ({ creditBalance: propsCreditBalance }) => {
    const { credit: contextCredit, loading: creditLoading, fetchCredit, charge } = useCredit();
    
    const [displayCredit, setDisplayCredit] = useState<number | null>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
    
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
        const now = Date.now();
        
        // 컨텍스트 크레딧 업데이트가 있을 경우
        if (contextCredit !== undefined && contextCredit !== null) {
            console.log('[Header] Context credit updated:', contextCredit);
            setDisplayCredit(contextCredit);
            setLastUpdateTime(now);
        } 
        // 백업: 프롭스 크레딧 업데이트가 있을 경우
        else if (propsCreditBalance !== null && propsCreditBalance !== displayCredit) {
            console.log('[Header] Props credit updated:', propsCreditBalance);
            setDisplayCredit(propsCreditBalance);
            setLastUpdateTime(now);
        }
    }, [contextCredit, propsCreditBalance, displayCredit]);
    
    // 주기적인 새로고침 (매칭 후 데이터 동기화 보장)
    useEffect(() => {
        // 마지막 업데이트 후 10초 이상 지났을 때만 자동 새로고침
        const AUTO_REFRESH_INTERVAL = 10000; // 10초
        
        const refreshTimer = setInterval(async () => {
            const now = Date.now();
            // 마지막 업데이트 이후 시간이 충분히 지났으면 갱신
            if (now - lastUpdateTime > AUTO_REFRESH_INTERVAL) {
                console.log('[Header] Auto refreshing credit data');
                try {
                    await fetchCredit();
                } catch (err) {
                    console.error('[Header] Auto refresh error:', err);
                }
            }
        }, AUTO_REFRESH_INTERVAL);
        
        return () => clearInterval(refreshTimer);
    }, [fetchCredit, lastUpdateTime]);

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