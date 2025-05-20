import React, { useState, useEffect } from 'react';
import io from 'socket.io-client'; // Use correct import
import Sidebar from '../MainPage/Sidebar'; // Reuse Sidebar from MainPage
import ChatWindow from './ChatWindow';
import ProfileCard from './ProfileCard';
import styles from './ChatPage.module.css';
import { chatApi } from '../../api'; // <-- Import chatApi

// 환경에 맞는 소켓 베이스 URL을 반환하는 함수 (SocketContext와 동일한 로직)
const getSocketBaseUrl = () => {
  console.log('[ChatPage] 환경 확인:', import.meta.env.PROD ? 'Production' : 'Development');
  
  // 프로덕션 환경에서는 현재 호스트 기반으로 WebSocket URL 생성
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;  // host는 도메인과 포트를 포함
    const url = `${protocol}//${host}`;
    console.log('[ChatPage] Production Socket URL:', url);
    return url;
  }
  
  // 개발 환경에서는 환경 변수 또는 기본값 사용
  const devUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  console.log('[ChatPage] Development Socket URL:', devUrl);
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
    onNavigateToDashboard: () => void; // Function to navigate back
    onLogout: () => void; // Function for logout
    onNavigateToMyProfile: () => void; // Add new prop type
    onNavigateToSettings: () => void; // Add prop type
    currentView: 'dashboard' | 'chat' | 'my-profile' | 'settings'; // Add prop type
    roomId: string; // Changed from optional to required based on App.tsx logic
    userId: string; // Add userId prop from App.tsx
    onCreditUpdate?: () => Promise<void>; // 크레딧 업데이트 함수 추가
    isAutoSearchEnabled?: boolean; // Auto search 상태 추가
}

