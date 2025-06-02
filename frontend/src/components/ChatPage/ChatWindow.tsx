import React, { useState, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
import styles from './ChatWindow.module.css';
// Import strings
import * as AppStrings from '../../constants/strings';

// Define the ChatMessage interface matching the backend structure
interface ChatMessage {
    _id: string; 
    senderId: string;
    senderNickname?: string;
    message: string;
    createdAt: string; 
}

// Define props for ChatWindow using the updated interface
interface ChatWindowProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    currentUserId: string;
    isPartnerDisconnected: boolean;
}


const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, currentUserId, isPartnerDisconnected }) => {
    const [newMessage, setNewMessage] = useState('');
    const messageListRef = useRef<HTMLDivElement>(null);

    // Effect to scroll to bottom when messages change
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages]); // Dependency array ensures this runs when messages update

    // handleInputChange remains the same
    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        setNewMessage(event.target.value);
    };

    // Modify handleSendMessage to call the prop function
    const handleSendMessage = (event: FormEvent) => {
        event.preventDefault();
        if (newMessage.trim() === '' || isPartnerDisconnected) return;

        // Call the function passed from ChatPage
        onSendMessage(newMessage);

        // Clear the input field
        setNewMessage('');
        
        // Removed local state update and console log
        // const nextId = ...;
        // const messageToSend = ...;
        // setMessages([...messages, messageToSend]);
        // console.log('Sending message:', messageToSend);
    };

    return (
        <div className={styles.chatWindow}>
            {isPartnerDisconnected && (
              <div className={styles.partnerLeftBanner}>
                <span>
                  <span className={styles.highlight}>Partner</span> left the chat
                </span>
              </div>
            )}
            <div ref={messageListRef} className={styles.messageList}>
                {messages.map((msg) => {
                    const isMyMessage = msg.senderId === currentUserId;

                    return (
                        <div key={msg._id} className={`${styles.messageBubble} ${isMyMessage ? styles.myMessage : styles.otherMessage}`}>
                            {msg.message}
                        </div>
                    );
                })}
            </div>
            <form onSubmit={handleSendMessage} className={styles.messageInputForm}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={isPartnerDisconnected ? AppStrings.CHATWINDOW_PARTNER_LEFT_PLACEHOLDER : AppStrings.CHATWINDOW_INPUT_PLACEHOLDER}
                    className={styles.messageInput}
                    disabled={isPartnerDisconnected}
                />
                <button type="submit" className={styles.sendButton} disabled={isPartnerDisconnected}>{AppStrings.CHATWINDOW_SEND_BUTTON}</button>
            </form>
        </div>
    );
};


export default ChatWindow; 