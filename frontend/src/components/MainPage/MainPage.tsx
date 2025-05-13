import React, { useState, useEffect, useCallback } from 'react';
import styles from './MainPage.module.css';
import Sidebar from './Sidebar';
import { userApi, UserProfile, chatApi } from '../../api';
import { creditApi } from '../../api/creditApi'; // 크레딧 API 직접 임포트
import amieLogo from '../../assets/amie_logo.png';
import * as AppStrings from '../../constants/strings';
import io from "socket.io-client";
import { usePayment } from '../../contexts/PaymentContext';
import { useCredit } from '../../contexts/CreditContext';
import { CREDIT_MESSAGES } from '../../constants/credits';

// 성별별 매칭 컴포넌트 가져오기
import MaleMatchingBox from './MaleMatchingBox';
import FemaleMatchingBox from './FemaleMatchingBox';

// 매칭에 필요한 크레딧
const REQUIRED_MATCHING_CREDIT = 10;

// --- Add isWaitingForMatch to UserProfile interface ---
interface ExtendedUserProfile extends UserProfile {
  isWaitingForMatch: boolean;
}
// --- End Add interface ---

// Define props
interface MainPageProps {
    onLogout: () => void;
    onNavigateToChat: (roomId: string) => void; // Make roomId required
    onNavigateToMyProfile: () => void;
    onNavigateToSettings: () => void;
    currentView: 'dashboard' | 'chat' | 'my-profile' | 'settings';
    onCreditUpdate: () => Promise<void>; // Add the missing prop type
}

