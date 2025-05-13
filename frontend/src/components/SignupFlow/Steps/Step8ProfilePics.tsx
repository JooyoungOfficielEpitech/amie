import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import styles from '../SignupFlow.module.css';
import { FaPlus } from 'react-icons/fa';
import { useImageUpload } from '../../../hooks/useImageUpload'; // 새 훅 가져오기
import { StepProps } from '../SignupFlow.types';

const MAX_PICS = 3;

const Step8ProfilePics: React.FC<StepProps> = ({ data, setData, userSpecificStorageUuid }) => {
    // previews는 이미 string | null 타입이므로 그대로 사용
    const [previews, setPreviews] = useState<(string | null)[]>(data.profilePics || Array(MAX_PICS).fill(null));
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeSlot, setActiveSlot] = useState<number | null>(null);
    
    // useImageUpload 훅 사용
    const {
        uploadImage,
        deleteImage,
        isUploading,
        error: uploadError,
        clearError
    } = useImageUpload({
        userId: userSpecificStorageUuid,
        folderPath: 'profile'
    });

    // data.profilePics (URL 배열)가 변경될 때 previews 동기화
    useEffect(() => {
        setPreviews(data.profilePics && data.profilePics.length > 0 ? data.profilePics : Array(MAX_PICS).fill(null));
    }, [data.profilePics]);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0 && activeSlot !== null) {
            const file = event.target.files[0];
            
            // 이미지 업로드 훅 사용
            clearError();
            const result = await uploadImage(file);

            if (result.success && result.url) {
                // data.profilePics를 직접 수정하지 않고 setData를 통해 부모 상태 업데이트
                const currentPics = [...(previews || Array(MAX_PICS).fill(null))]; 
                currentPics[activeSlot] = result.url;
                setData('profilePics', currentPics);
            }
            
            // 파일 입력 초기화
            if (event.target) event.target.value = '';
        }
    };

    const handleRemovePic = async (index: number) => {
        if (isUploading) return;

        const photoUrl = previews[index];
        if (photoUrl) {
            clearError();
            await deleteImage(photoUrl);
        }

        // UI 업데이트
        const newPics = [...previews];
        newPics[index] = null;
        setData('profilePics', newPics);
    };

    // Trigger hidden file input click for a specific slot
    const handleSlotClick = (index: number) => {
        if (!previews[index] && !isUploading) { // 업로드 중이 아닐 때만 슬롯 클릭 허용
             setActiveSlot(index);
             fileInputRef.current?.click();
        }
    };

    return (
        <div className={styles.stepContainer}>
            <p className={styles.label}>Profile Pictures ({previews.filter(p => p !== null).length}/{MAX_PICS} uploaded)</p>

            {isUploading && <p className={styles.statusText}>Processing image...</p>}
            {uploadError && <p className={styles.errorText}>{uploadError}</p>}

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                id="signup-profile-pics"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleFileChange}
                className={styles.hiddenInput}
                disabled={isUploading} // 업로드 중 비활성화
            />

            {/* Placeholders / Previews Container */}
            <div className={styles.profileSlotsContainer}>
                {previews.map((previewUrl, index) => (
                    <div
                        key={index}
                        className={`${styles.profileSlot} ${previewUrl ? styles.filledSlot : styles.emptySlot} ${isUploading && activeSlot === index ? styles.uploadingSlot : ''}`}
                        onClick={() => !isUploading && handleSlotClick(index)} // 업로드 중이 아닐 때만 클릭 가능
                    >
                        {previewUrl ? (
                            <>
                                <img src={previewUrl} alt={`Profile ${index + 1}`} className={styles.previewImage} />
                                {!isUploading && ( // 업로드 중이 아닐 때만 삭제 버튼 표시
                                    <button type="button" onClick={(e) => { e.stopPropagation(); if (!isUploading) handleRemovePic(index); }} className={styles.removeButton}>&times;</button>
                                )}
                            </>
                        ) : (
                            <div className={styles.uploadPlaceholder}>
                                <FaPlus size={24} />
                                <span>Upload Photo</span>
                            </div>
                        )}
                         {/* 업로드 중 슬롯에 대한 시각적 피드백 */}
                        {isUploading && activeSlot === index && <div className={styles.loadingOverlay}></div>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Step8ProfilePics; 