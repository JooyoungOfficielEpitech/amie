import React, { useState, useEffect } from 'react';
import { ResizableBox } from 'react-resizable';
import styles from './ProfileCard.module.css';
import 'react-resizable/css/styles.css';
import axiosInstance from '../../api/axiosConfig';
import * as AppStrings from '../../constants/strings';
import { usePayment } from '../../hooks/usePayment';
import Modal from '../common/Modal'; // Import Modal
import { fetchWithAuth } from '../../utils/auth'; // Assume fetchWithAuth handles auth headers
import { CREDIT_MESSAGES } from '../../constants/credits';

// API 응답에서 matchedUser 부분의 타입 정의 업데이트
interface MatchedUserInfo {
    id: string;
    nickname: string;
    birthYear: number;
    height: number;
    city: string;
    profileImages: string[];
    gender?: string; // 성별 정보 추가
    unlockedPhotoSlotIndexes?: number[]; // 해제된 사진 슬롯 인덱스 배열 (optional)
}

// API 응답 전체 구조 (ChatRoomId 포함)
interface MatchStatusResponse {
    success: boolean;
    isWaiting: boolean;
    matchedUser: MatchedUserInfo | null;
    chatRoomId: string | null;
    error?: string; // 에러 메시지 필드 추가
}

// Interface for ProfileCard Props - Updated
interface ProfileCardProps {
    chatSocket: any; // Use any type for socket
    roomId: string | null;   // Accept room ID or null
    onCreditUpdate?: () => Promise<void>; // 크레딧 업데이트 함수 추가
}

