import React, { useState, useEffect } from 'react';
import styles from './Header.module.css';
import { FaCoins } from 'react-icons/fa'; // Changed icon import
import RechargeModal from '../common/RechargeModal'; // Import RechargeModal
// Import strings
import * as AppStrings from '../../constants/strings';
import { useCredit } from '../../contexts/CreditContext'; // useCredit 훅 추가
import { useSocket } from '../../contexts/SocketContext'; // 소켓 컨텍스트 추가

// 매칭에 필요한 크레딧
const REQUIRED_MATCHING_CREDIT = 10;

// Interface for props - Updated
interface HeaderProps {
    creditBalance: number | null;
    onRefetchCredit?: () => Promise<void>; // Make it optional to avoid breaking changes
    userGender?: string; // 사용자 성별 추가
    isAutoSearchEnabled?: boolean; // Auto search 상태 추가
    onAutoSearchChange?: (enabled: boolean) => void; // Auto search 상태 변경 콜백 추가
}

const Header: React.FC<HeaderProps> = ({ 
    creditBalance: propsCreditBalance, 
    userGender,
    isAutoSearchEnabled = false,
    onAutoSearchChange
}) => {
    const { credit: contextCredit, loading: creditLoading, fetchCredit, charge } = useCredit();
    const { matchSocket, isConnected } = useSocket(); // 소켓 컨텍스트 사용
    
    const [displayCredit, setDisplayCredit] = useState<number | null>(null);
    const [isToggleOn, setIsToggleOn] = useState<boolean>(isAutoSearchEnabled); // 스위치 상태를 외부 prop과 연결
    
    // 외부 props가 변경되면 내부 상태도 업데이트
    useEffect(() => {
        setIsToggleOn(isAutoSearchEnabled);
    }, [isAutoSearchEnabled]);
    
    // 컴포넌트 마운트 시 초기 크레딧 데이터 가져오기
    useEffect(() => {
        const initCredit = async () => {
            await fetchCredit();
        };
        initCredit();
    }, []); // 마운트 시 한 번만 실행
    
    // 크레딧 상태 변경 감지 및 표시
    useEffect(() => {
        // 컨텍스트 크레딧 업데이트가 있을 경우
        if (contextCredit !== undefined && contextCredit !== null) {
            setDisplayCredit(contextCredit);
        } 
        // 백업: 프롭스 크레딧 업데이트가 있을 경우
        else if (propsCreditBalance !== null && propsCreditBalance !== displayCredit) {
            setDisplayCredit(propsCreditBalance);
        }
    }, [contextCredit, propsCreditBalance, displayCredit]);
    
    // 소켓 이벤트를 통한 크레딧 업데이트 처리
    useEffect(() => {
        if (!matchSocket || !isConnected) return;
        
        // 크레딧 업데이트 이벤트 리스너
        const handleCreditUpdate = (data: { credit: number }) => {
            if (data && typeof data.credit === 'number') {
                setDisplayCredit(data.credit);
            }
        };
        
        // 소켓 이벤트 등록
        matchSocket.on('credit_update', handleCreditUpdate);
        
        // 컴포넌트 언마운트 시 이벤트 리스너 제거
        return () => {
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
            await charge({ amount, description: '크레딧 충전 (Modal)' });
            
            // 크레딧 데이터 즉시 갱신
            await fetchCredit();
        } catch (err: any) {
            console.error("[Header] Error during recharge:", err);
            const errorMsg = err.message || '충전 중 오류 발생';
            setRechargeError(errorMsg); // Set recharge specific error
            alert(`충전 오류: ${errorMsg}`);
        } finally {
            setIsLoadingRecharge(false);
        }
    };

    // Toggle switch handler
    const handleToggleChange = () => {
        // 크레딧 확인 - 자동 검색이 켜질 때만 확인
        if (!isToggleOn && contextCredit !== null && contextCredit < REQUIRED_MATCHING_CREDIT) {
            alert(`자동 검색을 활성화하려면 최소 ${REQUIRED_MATCHING_CREDIT} 크레딧이 필요합니다.`);
            return;
        }
        
        const newValue = !isToggleOn;
        setIsToggleOn(newValue);
        
        // 부모 컴포넌트에 변경 알림
        if (onAutoSearchChange) {
            onAutoSearchChange(newValue);
        } else {
            console.warn('[Header] onAutoSearchChange 함수가 없어 부모 컴포넌트에 알릴 수 없습니다.');
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
                
                {/* 남성 사용자용 토글 스위치 */}
                {userGender === 'male' && (
                    <button 
                        className={`${styles.autoSearchButton} ${isToggleOn ? styles.autoSearchActive : ''}`}
                        onClick={handleToggleChange}
                    >
                        Auto search
                    </button>
                )}
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