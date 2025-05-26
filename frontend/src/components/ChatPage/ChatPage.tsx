import React, { useState, useEffect } from 'react';
import io from 'socket.io-client'; // Use correct import
import Sidebar from '../MainPage/Sidebar'; // Reuse Sidebar from MainPage
import ChatWindow from './ChatWindow';
import ProfileCard from './ProfileCard';
import styles from './ChatPage.module.css';
import { chatApi } from '../../api'; // <-- Import chatApi
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Modal from '../common/Modal';

// 환경에 맞는 소켓 베이스 URL을 반환하는 함수 (SocketContext와 동일한 로직)
const getSocketBaseUrl = () => {
  // 프로덕션 환경에서는 현재 호스트 기반으로 WebSocket URL 생성
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;  // host는 도메인과 포트를 포함
    const url = `${protocol}//${host}`;
    return url;
  }
  
  // 개발 환경에서는 환경 변수 또는 기본값 사용
  const devUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  return devUrl;
};

// Define interface for chat messages matching backend structure
interface ChatMessage {
    _id: string;       // Use _id from MongoDB
    chatRoomId: string; // Keep chatRoomId if needed
    senderId: string;
    senderNickname?: string; // Add optional senderNickname
    message: string;     // Use message instead of text
    createdAt: string;   // Use string for simplicity, can parse later
}

interface ChatPageProps {
    onLogout: () => void;
    userId: string;
    onCreditUpdate?: () => Promise<void>;
}

