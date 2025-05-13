import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import styles from './MyProfile.module.css';
import Sidebar from '../MainPage/Sidebar'; // Import Sidebar
import amieLogo from '../../assets/amie_logo.png'; // Placeholder image
import { FaTimes } from 'react-icons/fa'; // Import X icon
// Import strings
import * as AppStrings from '../../constants/strings';
import { userApi, UserProfile } from '../../api'; // Import userApi and UserProfile
import { useImageUpload } from '../../hooks/useImageUpload'; // 새 훅 가져오기

interface MyProfileProps {
    onNavigateToDashboard: () => void;
    onLogout: () => void;
    onNavigateToMyProfile: () => void; // Pass this for active state if needed
    onNavigateToSettings: () => void; // Add prop type
    currentView: 'dashboard' | 'chat' | 'my-profile' | 'settings'; // Add prop type
}

// Define the structure for the profile data state
interface ProfileStateData {
    nickname: string;
    age: number;
    height: number;
    city: string;
    profileImages: (string | null)[]; // photos에서 profileImages로 변경
}


const MyProfile: React.FC<MyProfileProps> = ({ 
    onNavigateToDashboard, 
    onLogout, 
    onNavigateToMyProfile, 
    onNavigateToSettings,
    currentView 
}) => {
    // Remove originalUserProfile hardcoded data
    // const originalUserProfile = { ... };

    // State for profile data, edit mode, loading, and errors
    const [profileData, setProfileData] = useState<ProfileStateData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [initialProfileData, setInitialProfileData] = useState<ProfileStateData | null>(null);
    const [userId, setUserId] = useState<string | null>(null); // userStorageId에서 userId로 변경

    // useImageUpload 훅 사용
    const { 
        uploadImage,
        deleteImage,
        isUploading: isPhotoProcessing,
        error: imageUploadError,
        clearError: clearImageUploadError
    } = useImageUpload({ userId });

    // Refs for file inputs
    const fileInputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    // 이미지 업로드 에러가 있으면 메인 에러로 설정
    useEffect(() => {
        if (imageUploadError) {
            setError(imageUploadError);
        }
    }, [imageUploadError]);

    // Fetch profile data on component mount
    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await userApi.getProfile();
                if (response.success && response.user) {
                    const userData: UserProfile = response.user; // UserProfile 타입 명시
                    setUserId(userData.id || null);

                    // userData.profileImages (string[])를 사용
                    const fetchedPhotos = userData.profileImages || []; 
                    const photosWithNulls = [
                        fetchedPhotos[0] || null,
                        fetchedPhotos[1] || null,
                        fetchedPhotos[2] || null,
                    ];

                    const initialState: ProfileStateData = {
                        nickname: userData.nickname || '',
                        age: userData.age || 0,
                        height: userData.height || 0,
                        city: userData.city || '',
                        profileImages: photosWithNulls, // photos에서 profileImages로 변경
                    };
                    setProfileData(initialState);
                    setInitialProfileData(initialState);
                } else {
                    throw new Error(response.message || '프로필 정보 로딩 실패');
                }
            } catch (err: any) {
                console.error("MyProfile: Error fetching profile:", err);
                setError(err.message || '프로필 정보를 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []); // Run once on mount

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!profileData) return;
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...(prev as ProfileStateData),
            [name]: (name === 'age' || name === 'height') ? Number(value) || 0 : value
        }));
    };

    // Handle saving changes - Now includes API call
    const handleSave = async () => {
        if (!profileData) return;
        
        const allPhotosFilled = profileData.profileImages.every(photo => photo !== null && photo !== '');
        if (!allPhotosFilled) {
            alert(AppStrings.MYPROFILE_ALERT_NEED_3_PHOTOS);
            return; 
        }

        setIsSaving(true);
        setError(null);

        try {
            const payload = {
                nickname: profileData.nickname,
                height: profileData.height,
                city: profileData.city,
                profileImages: profileData.profileImages.filter(p => p !== null) as string[], // null이 아닌 URL만 필터링하여 전송
                // age는 birthYear로 변환하거나, API가 age를 직접 받는 경우 (현재 UserProfile에는 age가 있음)
                // userApi.updateProfile의 ProfileData에는 age 필드가 없음. API 수정 또는 birthYear 변환 필요.
                // 여기서는 age를 보내지 않음.
            };
            
            const response = await userApi.updateProfile(payload);

            if (response.success) {
                setInitialProfileData(profileData); // 저장 성공 시 현재 상태를 initial로 설정
                setIsEditing(false);
                alert('프로필이 성공적으로 업데이트되었습니다.');
            } else {
                throw new Error(response.message || '프로필 업데이트에 실패했습니다.');
            }

        } catch (err: any) {
            console.error("MyProfile: Error saving profile:", err);
            setError(err.message || '프로필 저장 중 오류가 발생했습니다.');
            alert(`오류: ${err.message || '프로필 저장 중 오류 발생'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle canceling edit - reset to initial loaded data
    const handleCancel = () => {
        if (initialProfileData) {
            setProfileData(initialProfileData);
        } 
        setIsEditing(false);
    };

    // Handle triggering file input click
    const handlePhotoClick = (index: number) => {
        if (isEditing) {
            fileInputRefs[index].current?.click();
        }
    };

    // Handle file selection - 수정된 버전, useImageUpload 훅 사용
    const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>, index: number) => {
        const file = event.target.files?.[0];
        if (!file || isPhotoProcessing) return;
        
        clearImageUploadError();
        setError(null);

        // 기존 이미지가 있으면 먼저 삭제
        const currentUrl = profileData?.profileImages[index];
        if (currentUrl) {
            await deleteImage(currentUrl);
        }

        // 새 이미지 업로드
        const result = await uploadImage(file);
        
        if (result.success && result.url) {
            setProfileData(prev => {
                if (!prev) return null;
                const newPhotos = [...prev.profileImages];
                newPhotos[index] = result.url as string;
                return { ...prev, profileImages: newPhotos };
            });
        }
        
        // 파일 입력 초기화
        if (event.target) event.target.value = '';
    };

    // Handle photo deletion - 수정된 버전, useImageUpload 훅 사용
    const handlePhotoDelete = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!profileData || isPhotoProcessing) return;

        const urlToDelete = profileData.profileImages[index];
        if (!urlToDelete) return;
        
        clearImageUploadError();
        setError(null);

        // 이미지 삭제
        const success = await deleteImage(urlToDelete);
        
        if (success) {
            // UI에서 이미지 제거
            setProfileData(prev => {
                if (!prev) return null;
                const newPhotos = [...prev.profileImages];
                newPhotos[index] = null;
                return { ...prev, profileImages: newPhotos };
            });
        }
    };

    // Show loading state
    if (isLoading) {
        return (
             <div className={styles.pageWrapper}>
                {/* <Header /> */}
                <div className={styles.contentWrapper}>
                    <Sidebar {...{ onLogout, onNavigateToDashboard, onNavigateToMyProfile, onNavigateToSettings, currentView }} />
                    <main className={styles.mainContent}><p>프로필 로딩 중...</p></main>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className={styles.pageWrapper}>
                {/* <Header /> */}
                <div className={styles.contentWrapper}>
                    <Sidebar {...{ onLogout, onNavigateToDashboard, onNavigateToMyProfile, onNavigateToSettings, currentView }} />
                    <main className={styles.mainContent}><p className={styles.errorMessage}>오류: {error}</p></main>
                </div>
            </div>
        );
    }

    // Show profile content if data loaded successfully
    if (!profileData) {
         return (
            <div className={styles.pageWrapper}>
                {/* <Header /> */}
                <div className={styles.contentWrapper}>
                    <Sidebar {...{ onLogout, onNavigateToDashboard, onNavigateToMyProfile, onNavigateToSettings, currentView }} />
                    <main className={styles.mainContent}><p>프로필 데이터를 표시할 수 없습니다.</p></main>
                </div>
            </div>
        ); // Should ideally not be reached if loading/error handled
    }

    return (
        <div className={styles.pageWrapper}>
            {/* <Header /> */}
            <div className={styles.contentWrapper}>
                {/* Add Sidebar for consistent navigation */}
                <Sidebar 
                    onLogout={onLogout}
                    onNavigateToDashboard={onNavigateToDashboard}
                    onNavigateToMyProfile={onNavigateToMyProfile}
                    onNavigateToSettings={onNavigateToSettings}
                    currentView={currentView} // Pass down
                />
                
                <main className={styles.mainContent}>
                    {/* Use constants for title */}
                    <h2>{AppStrings.MYPROFILE_TITLE} {isEditing ? AppStrings.MYPROFILE_EDITING_SUFFIX : ''}</h2>
                    
                    {(isPhotoProcessing) && <p className={styles.statusText}>사진 처리 중...</p>} {/* 사진 처리 중 메시지 */} 
                    {error && <p className={styles.errorMessage}>{error}</p>} {/* 오류 메시지 표시 위치 개선 */} 
                    
                    <div className={styles.profileCardLike}> {/* New wrapper class */} 
                        {/* Photo Grid */}
                        <div className={styles.photoGrid}>
                            {profileData.profileImages.map((photoUrl, index) => (
                                <div 
                                    key={index} 
                                    className={`${styles.photoContainer} ${isEditing ? styles.editablePhoto : ''} ${isPhotoProcessing ? styles.disabledInteraction : ''}`}
                                    onClick={() => !isPhotoProcessing && handlePhotoClick(index)} 
                                >
                                    {/* Hidden file input */} 
                                    <input 
                                        type="file"
                                        ref={fileInputRefs[index]}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={(e) => handlePhotoUpload(e, index)}
                                        disabled={!userId || isSaving || isPhotoProcessing || !isEditing}
                                    />
                                    
                                    {/* Conditional Rendering based on photoUrl */}
                                    {photoUrl ? (
                                        // If photo exists, show image and delete button (in edit mode)
                                        <>
                                            <img 
                                                src={photoUrl} 
                                                alt={`Profile ${index + 1}`}
                                                className={styles.profilePhoto} 
                                            />
                                            {isEditing && (
                                                <button 
                                                    className={styles.deletePhotoButton}
                                                    onClick={(e) => handlePhotoDelete(index, e)}
                                                    title={AppStrings.MYPROFILE_DELETE_PHOTO_TITLE} // Use constant
                                                    disabled={isSaving || isPhotoProcessing}
                                                >
                                                    <FaTimes />
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        // If photo is null/empty
                                        isEditing ? (
                                            // Show upload prompt in edit mode
                                            <div className={styles.uploadPrompt}>
                                                {AppStrings.MYPROFILE_UPLOAD_PROMPT} { /* Use constant */}
                                            </div>
                                        ) : (
                                            // Show placeholder logo in view mode
                                            <img 
                                                src={amieLogo} 
                                                alt={`Upload photo ${index + 1}`}
                                                className={`${styles.profilePhoto} ${styles.placeholderLogo}`}
                                            />
                                        )
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Info Box - Conditionally render inputs/text */}
                        <div className={styles.infoBox}>
                            <div className={styles.infoItem}>
                                <label>{AppStrings.MYPROFILE_LABEL_NICKNAME}</label> { /* Use constant */}
                                {isEditing ? (
                                    <input type="text" name="nickname" value={profileData.nickname} onChange={handleChange} className={styles.inputField} disabled={isPhotoProcessing || isSaving} />
                                ) : (
                                    <span>{profileData.nickname}</span>
                                )}
                            </div>
                            <div className={styles.infoItem}>
                                <label>{AppStrings.MYPROFILE_LABEL_AGE}</label> { /* Use constant */}
                                {isEditing ? (
                                    <input type="number" name="age" value={profileData.age} onChange={handleChange} className={styles.inputFieldSmall} disabled={isPhotoProcessing || isSaving} />
                                ) : (
                                    <span>{profileData.age}세</span>
                                )}
                            </div>
                            <div className={styles.infoItem}>
                                <label>{AppStrings.MYPROFILE_LABEL_HEIGHT}</label> { /* Use constant */}
                                {isEditing ? (
                                    <input type="number" name="height" value={profileData.height} onChange={handleChange} className={styles.inputFieldSmall} disabled={isPhotoProcessing || isSaving} />
                                ) : (
                                    <span>{profileData.height}cm</span>
                                )}
                            </div>
                            <div className={styles.infoItem}>
                                <label>{AppStrings.MYPROFILE_LABEL_CITY}</label> { /* Use constant */}
                                {isEditing ? (
                                    <input type="text" name="city" value={profileData.city} onChange={handleChange} className={styles.inputField} disabled={isPhotoProcessing || isSaving} />
                                ) : (
                                    <span>{profileData.city}</span>
                                )}
                            </div>
                        </div>

                        {/* Edit/Save/Cancel Buttons */}
                        <div className={styles.buttonContainer}>
                            {isEditing ? (
                                <>
                                    <button 
                                        onClick={handleSave} 
                                        className={`${styles.button} ${styles.saveButton}`}
                                        disabled={isSaving || isPhotoProcessing || !profileData.profileImages.every(photo => photo !== null && photo !== '')}
                                    >
                                        {isSaving ? '저장 중...' : AppStrings.MYPROFILE_BUTTON_SAVE}
                                    </button>
                                    <button 
                                        onClick={handleCancel} 
                                        className={`${styles.button} ${styles.cancelButton}`}
                                        disabled={isSaving || isPhotoProcessing}
                                    >
                                        {AppStrings.MYPROFILE_BUTTON_CANCEL}
                                    </button>
                                </> 
                            ) : (
                                <button onClick={() => setIsEditing(true)} className={`${styles.button} ${styles.editButton}`} disabled={isPhotoProcessing}>
                                    {AppStrings.MYPROFILE_BUTTON_EDIT}
                                </button>
                            )}
                        </div>

                    </div> 
                </main>
            </div>
        </div>
    );
};

export default MyProfile; 