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
import CentralRippleAnimation from './CentralRippleAnimation';
import ProfileSlideshow from './ProfileSlideshow';

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
    const [showRippleAnimation, setShowRippleAnimation] = useState<boolean>(false);
    
    // 불필요한 API 호출 방지용 레퍼런스
    const socketInitializedRef = useRef<boolean>(false);
    const profileFetchTimeRef = useRef<number>(0);
    
    // CreditContext 구독
    const { credit: contextCredit, fetchCredit } = useCredit();

    usePayment();

    // 중복된 소켓 연결 로직을 제거하고 SocketContext의 소켓을 사용
    useEffect(() => {
        if (!profile || !profile.id) {
            console.log('[MainPage] Profile not ready, skipping socket setup');
            return;
        }

        // 이미 초기화되었으면 중복 작업 방지
        if (socketInitializedRef.current) {
            console.log('[MainPage] Socket already initialized');
            return;
        }

        // SocketContext에서 제공하는 소켓 사용
        if (!matchSocket) {
            console.log('[MainPage] No socket from context, waiting for connection');
            return;
        }

        console.log('[MainPage] Using socket from SocketContext');
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
            
            console.log(`[MainPage] Checking match status with userId: ${profile.id}`);
            
            // 연결 시 매칭 상태 확인 한 번만 요청
            matchSocket.emit('check_match_status');
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
            // 매칭 성공 시 애니메이션 비활성화
            setShowRippleAnimation(false);
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
            // 매칭 오류 시 애니메이션 비활성화
            setShowRippleAnimation(false);
            
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
            // 매칭 취소 시 애니메이션 비활성화
            setShowRippleAnimation(false);
            
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
            
            // 서버에서 매칭 상태를 받아왔을 때 애니메이션 상태도 업데이트
            setShowRippleAnimation(data.isMatching);
        };

        // 이벤트 리스너 등록
        matchSocket.on('connect', handleConnect);
        matchSocket.on('disconnect', handleDisconnect);
        matchSocket.on('connect_error', handleConnectError);
        matchSocket.on('match_success', handleMatchSuccess);
        matchSocket.on('match_error', handleMatchError);
        matchSocket.on('match_cancelled', handleMatchCancelled);
        matchSocket.on('cancel_error', handleCancelError);
        matchSocket.on('current_match_status', handleCurrentMatchStatus);

        // 만약 이미 연결된 상태라면 수동으로 핸들러 호출
        if (matchSocket.connected) {
            handleConnect();
        }

        // 컴포넌트 언마운트 시 이벤트 리스너 정리
        return () => {
            console.log('MainPage unmounting - Cleaning up socket event listeners');
            if (matchSocket) {
                matchSocket.off('connect', handleConnect);
                matchSocket.off('disconnect', handleDisconnect);
                matchSocket.off('connect_error', handleConnectError);
                matchSocket.off('match_success', handleMatchSuccess);
                matchSocket.off('match_error', handleMatchError);
                matchSocket.off('match_cancelled', handleMatchCancelled);
                matchSocket.off('cancel_error', handleCancelError);
                matchSocket.off('current_match_status', handleCurrentMatchStatus);
            }
        };
    }, [profile?.id, profile?.isWaitingForMatch, fetchCredit, onCreditUpdate, matchSocket]);

    // 매칭 상태가 변경될 때마다 파동 애니메이션 상태 업데이트
    useEffect(() => {
        setShowRippleAnimation(isMatching);
        console.log('[MainPage] 매칭 상태 변경: ', isMatching, ' - 애니메이션 상태: ', showRippleAnimation);
    }, [isMatching]);

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
            setShowRippleAnimation(false);
            matchSocket.emit('cancel_match');
        } else {
            console.log('[MainPage] Attempting to start match...');
            
            // 크레딧 확인
            if (contextCredit < REQUIRED_MATCHING_CREDIT) {
                console.log('[MainPage] Insufficient credit, match canceled');
                setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
                return;
            }
            
            // 매칭 시작과 동시에 물방울 파동 애니메이션 활성화
            setIsMatching(true);
            setShowRippleAnimation(true);
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

                    {/* 프로필 카드 슬라이드쇼 추가 - 오른쪽에 배치 */}
                    <ProfileSlideshow />

                    {/* 위치 변경: 애니메이션을 화면 중앙에 배치 */}
                    {/* Combined Loading/Error Display */}
                    {isLoadingProfile && <p>프로필 로딩 중...</p>}
                    {/* Display general errors (profile loading, socket connection, match errors) */}
                    {error && !isLoadingProfile && <p className={styles.errorMessage}>{error}</p>}

                    {/* 매칭 시 물방울 파동 애니메이션을 컨텐츠 박스 위에 배치 */}
                    <div style={{ position: 'relative' }}>
                        <CentralRippleAnimation isVisible={showRippleAnimation} />
                    
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
                    </div>
                    
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