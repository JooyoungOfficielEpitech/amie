import React, { useEffect } from 'react';
import styles from './MatchSuccessModal.module.css';
import confetti from 'canvas-confetti';

interface MatchSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MatchSuccessModal: React.FC<MatchSuccessModalProps> = ({ isOpen, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            // Confetti 효과 시작
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;

            const randomInRange = (min: number, max: number) => {
                return Math.random() * (max - min) + min;
            };

            const interval = setInterval(() => {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    clearInterval(interval);
                    return;
                }

                const particleCount = 50 * (timeLeft / duration);

                // 왼쪽에서 발사
                confetti({
                    startVelocity: 30,
                    spread: 360,
                    ticks: 60,
                    zIndex: 0,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });

                // 오른쪽에서 발사
                confetti({
                    startVelocity: 30,
                    spread: 360,
                    ticks: 60,
                    zIndex: 0,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            // 3초 후 자동으로 닫기
            const timer = setTimeout(() => {
                onClose();
            }, 3000);

            return () => {
                clearInterval(interval);
                clearTimeout(timer);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.celebrationText}>
                    <h2>Match Success!</h2>
                    <p>A new connection has been made</p>
                </div>
                <div className={styles.heartAnimation}>❤️</div>
            </div>
        </div>
    );
};

export default MatchSuccessModal; 