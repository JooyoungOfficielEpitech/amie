import React, { useState, ChangeEvent } from 'react';
import styles from '../SignupFlow/SignupModalBase.module.css'; // 회원가입 모달 스타일 재사용
import amieLogo from '../../assets/amie_logo.png';

interface EmailLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (email: string) => void; // 이메일 제출 콜백
}

const EmailLoginModal: React.FC<EmailLoginModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [email, setEmail] = useState<string>('');
    const [isEmailValid, setIsEmailValid] = useState<boolean>(false);

    const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
        const newEmail = event.target.value;
        setEmail(newEmail);
        // 간단한 이메일 형식 검사 (실제 앱에서는 더 견고한 검증 필요)
        setIsEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail));
    };

    const handleSubmit = () => {
        if (isEmailValid) {
            onSubmit(email);
        }
    };

    // 모달 닫힐 때 이메일 상태 초기화 (선택 사항)
    React.useEffect(() => {
        if (!isOpen) {
            setEmail('');
            setIsEmailValid(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}> 
                <img src={amieLogo} alt="Amié Logo" className={styles.modalLogo} />

                <div className={styles.modalHeader}>
                    <h2>Enter your Email</h2> {/* 타이틀은 이미지대로 */} 
                    <button onClick={onClose} className={styles.closeButton}>&times;</button>
                </div>
                <div className={styles.modalBody}>
                    <label htmlFor="login-email">Email Address:</label>
                    <input
                        type="email"
                        id="login-email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="your.email@example.com"
                        required
                        autoFocus
                    />
                </div>
                <div className={styles.modalFooter}>
                    <button
                        onClick={handleSubmit}
                        className={`${styles.navButton} ${styles.nextButton}`}
                        disabled={!isEmailValid} // 이메일 유효할 때만 활성화
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailLoginModal; 