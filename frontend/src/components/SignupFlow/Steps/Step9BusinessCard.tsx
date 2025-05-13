import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import styles from '../SignupFlow.module.css';
import { FaPlus } from 'react-icons/fa';
import { StepProps } from '../SignupFlow.types';
import { useImageUpload } from '../../../hooks/useImageUpload';

const Step9BusinessCard: React.FC<StepProps> = ({ data, setData, userSpecificStorageUuid }) => {
    const [preview, setPreview] = useState<string | null>(data.businessCard || null); // 직접 URL 사용
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // useImageUpload 훅 사용
    const {
        uploadImage,
        deleteImage,
        isUploading,
        error: uploadError,
        clearError
    } = useImageUpload({
        userId: userSpecificStorageUuid,
        folderPath: 'business_card'
    });

    useEffect(() => {
        setPreview(data.businessCard || null); // data.businessCard가 변경되면 preview 업데이트
    }, [data.businessCard]);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            
            // 기존 이미지가 있으면 삭제
            if (preview) {
                clearError();
                await deleteImage(preview);
            }
            
            // 새 이미지 업로드
            clearError();
            const result = await uploadImage(file);
            
            if (result.success && result.url) {
                // 부모 컴포넌트의 데이터 업데이트
                setData('businessCard', result.url);
            }
            
            // 파일 입력 초기화
            if (event.target) event.target.value = '';
        }
    };

    const handleRemove = async () => {
        if (isUploading || !preview) return;
        
        clearError();
        await deleteImage(preview);
        
        // 부모 컴포넌트의 데이터 업데이트
        setData('businessCard', null);
    };

    return (
        <div className={styles.stepContainer}>
            <p className={styles.label}>Business Card (Optional)</p>
            
            {isUploading && <p className={styles.statusText}>Processing image...</p>}
            {uploadError && <p className={styles.errorText}>{uploadError}</p>}

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                id="signup-business-card"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleFileChange}
                className={styles.hiddenInput}
                disabled={isUploading}
            />

            {/* Card Container */}
            <div
                className={`${styles.businessCardContainer} ${preview ? styles.filledSlot : styles.emptySlot}`}
                onClick={() => !isUploading && !preview && fileInputRef.current?.click()}
            >
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Business Card"
                            className={styles.businessCardPreview}
                        />
                        {!isUploading && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isUploading) handleRemove();
                                }}
                                className={styles.removeButton}
                            >
                                &times;
                            </button>
                        )}
                    </>
                ) : (
                    <div className={styles.uploadPlaceholder}>
                        <FaPlus size={24} />
                        <span>Upload Business Card</span>
                    </div>
                )}
                {isUploading && <div className={styles.loadingOverlay}></div>}
            </div>
            
            <p className={styles.helperText}>
                Upload a clear picture of your business card to verify your identity. This is optional.
            </p>
        </div>
    );
};

export default Step9BusinessCard; 