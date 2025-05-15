import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './MainPage.module.css';
import Sidebar from './Sidebar';
import { userApi, UserProfile, chatApi } from '../../api';
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

const MainPage: React.FC<MainPageProps> = React.memo(({ onLogout, onNavigateToChat, onNavigateToMyProfile, onNavigateToSettings, currentView, onCreditUpdate }) => {
    console.log('--- MainPage Component Render Start ---', currentView);
    
    // 상태들
    const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [matchError, setMatchError] = useState<string | null>(null);
    const [matchSocket, setMatchSocket] = useState<any>(null);
    const [isMatching, setIsMatching] = useState<boolean>(false);
    const [matchedRoomId, setMatchedRoomId] = useState<string | null>(null);
    const [isLoadingRoomStatus, setIsLoadingRoomStatus] = useState<boolean>(false);
    const [isLoadingMatchAction, setIsLoadingMatchAction] = useState<boolean>(false);
    const [isSocketConnectedState, setIsSocketConnectedState] = useState<boolean>(false);
    
    // 불필요한 API 호출 방지용 레퍼런스
    const socketInitializedRef = useRef<boolean>(false);
    const profileFetchTimeRef = useRef<number>(0);
    
    // CreditContext 구독
    const { credit: contextCredit, fetchCredit } = useCredit();

    usePayment();

    // 소켓 연결 설정 - 한 번만 초기화하도록 개선
    useEffect(() => {
        // 이미 초기화되었거나 프로필이 로드되지 않은 경우 스킵
        if (socketInitializedRef.current || !profile?.id) {
            return;
        }
        
        // 토큰 처리
        let processedToken = '';
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                console.error("No token found in localStorage");
                setError("로그인이 필요합니다.");
                return;
            }
            
            // JSON 형식인지 확인
            try {
                const tokenObj = JSON.parse(token);
                processedToken = tokenObj.token || tokenObj.accessToken || token;
                console.log('[Socket Debug] Token appears to be JSON, extracted:', processedToken.slice(0, 10) + '...');
            } catch (error) {
                console.log('[Socket Debug] Token is not JSON, using as is:', token.slice(0, 10) + '...');
                processedToken = token;
            }
            
            // Bearer 접두사가 있으면 제거
            if (processedToken.startsWith('Bearer ')) {
                processedToken = processedToken.substring(7);
                console.log('[Socket Debug] Removed Bearer prefix:', processedToken.slice(0, 10) + '...');
            }
        } catch (error) {
            console.error('[Socket Debug] Error processing token:', error);
        }
        
        if (!processedToken) {
            console.error("No token found, cannot connect to match socket");
            setError("로그인이 필요합니다.");
            return;
        }

        console.log('[Socket Debug] Connecting with token:', processedToken.slice(0, 10) + '...');
        
        // 사용자 ID 가져오기 - profile에서 직접 사용
        const userId = profile.id;
        console.log('[Socket Debug] Using profile ID for socket connection:', userId);

        // 소켓 연결 설정 - 연결 옵션 최적화
        const socket = io(`${import.meta.env.VITE_API_BASE_URL}/match`, {
             auth: { 
                token: processedToken,
                userId: userId
             },
             transports: ['websocket'], // WebSocket만 사용하여 연결 안정성 향상
             reconnection: true,
             reconnectionAttempts: Infinity,
             reconnectionDelay: 5000, // 재연결 간격 증가
             reconnectionDelayMax: 30000,
             timeout: 20000,
             // @ts-ignore - socket.io-client 타입 정의에는 없지만 실제 라이브러리에서는 지원되는 옵션
             pingTimeout: 30000,
             // @ts-ignore
             pingInterval: 25000,
             forceNew: false, // 불필요한 새 연결 방지
             autoConnect: true // 자동 연결
        });
        
        setMatchSocket(socket);
        socketInitializedRef.current = true;

        // 소켓 이벤트 핸들러 정의 - 컴포넌트 내부로 이동
        const handleConnect = () => {
            console.log('Connected to /match namespace');
            setError(null);
            setIsSocketConnectedState(true);
            
            // 프로필에서 이미 매칭 중인지 확인
            if (profile.isWaitingForMatch) {
                setIsMatching(true);
                console.log('[MainPage Socket Connect] User is already in matching state based on profile data');
            }
            
            console.log(`[MainPage] Checking match status with userId: ${userId}`);
            
            // 연결 시 매칭 상태 확인 한 번만 요청
            socket.emit('check_match_status');
        };

        const handleDisconnect = (reason: any) => {
            console.log('Disconnected from /match namespace:', reason);
            setIsSocketConnectedState(false);
            // 연결이 끊겼을 때도 isMatching 상태 유지 (서버 재연결 시 다시 확인)
        };

        const handleConnectError = (err: any) => {
            console.error('Match socket connection error:', err.message);
            setError(`매칭 서버 연결 실패: ${err.message}`);
            setIsSocketConnectedState(false);
        };

        const handleMatchSuccess = (data: { roomId: string; partner: any; creditUsed: number }) => {
            console.log('Match Success!', data);
            setIsLoadingMatchAction(false);
            setIsMatching(false);
            setMatchedRoomId(data.roomId);
            
            // 매칭 성공 시 크레딧 업데이트 - 필요한 경우만 실행
            console.log('[MainPage] Updating credit after match success (deducted:', data.creditUsed, ')');
            
            // 크레딧 정보만 업데이트하고 전체 프로필 갱신은 스킵
            fetchCredit().catch(err => {
                console.error('[MainPage] Error fetching credit after match:', err);
            });
        };

        const handleMatchError = (errorData: { message: string }) => {
            console.error('Match Error from server:', errorData);
            setError(`매칭 오류: ${errorData.message}`);
            setIsLoadingMatchAction(false);
            
            // '이미 매칭 대기 중입니다' 오류인 경우 isMatching 상태를 true로 설정
            if (errorData.message.includes('이미') && errorData.message.includes('대기')) {
                console.log('[MainPage] Already in matching queue, updating state');
                setIsMatching(true);
                setMatchError(null); // 오류 메시지를 지워 사용자 혼란 방지
            }
        };

        const handleMatchCancelled = () => {
            console.log('[MainPage] Match cancelled successfully.');
            setIsMatching(false);
            
            // 매칭 취소 시에도 크레딧 정보만 업데이트
            fetchCredit().catch(err => {
                console.error('[MainPage] Error updating credit on match cancellation:', err);
            });
        };

        const handleCancelError = (data: { message: string }) => {
            console.error('[MainPage] Error cancelling match:', data.message);
            setMatchError(`매칭 취소 실패: ${data.message}`);
        };

        const handleCurrentMatchStatus = (data: { isMatching: boolean }) => {
            console.log('[MainPage] Received current_match_status:', data);
            setIsMatching(data.isMatching);
        };

        // 이벤트 리스너 등록
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('match_success', handleMatchSuccess);
        socket.on('match_error', handleMatchError);
        socket.on('match_cancelled', handleMatchCancelled);
        socket.on('cancel_error', handleCancelError);
        socket.on('current_match_status', handleCurrentMatchStatus);

        // 컴포넌트 언마운트 시만 소켓 정리 - 이벤트는 여기서 정리하지 않음
        return () => {
            console.log('MainPage unmounting - Disconnecting match socket...');
            if (socket.connected) {
                socket.disconnect();
            }
        };
    }, [profile?.id, profile?.isWaitingForMatch, fetchCredit, onCreditUpdate]);

    // 매칭 버튼 클릭 핸들러 최적화
    const handleMatchButtonClick = useCallback(async () => {
        // 이미 매칭된 경우 채팅방으로 이동
        if (matchedRoomId) {
            setIsLoadingRoomStatus(true);
            setMatchError(null);
            try {
                const statusResponse = await chatApi.getChatRoomStatus(matchedRoomId);
                if (statusResponse.success && statusResponse.isActive) {
                    onNavigateToChat(matchedRoomId);
                    setMatchedRoomId(null);
                } else if (statusResponse.success && !statusResponse.isActive) {
                    setMatchError(AppStrings.CHATPAGE_PARTNER_LEFT_MESSAGE);
                    setMatchedRoomId(null);
                    setIsMatching(false);
                } else {
                    setMatchError(statusResponse.message || '채팅방 상태 확인 실패');
                }
            } catch (error: any) {
                console.error('Error checking chat room status:', error);
                setMatchError('채팅방 상태 확인 중 오류 발생');
            } finally {
                setIsLoadingRoomStatus(false);
            }
            return;
        }

        // 소켓 연결 확인
        if (!matchSocket?.connected) {
            setMatchError('매칭 서버에 연결되지 않았습니다.');
            return;
        }
        setMatchError(null);

        // 매칭 취소 또는 시작
        if (isMatching) {
            console.log('[MainPage] Attempting to cancel match...');
            matchSocket.emit('cancel_match');
        } else {
            console.log('[MainPage] Attempting to start match...');
            
            // 크레딧 확인
            if (contextCredit < REQUIRED_MATCHING_CREDIT) {
                console.log('[MainPage] Insufficient credit, match canceled');
                setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
                return;
            }
            
            // 매칭 시작
            setIsMatching(true);
            matchSocket.emit('start_match');
        }
    }, [matchSocket?.connected, isMatching, matchedRoomId, onNavigateToChat, contextCredit]);

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

    // 버튼 상태 관련 memoized 값들
    const buttonText = useMemo(() => 
        isLoadingMatchAction || isLoadingRoomStatus 
            ? AppStrings.MAINPAGE_MATCHING_IN_PROGRESS
            : matchedRoomId 
            ? AppStrings.MAINPAGE_GO_TO_CHATROOM_BUTTON 
            : isMatching
            ? AppStrings.MAINPAGE_CANCEL_MATCHING_BUTTON
            : AppStrings.MAINPAGE_START_MATCHING_BUTTON,
    [isLoadingMatchAction, isLoadingRoomStatus, matchedRoomId, isMatching]);
    
    const hasSufficientCredit = useMemo(() => 
        contextCredit >= REQUIRED_MATCHING_CREDIT,
    [contextCredit]);
    
    const isButtonDisabled = useMemo(() => 
        isLoadingProfile 
        || isLoadingMatchAction 
        || isLoadingRoomStatus
        || !isSocketConnectedState
        || (!isMatching && !matchedRoomId && !hasSufficientCredit),
    [isLoadingProfile, isLoadingMatchAction, isLoadingRoomStatus, isSocketConnectedState, isMatching, matchedRoomId, hasSufficientCredit]);

    // 크레딧 변경 감지 - 불필요한 렌더링 방지
    useEffect(() => {
        // CreditContext의 크레딧 값이 변할 때만 실행
        console.log(`[MainPage] Credit Context value: ${contextCredit}, Profile credit: ${profile?.credit}`);
        
        // 크레딧 부족 시 오류 메시지 표시, 충분해지면 메시지 제거 - 매칭 상태가 아닐 때만
        if (!isMatching && !matchedRoomId) {
            if (contextCredit < REQUIRED_MATCHING_CREDIT) {
                setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
            } else if (matchError === CREDIT_MESSAGES.INSUFFICIENT_CREDITS) {
                setMatchError(null);
            }
        }
    }, [contextCredit]);

    // 프로필 불러오기 최적화 - 중복 요청 방지
    useEffect(() => {
        const fetchProfileData = async () => {
            // 최근 5초 이내에 이미 요청했다면 무시
            const now = Date.now();
            if (now - profileFetchTimeRef.current < 5000) {
                return;
            }
            
            profileFetchTimeRef.current = now;
            setIsLoadingProfile(true);
            
            try {
                const response = await userApi.getProfile();
                if (response.success && response.user) {
                    // 확장된 프로필 타입으로 변환
                    const extendedProfile: ExtendedUserProfile = {
                        ...response.user,
                        isWaitingForMatch: response.user.isWaitingForMatch || false
                    };
                    setProfile(extendedProfile);
                    setError(null);
                    
                    // 프로필에서 매칭 상태 확인
                    if (extendedProfile.isWaitingForMatch && !isMatching) {
                        setIsMatching(true);
                    }
                    
                    // 매칭된 채팅방이 있으면 설정
                    if (extendedProfile.matchedRoomId && !matchedRoomId) {
                        setMatchedRoomId(extendedProfile.matchedRoomId);
                    }
                } else {
                    setError('프로필을 불러오는데 실패했습니다.');
                }
            } catch (error: any) {
                console.error('Error fetching profile:', error);
                setError('프로필 불러오기 오류: ' + (error.message || '알 수 없는 오류'));
            } finally {
                setIsLoadingProfile(false);
            }
        };
        
        fetchProfileData();
    }, []);

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
});

export default MainPage; 