const ChatPage: React.FC<ChatPageProps> = ({ onLogout, userId, onCreditUpdate }) => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [chatSocket, setChatSocket] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const currentRoomId = roomId || '';
    const [messages, setMessages] = useState<ChatMessage[]>([]); // State for messages
    const [isPartnerLeft, setIsPartnerLeft] = useState(false); // <-- 상대방 나감 상태 추가
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true); // <-- Add loading state
    const [showNoAccessModal, setShowNoAccessModal] = useState(false);
    const [noAccessMessage, setNoAccessMessage] = useState('');

    // Helper to check if auto search should be enabled
    const isMaleAutoSearch = () => {
        const profileStr = localStorage.getItem('currentUserProfile');
        let gender = '';
        let isAuto = false;
        try {
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                gender = profile.gender;
            }
        } catch {}
        isAuto = localStorage.getItem('isAutoSearchEnabled') === 'true';
        return gender === 'male' && isAuto;
    };

    // 채팅방 ID가 없는 경우 처리
    useEffect(() => {
        if (!roomId) {
            if (isMaleAutoSearch()) {
                localStorage.setItem('autoStartMatching', 'true');
            }
            navigate('/');
            return;
        } else {
            localStorage.setItem('currentChatRoomId', roomId);
        }
    }, [roomId, navigate]);

    // --- Fetch initial chat history --- 
    useEffect(() => {
        const fetchHistory = async () => {
            if (!currentRoomId) return;
            setIsLoadingHistory(true);
            setError(null);
            try {
                const historyResponse = await chatApi.getChatHistory(currentRoomId);
                if (historyResponse.success && historyResponse.messages) {
                    const formattedMessages = historyResponse.messages.map(msg => ({
                        ...msg,
                        createdAt: new Date(msg.createdAt).toISOString()
                    }));
                    setMessages(formattedMessages);
                } else {
                    setError(historyResponse.message || '채팅 기록을 불러오지 못했습니다.');
                }
            } catch (error: any) {
                setError('채팅 기록 로딩 중 오류 발생');
                console.error('Error fetching chat history:', error);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [currentRoomId]); // Run when roomId is available
    // --- End Fetch initial chat history --- 

    // --- Fetch partner left state on mount/refresh ---
    useEffect(() => {
        const fetchPartnerLeft = async () => {
            if (!currentRoomId || !userId) return;
            try {
                const data = await chatApi.getChatRoomStatus(currentRoomId);
                if (data.success && (typeof data.user1Left === 'boolean') && (typeof data.user2Left === 'boolean')) {
                    // user1Id, user2Id가 응답에 포함되어 있다고 가정
                    const isUser1 = data.user1Id === userId;
                    const partnerLeft = isUser1 ? data.user2Left : data.user1Left;
                    setIsPartnerLeft(partnerLeft);
                }
            } catch (e) {
                // 무시 (네트워크 오류 등)
            }
        };
        fetchPartnerLeft();
    }, [currentRoomId, userId]);

    // WebSocket connection for chat
    useEffect(() => {
        
        if (!currentRoomId) {
             console.error("[ChatPage Effect] Room ID is missing, cannot connect.");
             onLogout();
             return;
        } 

        const token = localStorage.getItem('accessToken');
        
        // 토큰 형식 확인 및 처리
        let processedToken = token || '';
        try {
            if (token && token.startsWith('{') && token.endsWith('}')) {
                // JSON 형식인 경우 파싱하여 토큰 값만 추출
                const tokenObj = JSON.parse(token);
                processedToken = tokenObj.token || tokenObj.accessToken || token;
            }
            
            // Bearer 접두사가 있으면 제거
            if (processedToken.startsWith('Bearer ')) {
                processedToken = processedToken.substring(7);
            }
        } catch (error) {
            console.error('[Socket Debug - Chat] Error processing token:', error);
        }
        
        if (!processedToken) {
            console.error("No token found, cannot connect to chat socket");
            setError("로그인이 필요합니다.");
            return;
        }

        // 베이스 URL을 구하는 함수 사용
        const baseUrl = getSocketBaseUrl();

        // Connect to the /chat namespace with the correct URL
        const socket = io(`${baseUrl}/chat`, {
             auth: { 
                token: processedToken,
                userId  // userId도 함께 전송
             },
             query: {
                token: processedToken,
                userId  // userId도 query로 전송
             },
             transports: ['websocket'],
             reconnection: true,
             reconnectionAttempts: 5,
             reconnectionDelay: 1000,
             forceNew: true,
             autoConnect: false
        });
        
        // 수동으로 연결 시작
        socket.connect();

        setChatSocket(socket);

        socket.on('connect', () => {
            setError(null);
            
            // 수동 인증 이벤트 호출
            socket.emit('authenticate', { 
                userId, 
                token: processedToken 
            });
            
            // 인증 이후 방에 참여
            socket.emit('join-room', currentRoomId);
        });

        socket.on('disconnect', () => {
            // Handle potential need for reconnection or error display
        });

        socket.on('connect_error', (err: any) => {
            if (
                err.message.includes('인증') ||
                err.message.includes('권한') ||
                err.message.includes('찾을 수 없') ||
                err.message.includes('존재하지')
            ) {
                setNoAccessMessage('권한이 없거나 존재하지 않는 채팅방입니다.');
                setShowNoAccessModal(true);
            } else {
                setError(`채팅 서버 연결 실패: ${err.message}`);
            }
        });

        socket.on('error', (errorData: { message: string }) => {
            if (
                errorData.message.includes('인증') ||
                errorData.message.includes('권한') ||
                errorData.message.includes('찾을 수 없') ||
                errorData.message.includes('존재하지')
            ) {
                setNoAccessMessage('권한이 없거나 존재하지 않는 채팅방입니다.');
                setShowNoAccessModal(true);
            } else {
                setError(`채팅 오류: ${errorData.message}`);
            }
        });

        // 인증 결과 이벤트 리스너 추가
        socket.on('authenticated', () => {
            // Authentication successful
        });

        // Listener for when a user disconnects (the event you added)
        socket.on('user-disconnected', (data: { roomId: string, userId: string }) => {
          if (data.roomId === currentRoomId) {
            setIsPartnerLeft(true);
          }
        });

        // Listener for successful leave confirmation from backend
        socket.on('chat_left', () => {
            if (isMaleAutoSearch()) {
                localStorage.setItem('autoStartMatching', 'true');
            }
            navigate('/');
        });

        // Listener for when the partner leaves
        socket.on('partner_left', (data: { roomId: string }) => {
             console.log('[SOCKET] partner_left 이벤트 수신:', data);
             if (data.roomId === currentRoomId) {
                setIsPartnerLeft(true);
             }
        });
        
        // Listener for new messages from the server - use 'new-message'
        socket.on('new-message', (message: ChatMessage) => {
            // Adapt validation to the new structure
            if (message && message._id && message.senderId && message.message && message.createdAt) {
                 const messageWithStringDate = {
                    ...message,
                    createdAt: new Date(message.createdAt).toISOString(), // Ensure it's a string
                 };
                setMessages((prevMessages) => [...prevMessages, messageWithStringDate]);
            } else {
                console.warn('Received invalid message structure:', message);
            }
        });

        // Cleanup on component unmount or roomId change
        return () => {
            socket.disconnect();
            setChatSocket(null);
            socket.off('new-message'); 
            socket.off('user-disconnected');
            socket.off('partner_left');
            socket.off('chat_left');
            socket.off('authenticated'); // 인증 이벤트 리스너 제거
            socket.off('error');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    // Re-run effect if currentRoomId changes (though ideally it shouldn't change often within the page)
    }, [currentRoomId, userId, onLogout, navigate]); // Add userId and onLogout to dependencies

    // Function to send a message
    const handleSendMessage = (text: string) => {
        if (!chatSocket || !currentRoomId) {
            console.error('Cannot send message, socket or room ID missing.');
            return;
        }
        if (text.trim() === '') return; // Don't send empty messages

        // Emit message to server using the correct event name 'send-message'
        chatSocket.emit('send-message', {
            // Backend expects chatRoomId and message according to gateway code
            chatRoomId: currentRoomId, 
            message: text 
        });
    };

    return (
        <div className={styles.pageWrapper}> 
            {/* <Header /> */}
            <div className={styles.chatPageContainer}>
                <Sidebar
                    onLogout={onLogout}
                    currentView={undefined}
                    matchedRoomId={currentRoomId}
                />
                <main className={styles.chatArea}>
                    {isLoadingHistory && <p>채팅 기록 로딩 중...</p>} 
                    {!isLoadingHistory && error && <p className={styles.errorMessage}>{error}</p>} 
                    {!isLoadingHistory && !error && 
                        <ChatWindow 
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            currentUserId={userId} 
                            isPartnerDisconnected={isPartnerLeft}
                        /> 
                    }
                </main>
                <ProfileCard 
                    chatSocket={chatSocket} 
                    roomId={currentRoomId} 
                    onCreditUpdate={onCreditUpdate}
                />
            </div>
            <Modal
                isOpen={showNoAccessModal}
                onClose={() => {
                    setShowNoAccessModal(false);
                    onLogout();
                }}
                title="채팅방 접근 불가"
            >
                <p>{noAccessMessage}</p>
                <button onClick={() => { setShowNoAccessModal(false); onLogout(); }}>확인</button>
            </Modal>
        </div>
    );
};

export default ChatPage; 