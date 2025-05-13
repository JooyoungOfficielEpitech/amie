import React, { useState } from 'react';
import styles from './Settings.module.css';
import Sidebar from '../MainPage/Sidebar';
import * as AppStrings from '../../constants/strings';
import Modal from '../common/Modal';
import { userApi } from '../../api';

interface SettingsProps {
    onNavigateToDashboard: () => void;
    onLogout: () => void;
    onNavigateToMyProfile: () => void;
    onNavigateToSettings: () => void;
    currentView: 'dashboard' | 'chat' | 'my-profile' | 'settings';
}

const Settings: React.FC<SettingsProps> = ({ 
    onNavigateToDashboard, 
    onLogout, 
    onNavigateToMyProfile, 
    onNavigateToSettings,
    currentView 
}) => {
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDeleteAccountClick = () => {
        setError(null);
        setIsConfirmModalOpen(true);
    };

    const confirmAccountDeletion = async () => {
        setIsDeleting(true);
        setError(null);
        console.log("Proceeding with account deletion...");

        try {
            const profileResponse = await userApi.getProfile();
            if (!profileResponse.success || !profileResponse.user?.id) {
                throw new Error('사용자 ID를 가져올 수 없습니다.');
            }
            const userId = profileResponse.user.id;
            console.log("User ID for deletion:", userId);

            const deleteResponse = await userApi.deleteAccount(userId);

            if (deleteResponse.success) {
                console.log("Account deletion successful.");
                setIsConfirmModalOpen(false);
                onLogout();
            } else {
                throw new Error(deleteResponse.message || '계정 삭제에 실패했습니다.');
            }

        } catch (err: any) {
            console.error("Error deleting account:", err);
            
            // Check if the error object actually contains the success message
            const successMessage = "사용자가 삭제되었습니다.";
            let errorMessage = "계정 삭제 중 오류가 발생했습니다."; // Default error message
            
            // Attempt to find the success message within the error structure
            if (err.response?.data?.message === successMessage) {
                // Treat this specific case as success despite being caught
                console.log("Deletion success message caught in error block, handling as success.");
                setIsConfirmModalOpen(false); // Close modal
                onLogout(); // Log out
                // Explicitly return here to prevent setting the error state below
                // Also need to ensure finally block still runs if needed, but setIsDeleting(false) is there.
                setIsDeleting(false); // Need to set loading false here too before returning
                return; 
            } else if (err.message) {
                // Use the error message from the error object if available
                errorMessage = err.message;
            }

            // If it wasn't the success message disguised as an error, set the error state
            setError(errorMessage);
            // Keep modal open to show the actual error
        } finally {
            // Ensure loading state is always turned off
            // Note: If we returned early in the catch block for success, this might still run,
            // but setting it false again is harmless.
            setIsDeleting(false);
        }
    };

    const closeModal = () => {
        if (isDeleting) return;
        console.log("Account deletion cancelled.");
        setIsConfirmModalOpen(false);
    };

    return (
        <div className={styles.pageWrapper}>
            {/* <Header /> */}
            <div className={styles.contentWrapper}>
                <Sidebar 
                    onLogout={onLogout}
                    onNavigateToDashboard={onNavigateToDashboard}
                    onNavigateToMyProfile={onNavigateToMyProfile}
                    onNavigateToSettings={onNavigateToSettings}
                    currentView={currentView}
                />
                <main className={styles.mainContent}>
                    <h2>{AppStrings.SETTINGS_TITLE}</h2>
                    
                    <section className={styles.settingsSection}>
                        <h3>{AppStrings.SETTINGS_DELETE_ACCOUNT_TITLE}</h3>
                        <p>{AppStrings.SETTINGS_DELETE_WARNING}</p>
                        <button 
                            onClick={handleDeleteAccountClick}
                            className={`${styles.button} ${styles.deleteButton}`}
                        >
                            {AppStrings.SETTINGS_DELETE_BUTTON}
                        </button>
                    </section>
                </main>
            </div>

            <Modal
                isOpen={isConfirmModalOpen}
                onClose={closeModal}
                title={AppStrings.SETTINGS_DELETE_MODAL_TITLE}
                footer={
                    <>
                        <button onClick={closeModal} className={styles.cancelButton} disabled={isDeleting}>
                            {AppStrings.SETTINGS_DELETE_MODAL_CANCEL_BUTTON}
                        </button>
                        <button 
                            onClick={confirmAccountDeletion} 
                            className={styles.confirmButton} 
                            disabled={isDeleting}
                        >
                            {isDeleting ? '삭제 중...' : AppStrings.SETTINGS_DELETE_MODAL_CONFIRM_BUTTON}
                        </button>
                    </>
                }
            >
                <p>{AppStrings.SETTINGS_DELETE_CONFIRMATION}</p> 
                {error && <p className={styles.errorMessage}>{error}</p>}
            </Modal>
        </div>
    );
};

export default Settings; 