const ProfileCard: React.FC<ProfileCardProps> = ({ chatSocket, roomId }) => {
    const [width, setWidth] = useState(650); // Initial width set to 650
    const [maxConstraints, setMaxConstraints] = useState<[number, number]>([window.innerWidth / 2, Infinity]);
    const [unlockedPhotos, setUnlockedPhotos] = useState<boolean[]>([false, false, false]);
    const [expandedPhotoIndex, setExpandedPhotoIndex] = useState<number | null>(null);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false); // State for leave modal
    const [isLeaving, setIsLeaving] = useState(false); // State for leave loading
    const [currentChatRoomId, setCurrentChatRoomId] = useState<string | null>(roomId); // API에서 받을 chatRoomId 저장
    const [matchedUser, setMatchedUser] = useState<MatchedUserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // usePayment 훅 사용
    const { requestProfileUnlockPayment } = usePayment();

    useEffect(() => {
        const handleResize = () => {
            setMaxConstraints([window.innerWidth / 2, Infinity]);
            // Optional: Adjust width if it exceeds the new max constraint
            if (width > window.innerWidth / 2) {
                setWidth(window.innerWidth / 2);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Set initial constraints

        const fetchMatchStatus = async () => {
            if (!roomId) {
                 setIsLoading(false);
                 setMatchedUser(null);
                 setCurrentChatRoomId(null);
                 return;
            }
            setCurrentChatRoomId(roomId); // roomId prop으로 내부 상태 업데이트

            console.log(`[ProfileCard] 매칭 상태 확인 시작: roomId=${roomId}`);
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetchWithAuth('/api/match/status'); // 이 API는 현재 사용자의 매칭 상태를 가져옴
                const data: MatchStatusResponse = await response.json();

                console.log('[ProfileCard] 매칭 상태 응답:', data);

                if (!response.ok) {
                    throw new Error(data.error || '매칭 상태를 불러오는데 실패했습니다.');
                }

                if (data.success && data.matchedUser && data.chatRoomId) {
                    console.log(`[ProfileCard] 매칭된 사용자 정보: nickname=${data.matchedUser.nickname}, gender=${data.matchedUser.gender}`);
                    setMatchedUser(data.matchedUser);
                    setCurrentChatRoomId(data.chatRoomId); // 실제 chatRoomId로 업데이트
                    
                    // unlockedPhotos 상태 초기화
                    const initialUnlockStates = Array(data.matchedUser.profileImages.length).fill(false);
                    if (data.matchedUser.unlockedPhotoSlotIndexes) {
                        console.log(`[ProfileCard] 해제된 사진 슬롯: ${data.matchedUser.unlockedPhotoSlotIndexes.join(', ')}`);
                        data.matchedUser.unlockedPhotoSlotIndexes.forEach(index => {
                            if (index >= 0 && index < initialUnlockStates.length) {
                                initialUnlockStates[index] = true;
                            }
                        });
                    }
                    setUnlockedPhotos(initialUnlockStates);

                } else if (data.success && data.isWaiting) {
                    console.log('[ProfileCard] 매칭 대기 중');
                    setMatchedUser(null);
                } else {
                    console.log('[ProfileCard] 매칭 정보 없음:', data.error || '매칭 정보를 찾을 수 없습니다.');
                    setMatchedUser(null);
                    setError(data.error || '매칭 정보를 찾을 수 없습니다.');
                }
            } catch (err: any) {
                console.error("[ProfileCard] 매칭 상태 확인 오류:", err);
                setError(err.message || '매칭 상태 로딩 중 오류 발생');
                setMatchedUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMatchStatus();

        return () => window.removeEventListener('resize', handleResize);
    // roomId가 변경될 때마다 매칭 상태를 다시 가져옵니다.
    }, [roomId]); // roomId prop 변경 시 재실행

    const handleUnlockPhoto = async (index: number) => {
        if (!currentChatRoomId || !matchedUser || unlockedPhotos[index]) return; // 이미 해제되었거나 정보 없으면 실행 안 함
        
        // 크레딧 결제 요청 (5 크레딧 사용)
        const paymentRequested = requestProfileUnlockPayment(
            index,
            // onSuccess
            async (photoIndex) => {
                const originalUnlockStates = [...unlockedPhotos];
                const newUnlockStates = [...originalUnlockStates];
                newUnlockStates[photoIndex] = true;
                setUnlockedPhotos(newUnlockStates);
                
                try {
                    // API 호출하여 서버에 잠금 해제 상태 저장
                    const response = await axiosInstance.post(`/api/chat-rooms/${currentChatRoomId}/unlock-slot`, { slotIndex: photoIndex });
                    
                    if (!response.data.success) {
                        throw new Error(response.data.error || '사진 해제에 실패했습니다.');
                    }
                    
                    console.log(`Photo ${photoIndex + 1} successfully unlocked via API.`);
                } catch (err: any) {
                    console.error('Photo unlock API error:', err);
                    // 오류 발생 시 UI 상태 롤백
                    setUnlockedPhotos(originalUnlockStates);
                    setError(err.message || '사진 잠금 해제 중 오류가 발생했습니다.');
                }
            },
            // onError
            (errorMsg) => {
                console.error('Credit payment failed:', errorMsg);
                setError(errorMsg || CREDIT_MESSAGES.PAYMENT_FAILED);
            }
        );

        if (!paymentRequested) {
            console.error('크레딧 결제 요청에 실패했습니다.');
            // Error already handled by onError callback
        }
    };

    // Handler for clicking on a photo container (for expansion)
    const handlePhotoClick = (index: number) => {
        // Only allow expansion if the photo is unlocked and user data exists
        if (matchedUser && unlockedPhotos[index]) {
            setExpandedPhotoIndex(expandedPhotoIndex === index ? null : index);
        }
    };

    // Function to open the leave confirmation modal
    const handleLeaveChatClick = () => {
        // Disable if roomId is not available
        if (!roomId) return; 
        setIsLeaveModalOpen(true);
    };

    // Function to confirm leaving the chat - Updated
    const confirmLeaveChat = () => {
        // Disable if socket or roomId is missing, or already leaving
        if (!chatSocket || !roomId || isLeaving) return;
        console.log(`[confirmLeaveChat] Emitting leave_chat for room ${roomId}`);
        setIsLeaving(true);
        
        chatSocket.emit('leave_chat', roomId);
        
        setIsLeaveModalOpen(false);
    };

    // Function to close the leave modal - Updated
    const closeLeaveModal = () => {
        if (isLeaving) return; 
        setIsLeaveModalOpen(false);
    };

    // --- Rendering Logic ---

    if (isLoading) {
        return (
            <div className={styles.profileCard} style={{ width: `${width}px`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <p>상대방 정보 로딩 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.profileCard} style={{ width: `${width}px`, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'red' }}>
                <p>오류: {error}</p>
            </div>
        );
    }

    if (!matchedUser) {
        // This case might occur if roomId is null or API returns no matched user (e.g., still waiting)
        return (
             <div className={styles.profileCard} style={{ width: `${width}px`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                 <p>매칭된 사용자가 없습니다.</p>
             </div>
         );
    }

    // Calculate age from birthYear
    const currentYear = new Date().getFullYear();
    const age = matchedUser.birthYear ? currentYear - matchedUser.birthYear + 1 : AppStrings.PROFILECARD_INFO_MISSING;

    return (
        <ResizableBox
            width={width}
            height={Infinity}
            axis="x"
            resizeHandles={['w']}
            // Pass the component instance directly again
            // handle={<CustomWHandle />} 리사이징 가능하게
            onResize={(_event, { size }) => setWidth(size.width)}
            minConstraints={[200, Infinity]}
            maxConstraints={maxConstraints}
            className={styles.resizableBoxWrapper}
        >
            {/* Updated inner content structure */}
            <aside className={styles.profileCard} style={{ width: '100%', height: '100%' }}>
                {/* Photo Grid */}
                <div className={styles.photoGrid}>
                    {matchedUser.profileImages.map((photoUrl, index) => (
                        <div
                            key={index}
                            className={styles.photoContainer}
                            onClick={() => handlePhotoClick(index)}
                        >
                            {/* Show actual photo or placeholder/logo */}
                            <img
                                // Use photoUrl from fetched data. Unlock logic might change this later.
                                src={photoUrl}
                                alt={`${AppStrings.PROFILECARD_PHOTO_ALT_PREFIX}${matchedUser.nickname}${AppStrings.PROFILECARD_PHOTO_ALT_SUFFIX} ${index + 1}`}
                                className={`${styles.profilePhoto} ${!unlockedPhotos[index] ? styles.blurred : ''}`}
                            />
                            {/* Unlock overlay/button */}
                            {!unlockedPhotos[index] && (
                                <div className={styles.unlockOverlay}>
                                    <button
                                        className={styles.unlockButton}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent container click
                                            handleUnlockPhoto(index);
                                        }}
                                    >
                                        {AppStrings.PROFILECARD_UNLOCK_BUTTON} {/* Use constant */}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                {/* Text info container */}
                <div className={styles.textInfoContainer}>
                    <div className={styles.infoBox}>
                        {/* Use fetched data */}
                        <h3>{matchedUser.nickname}</h3>
                        <div className={styles.infoRow}>
                             <span>{age}{age !== AppStrings.PROFILECARD_INFO_MISSING ? AppStrings.PROFILECARD_AGE_SUFFIX : ''}</span>
                            <span> {AppStrings.PROFILECARD_INFO_SEPARATOR} </span>
                             <span>{matchedUser.height ? `${matchedUser.height}${AppStrings.PROFILECARD_HEIGHT_SUFFIX}` : AppStrings.PROFILECARD_INFO_MISSING}</span>
                        </div>
                        <p className={styles.city}>{matchedUser.city || AppStrings.PROFILECARD_INFO_MISSING}</p>
                    </div>
                </div>

                {/* Expanded Photo View Area or Placeholder */}
                {expandedPhotoIndex !== null && unlockedPhotos[expandedPhotoIndex] ? (
                    <div
                        className={styles.expandedPhotoView}
                        onClick={() => setExpandedPhotoIndex(null)}
                    >
                        <img
                             // Use photoUrl from fetched data for the expanded view
                             src={matchedUser.profileImages[expandedPhotoIndex]}
                            alt={`${AppStrings.PROFILECARD_EXPANDED_PHOTO_ALT_PREFIX} ${expandedPhotoIndex + 1}`}
                        />
                    </div>
                ) : (
                    <div className={styles.photoPlaceholder}>
                        <span>{AppStrings.PROFILECARD_PLACEHOLDER_EXPAND}</span>
                    </div>
                )}

                {/* Leave Chat Button - Disable if roomId is null */}
                <button 
                    onClick={handleLeaveChatClick} 
                    className={`${styles.button} ${styles.leaveChatButton}`}
                    disabled={!currentChatRoomId || isLeaving} // Disable if no roomId or already leaving
                >
                    {isLeaving ? '나가는 중...' : AppStrings.PROFILECARD_LEAVE_CHAT_BUTTON}
                </button>
                
            </aside>

            {/* Leave Chat Confirmation Modal - Conditionally render based on isLeaveModalOpen */}
            {isLeaveModalOpen && (
                 <Modal
                     isOpen={isLeaveModalOpen}
                     onClose={closeLeaveModal}
                     title={AppStrings.PROFILECARD_LEAVE_CHAT_MODAL_TITLE}
                     footer={
                         <>
                             <button onClick={closeLeaveModal} className={styles.cancelButton} disabled={isLeaving}>
                                 {AppStrings.PROFILECARD_LEAVE_CHAT_MODAL_CANCEL_BUTTON}
                             </button>
                             <button onClick={confirmLeaveChat} className={styles.confirmButton} disabled={isLeaving}>
                                 {isLeaving ? '처리 중...' : AppStrings.PROFILECARD_LEAVE_CHAT_MODAL_CONFIRM_BUTTON}
                             </button>
                         </>
                     }
                 >
                     <p>{AppStrings.PROFILECARD_LEAVE_CHAT_CONFIRMATION}</p>
                 </Modal>
            )}

        </ResizableBox>
    );
};

export default ProfileCard; 