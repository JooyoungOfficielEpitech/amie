import React from 'react';
import styles from './RechargeModal.module.css'; // Reuse the same styles
import { FaTimes } from 'react-icons/fa';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    amount: number;
    serviceDescription: string;
    currentCredit?: number;
    confirmButtonText?: string;
    cancelButtonText?: string;
    isInformationOnly?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    amount,
    serviceDescription,
    currentCredit,
    confirmButtonText = "Confirm",
    cancelButtonText = "Cancel",
    isInformationOnly = false
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{title}</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <FaTimes />
                    </button>
                </div>
                <div className={styles.modalBody}>
                    <p>{message}</p>
                    <div className={styles.creditInfo}>
                        <p><strong>Service:</strong> {serviceDescription}</p>
                        <p><strong>Required Credits:</strong> {amount}</p>
                        {currentCredit !== undefined && (
                            <p><strong>Your Credits:</strong> {currentCredit}</p>
                        )}
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    {isInformationOnly ? (
                        <button onClick={onClose} className={styles.confirmButton}>Ok</button>
                    ) : (
                        <>
                            <button onClick={onClose} className={styles.cancelButton}>{cancelButtonText}</button>
                            <button onClick={onConfirm} className={styles.confirmButton}>{confirmButtonText}</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal; 