const ChatPage: React.FC<ChatPageProps> = ({ 
    onNavigateToDashboard, 
    onLogout, 
    onNavigateToMyProfile, 
    onNavigateToSettings, 
    currentView, 
    roomId: initialRoomId, // Keep receiving roomId
    userId, // Receive userId from props
    onCreditUpdate, // 크레딧 업데이트 함수 추가
    isAutoSearchEnabled = false // Auto search 상태 추가
}) => {
    const [chatSocket, setChatSocket] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Use roomId directly from props now, assuming App.tsx ensures it's valid
    const currentRoomId = initialRoomId; 
    const [messages, setMessages] = useState<ChatMessage[]>([]); // State for messages
    const [isPartnerLeft, setIsPartnerLeft] = useState(false); // <-- 상대방 나감 상태 추가
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true); // <-- Add loading state

    // 채팅방 ID가 없는 경우 처리
    useEffect(() => {
        if (!initialRoomId) {
            console.error('[ChatPage] No room ID provided in props');
            
            // localStorage에서 채팅방 ID 확인
            const savedRoomId = localStorage.getItem('currentChatRoomId');
            if (savedRoomId) {
                console.log('[ChatPage] Using roomId from localStorage:', savedRoomId);
                // 현재는 상태를 직접 변경할 수 없으므로 dashboard로 이동
                // 이후 App.tsx의 효과에서 chat으로 다시 이동될 것임
                onNavigateToDashboard();
            } else {
                console.error('[ChatPage] No room ID available, navigating to dashboard');
                onNavigateToDashboard();
            }
        } else {
            // 채팅방 ID가 있는 경우에는 localStorage에 저장
            localStorage.setItem('currentChatRoomId', initialRoomId);
        }
    }, [initialRoomId, onNavigateToDashboard]);

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

    // WebSocket connection for chat
    useEffect(() => {
        
        if (!currentRoomId) {
             console.error("[ChatPage Effect] Room ID is missing, cannot connect.");
             onNavigateToDashboard();
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
                console.log('[Socket Debug - Chat] Token appears to be JSON, extracted:', processedToken.slice(0, 10) + '...');
            } else if (token) {
                console.log('[Socket Debug - Chat] Using token as is:', token.slice(0, 10) + '...');
            }
            
            // Bearer 접두사가 있으면 제거
            if (processedToken.startsWith('Bearer ')) {
                processedToken = processedToken.substring(7);
                console.log('[Socket Debug - Chat] Removed Bearer prefix:', processedToken.slice(0, 10) + '...');
            }
        } catch (error) {
            console.error('[Socket Debug - Chat] Error processing token:', error);
        }
        
        if (!processedToken) {
            console.error("No token found, cannot connect to chat socket");
            setError("로그인이 필요합니다.");
            return;
        }

        // Socket debugging
        console.log('[Socket Debug - Chat] Connecting with token:', processedToken.slice(0, 10) + '...');

        // 베이스 URL을 구하는 함수 사용
        const baseUrl = getSocketBaseUrl();
        console.log('[Socket Debug - Chat] 연결 URL:', `${baseUrl}/chat`);

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
            console.log(`Connected to /chat namespace for room ${currentRoomId}`);
            setError(null);
            
            // 수동 인증 이벤트 호출
            console.log('[ChatPage] 인증 이벤트 호출...');
            socket.emit('authenticate', { 
                userId, 
                token: processedToken 
            });
            
            // 인증 이후 방에 참여
            socket.emit('join-room', currentRoomId);
        });

        socket.on('disconnect', (reason: any) => {
            console.log('Disconnected from /chat namespace:', reason);
            // Handle potential need for reconnection or error display
        });

        socket.on('connect_error', (err: any) => {
            console.error('Chat socket connection error details:', err, err.message, err.data);
            setError(`채팅 서버 연결 실패: ${err.message}`);
        });

        socket.on('error', (errorData: { message: string }) => {
            console.error('Chat Error from server:', errorData);
            setError(`채팅 오류: ${errorData.message}`);
        });

        // 인증 결과 이벤트 리스너 추가
        socket.on('authenticated', (response: any) => {
            console.log('[ChatPage] 인증 성공:', response);
        });

        // Listener for when a user disconnects (the event you added)
        socket.on('user-disconnected', (data: { roomId: string, userId: string }) => {
          if (data.roomId === currentRoomId) { // 현재 방의 사용자인지 확인
            setIsPartnerLeft(true);
          }
        });

        // Listener for successful leave confirmation from backend
        socket.on('chat_left', (data: { roomId: string }) => {
            console.log(`Successfully left room ${data.roomId}`);
            // Navigate away after confirmation
            onNavigateToDashboard(); 
        });

        // Listener for when the partner leaves
        socket.on('partner_left', (data: { roomId: string }) => {
             if (data.roomId === currentRoomId) { // 현재 방의 이벤트인지 확인
                setIsPartnerLeft(true); // <-- 상태 업데이트
             }
        });
        
        // Listener for new messages from the server - use 'new-message'
        socket.on('new-message', (message: ChatMessage) => {
            console.log('Received new-message:', message);
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
            console.log('Disconnecting chat socket...');
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
    }, [currentRoomId, userId, onNavigateToDashboard]); // Add userId and onNavigateToDashboard to dependencies

    // Auto search 기능을 위한 effect
    useEffect(() => {
        // 상대방이 나가고, Auto search가 활성화되었을 때 자동으로 대시보드로 이동
        if (isPartnerLeft && isAutoSearchEnabled) {
            console.log('[ChatPage] 상대방이 나갔고 Auto search가 활성화되어 있어 대시보드로 이동합니다. (Auto search 상태:', isAutoSearchEnabled, ')');
            // 약간의 지연 후에 대시보드로 이동 (사용자에게 상대방이 나갔다는 메시지를 보여줄 시간을 주기 위해)
            const timer = setTimeout(() => {
                onNavigateToDashboard();
            }, 2000);
            
            return () => clearTimeout(timer);
        } else if (isPartnerLeft) {
            console.log('[ChatPage] 상대방이 나갔지만 Auto search가 비활성화되어 있어 자동 이동하지 않습니다. (Auto search 상태:', isAutoSearchEnabled, ')');
        }
    }, [isPartnerLeft, isAutoSearchEnabled, onNavigateToDashboard]);

    // Function to send a message
    const handleSendMessage = (text: string) => {
        if (!chatSocket || !currentRoomId) {
            console.error('Cannot send message, socket or room ID missing.');
            return;
        }
        if (text.trim() === '') return; // Don't send empty messages

        console.log(`Sending message to room ${currentRoomId}: ${text}`);
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
                    onNavigateToDashboard={onNavigateToDashboard} 
                    onNavigateToMyProfile={onNavigateToMyProfile}
                    onNavigateToSettings={onNavigateToSettings}
                    currentView={currentView}
                    matchedRoomId={currentRoomId}
                    onNavigateToChat={() => {}} // 이미 채팅방에 있으므로 빈 함수 전달
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
        </div>
    );
};

export default ChatPage; 