const MainPage: React.FC<MainPageProps> = ({ onLogout, onNavigateToChat, onNavigateToMyProfile, onNavigateToSettings, currentView, onCreditUpdate }) => {
    console.log('--- MainPage Component Render Start ---'); // 추가된 로그

    // State for Profile API data and loading/error
    const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null); // General error state

    // State for matching
    const [isMatching, setIsMatching] = useState<boolean>(false);
    const [isLoadingMatchAction, setIsLoadingMatchAction] = useState<boolean>(false);
    const [matchSocket, setMatchSocket] = useState<any | null>(null); // Use 'any' to bypass type errors
    const [matchError, setMatchError] = useState<string | null>(null); // Add matchError state
    // Dedicated state for socket connection status
    const [isSocketConnectedState, setIsSocketConnectedState] = useState<boolean>(false);
    const [matchedRoomId, setMatchedRoomId] = useState<string | null>(null); // <-- 매칭된 방 ID 상태 추가
    const [isLoadingRoomStatus, setIsLoadingRoomStatus] = useState<boolean>(false); // <-- Add loading state for room status check

    usePayment();
    
    const { fetchCredit, credit: contextCredit } = useCredit();

    // Fetch initial data on mount (profile)
    useEffect(() => {
        const fetchProfileData = async () => {
            setIsLoadingProfile(true);
            setError(null); // Reset general error on profile fetch
            try {
                const profileResponse = await userApi.getProfile();
                if (profileResponse.success && profileResponse.user) {
                    setProfile(profileResponse.user as ExtendedUserProfile);
                    
                    // 매칭 상태 설정
                    setIsMatching(profileResponse.user.isWaitingForMatch);
                    setMatchedRoomId(profileResponse.user.matchedRoomId || null);
                    
                    // 프로필 로딩 시에도 크레딧 정보 업데이트
                    if (onCreditUpdate) {
                        console.log('[MainPage] Updating credit on profile load');
                        await onCreditUpdate();
                    }
                } else {
                    throw new Error(profileResponse.message || '프로필 정보 로딩 실패');
                }
            } catch (err: any) {
                console.error("Error fetching profile:", err);
                setError(`프로필 로딩 오류: ${err.message}`);
            } finally {
                console.log("[MainPage Profile Effect] Setting isLoadingProfile to false.");
                setIsLoadingProfile(false);
            }
        };
        fetchProfileData();
    }, []);

    // WebSocket connection for matching
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("No token found, cannot connect to match socket");
            setError("로그인이 필요합니다."); // Set error if no token
            return;
        }

        // Connect to the /match namespace
        const socket = io(`${import.meta.env.VITE_API_BASE_URL || '/api'}/match`, {
             auth: { token },
             transports: ['websocket'] // Explicitly use WebSocket
        });

        setMatchSocket(socket);

        socket.on('connect', () => {
            console.log('Connected to /match namespace');
            setError(null); // Clear error on successful connect
            setIsSocketConnectedState(true); // Update connection state
            
            // 소켓 연결 시 프로필에서 이미 가져온 isWaitingForMatch 상태 확인
            if (profile && profile.isWaitingForMatch) {
                setIsMatching(true);
                console.log('[MainPage Socket Connect] User is already in matching state based on profile data');
            }
        });

        socket.on('disconnect', (reason: any) => {
            console.log('Disconnected from /match namespace:', reason);
            setIsSocketConnectedState(false); // Update connection state
            // 연결이 끊겼을 때 isMatching 상태를 변경하지 않음 (상태 지속성 유지)
            // 재연결 시 서버 측에서 current_match_status 이벤트로 올바른 상태를 알려줌
        });

        socket.on('connect_error', (err: any) => {
            console.error('Match socket connection error:', err);
            setError(`매칭 서버 연결 실패: ${err.message}`);
            setIsSocketConnectedState(false); // Update connection state
            // 연결 오류 시에도 매칭 상태를 변경하지 않음
        });

        // Listen for match success
        socket.on('match_success', (data: { roomId: string; partner: any; creditUsed: number }) => {
            console.log('Match Success!', data);
            setIsLoadingMatchAction(false);
            setIsMatching(false);
            setMatchedRoomId(data.roomId);
            
            // 매칭 성공 시 크레딧 업데이트 - profile unlock과 동일한 방식 적용
            console.log('[MainPage] Updating credit after match success (deducted:', data.creditUsed, ')');
            
            // 직접 creditApi를 호출하여 최신 크레딧 정보 가져오기
            (async () => {
                try {
                    // 백엔드에서 이미 차감이 완료된 후 최신 정보 직접 조회
                    const creditResponse = await creditApi.getCurrent();
                    if (creditResponse.success && creditResponse.data) {
                        console.log('[MainPage] Credit updated directly from API:', creditResponse.data.credit);
                        
                        // CreditContext의 상태 직접 업데이트 (중요: 전역 상태 업데이트)
                        await fetchCredit();
                        
                        // 크레딧 정보 업데이트 (App과 Header 모두 갱신)
                        if (onCreditUpdate) {
                            await onCreditUpdate();
                            console.log('[MainPage] Parent components notified of credit update');
                        }
                    } else {
                        console.error('[MainPage] Failed to get updated credit:', creditResponse.message || 'Unknown error');
                    }
                } catch (err) {
                    console.error('[MainPage] Error fetching credit after match:', err);
                }
            })();
        });

        // Listen for match errors from the server
        socket.on('match_error', (errorData: { message: string }) => {
            console.error('Match Error from server:', errorData);
            setError(`매칭 오류: ${errorData.message}`);
            setIsLoadingMatchAction(false);
            
            // '이미 매칭 대기 중입니다' 오류인 경우 isMatching 상태를 true로 설정
            if (errorData.message === '이미 매칭 대기 중입니다') {
                console.log('[MainPage] Already in matching queue, updating state');
                setIsMatching(true);
                setMatchError(null); // 오류 메시지를 지워 사용자 혼란 방지
            }
            // 매칭 에러가 발생해도 isMatching 상태를 유지할 수 있도록 주석 처리
            // 서버에서 제대로 된 상태를 current_match_status로 보내줄 것임
            // setIsMatching(false); 
        });

        // Listener for match cancellation confirmation
        socket.on('match_cancelled', () => {
            console.log('[MainPage] Match cancelled successfully.');
            setIsMatching(false);
            
            // 매칭 취소 시에도 크레딧 정보 업데이트
            if (onCreditUpdate) {
                console.log('[MainPage] Updating credit on match cancellation');
                onCreditUpdate().catch(err => {
                    console.error('[MainPage] Error updating credit on match cancellation:', err);
                });
            }
            
            // Optionally show a success message
        });

        // Listener for errors during cancellation
        socket.on('cancel_error', (data: { message: string }) => {
            console.error('[MainPage] Error cancelling match:', data.message);
            setMatchError(`매칭 취소 실패: ${data.message}`);
            // Keep isMatching true so user can try again or see the error
        });

        // --- Add Listener for current_match_status --- 
        socket.on('current_match_status', (data: { isMatching: boolean }) => {
            console.log('[MainPage] Received current_match_status:', data);
            setIsMatching(data.isMatching);
            
            // 매칭 상태 업데이트 시 크레딧 정보도 업데이트
            if (onCreditUpdate) {
                console.log('[MainPage] Updating credit on match status change');
                onCreditUpdate().catch(err => {
                    console.error('[MainPage] Error updating credit on match status change:', err);
                });
            }
            
            // Optionally clear errors if status is updated
            // setError(null);
            // setMatchError(null);
        });
        // --- End Add Listener --- 

        // Cleanup on component unmount
        return () => {
            console.log('Disconnecting match socket...');
            socket.disconnect();
            setMatchSocket(null);
            setIsLoadingMatchAction(false);
            socket.off('current_match_status'); // <-- Unregister the new listener
            // 상태 초기화 부분을 제거하여 상태 지속성 유지
            // setIsMatching(false);
            // setMatchedRoomId(null);
        };
    }, [profile, onCreditUpdate, fetchCredit]); // fetchCredit 의존성 추가

    // Handle Match Button Click (Start/Cancel/Go to Chat) - 여성 사용자용
    const handleMatchButtonClick = useCallback(async () => {
        // --- Go to Chatroom Logic ---
        if (matchedRoomId) {
            setIsLoadingRoomStatus(true); // <-- Start loading
            setMatchError(null);
            try {
                const statusResponse = await chatApi.getChatRoomStatus(matchedRoomId);
                if (statusResponse.success && statusResponse.isActive) {
                    onNavigateToChat(matchedRoomId);
                    setMatchedRoomId(null); // Clear state after successful navigation intent
                } else if (statusResponse.success && !statusResponse.isActive) {
                    setMatchError(AppStrings.CHATPAGE_PARTNER_LEFT_MESSAGE); // Show partner left message
                    setMatchedRoomId(null); // Clear the invalid room ID
                    setIsMatching(false); // Ensure matching state is also false
                } else {
                    // API call failed or returned success: false
                    setMatchError(statusResponse.message || '채팅방 상태 확인 실패');
                    // Optionally clear matchedRoomId here too, or let user retry?
                    // setMatchedRoomId(null);
                }
            } catch (error: any) {
                console.error('Error checking chat room status:', error);
                setMatchError('채팅방 상태 확인 중 오류 발생');
            } finally {
                 setIsLoadingRoomStatus(false); // <-- Stop loading
            }
            return; // Exit after handling Go to Chatroom
        }
        // --- End Go to Chatroom Logic ---

        if (!matchSocket) {
            setMatchError('매칭 서버에 연결되지 않았습니다.');
            return;
        }
        setMatchError(null); // Clear previous errors

        if (isMatching) {
            // --- Cancel Match Logic ---
            console.log('[MainPage] Attempting to cancel match...');
            matchSocket.emit('cancel_match'); 
        } else {
            // --- Start Match Logic ---
            console.log('[MainPage] Attempting to start match...');
            
            // 실시간 크레딧 검사 - CreditContext의 값 직접 사용
            console.log(`[MainPage] Current credit before match: ${contextCredit}, Required: ${REQUIRED_MATCHING_CREDIT}`);
            
            if (contextCredit < REQUIRED_MATCHING_CREDIT) {
                console.log('[MainPage] Insufficient credit, match canceled');
                setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
                return;
            }
            
            // 매칭 시작
            setIsMatching(true);
            matchSocket.emit('start_match');
        }
    }, [matchSocket, isMatching, matchedRoomId, onNavigateToChat, contextCredit]); // contextCredit 의존성 추가

    // Original dashboard navigation handler (if needed elsewhere, otherwise remove)
    const handleNavigateToDashboard = () => {
        // This function is now potentially unused if the main button is for matching
        console.log("Navigate to Dashboard requested (original handler).");
         if (currentView !== 'dashboard') {
             // Assuming there's a way to navigate back to the dashboard view
             // This might involve calling a prop passed from App.tsx
             console.log("Need a way to navigate back to dashboard view state");
         }
    };

    // --- Update Button Text Logic --- 
    const buttonText = isLoadingMatchAction || isLoadingRoomStatus // <-- Include room status loading
        ? AppStrings.MAINPAGE_MATCHING_IN_PROGRESS // Reuse progress text or create a specific one
        : matchedRoomId 
        ? AppStrings.MAINPAGE_GO_TO_CHATROOM_BUTTON 
        : isMatching
        ? AppStrings.MAINPAGE_CANCEL_MATCHING_BUTTON
        : AppStrings.MAINPAGE_START_MATCHING_BUTTON;
    // --- End Update Button Text Logic --- 

    // --- Update Button Disabled Logic --- 
    // 실시간 크레딧 체크 추가 - CreditContext의 값을 직접 사용
    const hasSufficientCredit = useCallback(() => {
        // profile 대신 CreditContext의 credit 값 사용
        return contextCredit >= REQUIRED_MATCHING_CREDIT;
    }, [contextCredit]);
    
    const isButtonDisabled = isLoadingProfile 
        || isLoadingMatchAction 
        || isLoadingRoomStatus // <-- Disable button during room status check
        || !isSocketConnectedState
        || (!isMatching && !matchedRoomId && !hasSufficientCredit()); // 매칭 시작 시에만 크레딧 체크
    // --- End Update Button Disabled Logic ---

    // 크레딧 변경 감지 및 UI 업데이트
    useEffect(() => {
        // CreditContext의 크레딧 값 변화 감지
        console.log(`[MainPage] Credit Context value: ${contextCredit}, Profile credit: ${profile?.credit}`);
        
        // 크레딧 부족 시 오류 메시지 표시, 충분해지면 메시지 제거
        if (!isMatching && !matchedRoomId) {
            if (contextCredit < REQUIRED_MATCHING_CREDIT) {
                setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
            } else if (matchError === CREDIT_MESSAGES.INSUFFICIENT_CREDITS) {
                setMatchError(null);
            }
        }
    }, [contextCredit, profile, isMatching, matchedRoomId, matchError, setMatchError]);

    return (
        <div className={styles.pageContainer}>
            {/* Header is now rendered in App.tsx */}
            {/* <Header /> */}
            <div className={styles.contentWrapper}>
                <Sidebar
                    onLogout={onLogout}
                    // Pass handleNavigateToDashboard if Sidebar still needs it
                    onNavigateToDashboard={handleNavigateToDashboard}
                    onNavigateToMyProfile={onNavigateToMyProfile}
                    onNavigateToSettings={onNavigateToSettings}
                    currentView={currentView}
                />
                <main className={styles.mainContent}>
                    <div className={styles.mainHeader}>
                       <img src={amieLogo} alt="Amié Logo" className={styles.mainLogo} />
                       <p>{AppStrings.MAINPAGE_SUBTITLE}</p>
                    </div>

                    {/* Combined Loading/Error Display */}
                    {isLoadingProfile && <p>프로필 로딩 중...</p>}
                    {/* Display general errors (profile loading, socket connection, match errors) */}
                    {error && !isLoadingProfile && <p className={styles.errorMessage}>{error}</p>}

                    {/* 프로필 로딩 완료 시 성별에 따라 다른 매칭 박스 표시 */}
                    {!isLoadingProfile && profile && (
                        profile.gender === 'male' ? (
                            <MaleMatchingBox
                                profile={profile}
                                isMatching={isMatching}
                                isButtonDisabled={isButtonDisabled}
                                matchedRoomId={matchedRoomId}
                                buttonText={buttonText}
                                isLoadingRoomStatus={isLoadingRoomStatus}
                                matchSocket={matchSocket}
                                matchError={matchError}
                                setMatchError={setMatchError}
                                setIsMatching={setIsMatching}
                                onMatchButtonClick={handleMatchButtonClick}
                                onCreditUpdate={onCreditUpdate}
                            />
                        ) : (
                            <FemaleMatchingBox
                                profile={profile}
                                isMatching={isMatching}
                                isButtonDisabled={isButtonDisabled}
                                matchedRoomId={matchedRoomId}
                                buttonText={buttonText}
                                isLoadingRoomStatus={isLoadingRoomStatus}
                                matchError={matchError}
                                onMatchButtonClick={handleMatchButtonClick}
                            />
                        )
                    )}
                    
                    {!isLoadingProfile && !profile && !error && (
                         <section className={styles.contentBox}>
                             <p>프로필 정보를 불러올 수 없습니다.</p>
                         </section>
                     )}

                    <section className={styles.contentBox}>
                        <h2 className={styles.boxTitle}>{AppStrings.MAINPAGE_USAGE_GUIDE_TITLE}</h2>
                        <ul className={styles.guideList}>
                            <li><span className={styles.guideNumber}>1</span> {AppStrings.MAINPAGE_GUIDE_ITEM_1}</li>
                            <li><span className={styles.guideNumber}>2</span> {AppStrings.MAINPAGE_GUIDE_ITEM_2}</li>
                            <li><span className={styles.guideNumber}>3</span> {AppStrings.MAINPAGE_GUIDE_ITEM_3}</li>
                        </ul>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default MainPage; 