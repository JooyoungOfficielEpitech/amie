import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './MainPage.module.css';
import Sidebar from './Sidebar';
import { userApi, UserProfile } from '../../api';
import amieLogo from '../../assets/amie_logo.png';
import * as AppStrings from '../../constants/strings';
import { usePayment } from '../../contexts/PaymentContext';
import { useCredit } from '../../contexts/CreditContext';
import { useSocket } from '../../contexts/SocketContext';
import { CREDIT_MESSAGES } from '../../constants/credits';
import CentralRippleAnimation from './CentralRippleAnimation';
import ProfileSlideshow from './ProfileSlideshow';
import MatchingBox from './MatchingBox';
import { useNavigate } from 'react-router-dom';

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
    onCreditUpdate: () => Promise<void>;
    shouldStartMatching?: boolean;
}

const MainPage: React.FC<MainPageProps> = React.memo(({ onLogout, onCreditUpdate, shouldStartMatching = false }) => {
    // 상태들
    const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [matchError, setMatchError] = useState<string | null>(null);
    const { matchSocket, isConnected: isSocketConnected, initializationAttempted } = useSocket();
    const [isMatching, setIsMatching] = useState<boolean>(false);
    const [matchedRoomId, setMatchedRoomId] = useState<string | null>(null);
    const [isLoadingMatchAction, setIsLoadingMatchAction] = useState<boolean>(false);
    const [showRippleAnimation, setShowRippleAnimation] = useState<boolean>(false);
    const [isWaiting, setIsWaiting] = useState<boolean>(false);
    
    // 불필요한 API 호출 방지용 레퍼런스
    const socketInitializedRef = useRef<boolean>(false);
    const profileFetchTimeRef = useRef<number>(0);
    
    const navigate = useNavigate();
    
    // 소켓 초기화 시도했지만 연결 안될 경우 자동 새로고침
    useEffect(() => {
      if (initializationAttempted && !isSocketConnected && !isLoadingProfile) {
        const reloadTimer = setTimeout(() => {
          window.location.reload();
        }, 3000);
        
        return () => clearTimeout(reloadTimer);
      }
    }, [initializationAttempted, isSocketConnected, isLoadingProfile]);
    
    // CreditContext 구독
    const { credit: contextCredit, fetchCredit } = useCredit();

    usePayment();

    // 중복된 소켓 연결 로직을 제거하고 SocketContext의 소켓을 사용
    useEffect(() => {
        if (!profile || !profile.id) {
            return;
        }

        // 이미 초기화되었으면 중복 작업 방지
        if (socketInitializedRef.current) {
            return;
        }

        // SocketContext에서 제공하는 소켓 사용
        if (!matchSocket) {
            return;
        }

        socketInitializedRef.current = true;

        // 소켓 이벤트 핸들러 정의 - 컴포넌트 내부로 이동
        const handleConnect = () => {
            setError(null);
            
            // 프로필에서 이미 매칭 중인지 확인
            if (profile.isWaitingForMatch) {
                setIsMatching(true);
            }
            
            // 연결 시 매칭 상태 확인 한 번만 요청
            matchSocket.emit('check_match_status');
        };

        const handleDisconnect = () => {
            // 연결이 끊겼을 때도 isMatching 상태 유지 (서버 재연결 시 다시 확인)
        };

        const handleConnectError = (err: any) => {
            setError(`매칭 서버 연결 실패: ${err.message}`);
            
            // 연결이 끊겼을 때도 isMatching 상태 유지 (서버 재연결 시 다시 확인)
        };

        const handleMatchSuccess = (data: { roomId: string; partner: any; creditUsed: number }) => {
            setIsLoadingMatchAction(false);
            setIsMatching(false);
            setShowRippleAnimation(false);
            setMatchedRoomId(data.roomId);
            fetchCredit().catch(() => {});
            localStorage.setItem('currentChatRoomId', data.roomId);
            navigate(`/chat/${data.roomId}`);
        };

        const handleMatchError = (errorData: { message: string }) => {
            // '이미 매칭 대기 중입니다' 오류인 경우 isMatching 상태를 true로 설정하고 오류 메시지 표시 안 함
            if (errorData.message.includes('이미') && errorData.message.includes('대기')) {
                setIsMatching(true);
                setMatchError(null); // 오류 메시지를 지워 사용자 혼란 방지
                setShowRippleAnimation(true); // 애니메이션 활성화
                return; // 다른 오류 처리 로직 실행 안 함
            }
            
            // 다른 종류의 오류인 경우 일반 오류 처리
            setError(`매칭 오류: ${errorData.message}`);
            setIsLoadingMatchAction(false);
            // 매칭 오류 시 애니메이션 비활성화
            setShowRippleAnimation(false);
        };

        const handleMatchCancelled = () => {
            setIsMatching(false);
            // 매칭 취소 시 애니메이션 비활성화
            setShowRippleAnimation(false);
            
            // 매칭 취소 시에도 크레딧 정보만 업데이트
            fetchCredit().catch(() => {
                // 오류 처리
            });
        };

        const handleCancelError = (data: { message: string }) => {
            setMatchError(`매칭 취소 실패: ${data.message}`);
        };

        const handleCurrentMatchStatus = (data: { isMatching: boolean }) => {
            // 서버에서 받은 매칭 상태로 업데이트
            if (data.isMatching !== isMatching) {
                setIsMatching(data.isMatching);
                
                // 서버에서 매칭 상태를 받아왔을 때 애니메이션 상태도 업데이트
                setShowRippleAnimation(data.isMatching);
            }
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
    }, [isMatching]);

    // 매칭 버튼 클릭 핸들러 최적화
    const handleMatchButtonClick = useCallback(async () => {
        // 이미 매칭된 경우 채팅방으로 이동
        if (matchedRoomId) {
            // 채팅방 상태 확인 없이 바로 이동
            localStorage.setItem('currentChatRoomId', matchedRoomId);
        }

        // 소켓 연결 확인
        if (!matchSocket?.connected) {
            setMatchError('매칭 서버에 연결되지 않았습니다.');
            return;
        }
        setMatchError(null);

        // 매칭 취소 또는 시작
        if (isMatching) {
            setShowRippleAnimation(false);
            setIsMatching(false); // 즉시 UI 상태 업데이트
            matchSocket.emit('cancel_match');
            
            // 매칭 취소 후 상태 확인
            setTimeout(() => {
                matchSocket.emit('check_match_status');
            }, 500);
        } else {
            // 크레딧 확인
            if (contextCredit < REQUIRED_MATCHING_CREDIT) {
                setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
                return;
            }
            
            // 매칭 시작과 동시에 물방울 파동 애니메이션 활성화
            setIsMatching(true);
            setShowRippleAnimation(true);
            matchSocket.emit('start_match');
        }
    }, [matchSocket?.connected, isMatching, matchedRoomId, contextCredit]);

    // 자동 매칭 시작 체크 - localStorage와 props를 통합하여 중복 요청 방지
    useEffect(() => {
        // 프로필이 로딩되었고 매칭된 채팅방이 없는 경우에만 실행
        if (profile && !matchedRoomId && !isLoadingProfile && matchSocket?.connected) {
            // localStorage에서 자동 매칭 신호 확인
            const autoStartMatching = localStorage.getItem('autoStartMatching');
            
            // props나 localStorage 중 하나라도 자동 매칭 신호가 있으면 매칭 상태 확인
            if ((shouldStartMatching || autoStartMatching === 'true') && profile.gender === 'male') {
                // localStorage 신호가 있으면 제거
                if (autoStartMatching === 'true') {
                    localStorage.removeItem('autoStartMatching');
                }
                
                // 이미 매칭 중이거나 채팅방이 있거나, isWaiting이면 추가 요청을 보내지 않음
                if (isMatching || matchedRoomId || isWaiting) {
                    return;
                }
                
                // 매칭 시작 전에 현재 매칭 상태 확인
                matchSocket.emit('check_match_status');
                
                // 약간의 지연 후 매칭 상태 재확인
                setTimeout(() => {
                    // 지연 후에도 매칭 중이 아니고 채팅방이 없고, isWaiting도 아니면 매칭 시작
                    if (!isMatching && !matchedRoomId && !isWaiting) {
                        // 크레딧 확인
                        if (contextCredit < REQUIRED_MATCHING_CREDIT) {
                            setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
                            return;
                        }
                        
                        // 매칭 시작
                        setIsMatching(true);
                        setShowRippleAnimation(true);
                        matchSocket.emit('start_match');
                    }
                }, 500); // 500ms 지연
            }
        }
    }, [profile, matchedRoomId, isLoadingProfile, matchSocket, contextCredit, shouldStartMatching, isMatching, isWaiting]);

    // 버튼 상태 관련 memoized 값들
    const buttonText = useMemo(() => 
        isLoadingMatchAction 
            ? AppStrings.MAINPAGE_MATCHING_IN_PROGRESS
            : matchedRoomId 
            ? AppStrings.MAINPAGE_GO_TO_CHATROOM_BUTTON 
            : isMatching
            ? AppStrings.MAINPAGE_CANCEL_MATCHING_BUTTON
            : AppStrings.MAINPAGE_START_MATCHING_BUTTON,
    [isLoadingMatchAction, matchedRoomId, isMatching]);
    
    const hasSufficientCredit = useMemo(() => 
        contextCredit >= REQUIRED_MATCHING_CREDIT,
    [contextCredit]);
    
    const isButtonDisabled = useMemo(() => {
        const disabled = isLoadingProfile 
          || isLoadingMatchAction 
          || (!isSocketConnected && initializationAttempted) // 소켓 초기화 시도했는데 연결 안됨
          || (!isMatching && !matchedRoomId && !hasSufficientCredit);
        
        return disabled;
    }, [isLoadingProfile, isLoadingMatchAction, isSocketConnected, 
        initializationAttempted, isMatching, matchedRoomId, hasSufficientCredit]);

    // 크레딧 변경 감지 - 불필요한 렌더링 방지
    useEffect(() => {
        // 매칭 대기 중이거나 이미 채팅방이 있으면 오류 메시지 표시하지 않음
        if (!isMatching && !isWaiting && !matchedRoomId) {
            if (contextCredit < REQUIRED_MATCHING_CREDIT) {
                setMatchError(CREDIT_MESSAGES.INSUFFICIENT_CREDITS);
            } else if (matchError === CREDIT_MESSAGES.INSUFFICIENT_CREDITS) {
                setMatchError(null);
            }
        } else if (matchError === CREDIT_MESSAGES.INSUFFICIENT_CREDITS) {
            setMatchError(null);
        }
    }, [contextCredit, isMatching, isWaiting, matchedRoomId]);

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
                setError('프로필 불러오기 오류: ' + (error.message || '알 수 없는 오류'));
            } finally {
                setIsLoadingProfile(false);
            }
        };
        
        fetchProfileData();
    }, []);

    // matchedRoomId가 null이고, 프로필 로딩이 끝났으면 강제로 매칭 상태 확인
    useEffect(() => {
      if (!matchedRoomId && !isLoadingProfile && profile) {
        userApi.getProfile().then(response => {
          if (response.success && response.user && response.user.matchedRoomId) {
            setMatchedRoomId(response.user.matchedRoomId);
          }
        });
      }
    }, [matchedRoomId, isLoadingProfile, profile]);

    // 이미 매칭된 채팅방이 있으면 자동으로 채팅방으로 이동 (최상단에서 실행)
    useEffect(() => {
        if (matchedRoomId) {
            localStorage.setItem('currentChatRoomId', matchedRoomId);
            navigate(`/chat/${matchedRoomId}`);
        }
    }, [matchedRoomId, navigate]);

    // 매칭 상태 확인 및 리다이렉트 (status API 기반)
    useEffect(() => {
        const checkMatchStatus = async () => {
            try {
                const response = await userApi.getMatchStatus();
                if (response.success) {
                    setIsWaiting(!!response.isWaiting);
                    if (response.chatRoomId) {
                        setMatchedRoomId(response.chatRoomId);
                        localStorage.setItem('currentChatRoomId', response.chatRoomId);
                        navigate(`/chat/${response.chatRoomId}`);
                    } else {
                        setMatchedRoomId(null);
                    }
                }
            } catch (error) {
                console.error('매칭 상태 확인 중 오류:', error);
            }
        };

        if (!isLoadingProfile && profile) {
            checkMatchStatus();
        }
    }, [isLoadingProfile, profile, navigate]);

    // matchedRoomId가 있으면 아무것도 렌더하지 않음 (혹은 로딩 표시)
    if (matchedRoomId) return null;

    return (
        <div className={styles.pageContainer}>
            {/* Header is now rendered in App.tsx */}
            {/* <Header /> */}
            <div className={styles.contentWrapper}>
                <Sidebar
                    onLogout={onLogout}
                    currentView={'dashboard'}
                    matchedRoomId={matchedRoomId}
                />
                <main className={styles.mainContent}>
                    <div className={styles.mainHeader}>
                       <img src={amieLogo} alt="Amié Logo" className={styles.mainLogo} />
                       <p>{AppStrings.MAINPAGE_SUBTITLE}</p>
                    </div>
                    {isLoadingProfile && <p>프로필 로딩 중...</p>}
                    {error && !isLoadingProfile && <p className={styles.errorMessage}>{error}</p>}
                    
                    {/* 소켓 연결 문제 시 준비 중 메시지 표시 */}
                    {initializationAttempted && !isSocketConnected && !isLoadingProfile && (
                      <div className={styles.reloadButtonContainer}>
                        <p className={styles.reloadMessage}>서버 연결 준비 중입니다. 잠시만 기다려주세요.</p>
                      </div>
                    )}

                    {/* 매칭 시 물방울 파동 애니메이션을 컨텐츠 박스 위에 배치 */}
                    <div style={{ position: 'relative' }}>
                        <CentralRippleAnimation isVisible={showRippleAnimation} />
                    
                        {/* 프로필 로딩 완료 시 통합 매칭 박스 표시 */}
                        {!isLoadingProfile && profile && (
                            <MatchingBox
                                profile={profile}
                                isMatching={isMatching}
                                isButtonDisabled={isButtonDisabled}
                                matchedRoomId={matchedRoomId}
                                buttonText={buttonText}
                                isLoadingRoomStatus={isLoadingMatchAction}
                                matchError={matchError}
                                onMatchButtonClick={handleMatchButtonClick}
                                isSocketConnected={isSocketConnected}
                            />
                        )}
                    </div>
                    
                    {!isLoadingProfile && !profile && !error && (
                         <section className={styles.contentBox}>
                             <p>프로필 정보를 불러올 수 없습니다.</p>
                         </section>
                     )}
                </main>
            </div>
        </div>
    );
});

export default MainPage; 