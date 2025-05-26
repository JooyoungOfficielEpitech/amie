import React from 'react';
import styles from './Sidebar.module.css';
import { FaHeart, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa'; // Example icons
import { useNavigate } from 'react-router-dom';

// Define props
interface SidebarProps {
    onLogout: () => void;
    currentView?: 'dashboard' | 'chat' | 'my-profile' | 'settings';
    matchedRoomId: string | null; // Add matched room ID
}

const Sidebar: React.FC<SidebarProps> = ({ 
    onLogout, 
    currentView,
    matchedRoomId
}) => {
    const navigate = useNavigate();

    const handleItemClick = (item: string) => {
        switch (item) {
            case 'Match':
                if (matchedRoomId) {
                    navigate(`/chat/${matchedRoomId}`);
                } else {
                    navigate('/');
                }
                break;
            case 'Profile':
                navigate('/my-profile');
                break;
            case 'Settings':
                navigate('/settings');
                break;
            case 'Log out':
                onLogout();
                break;
            // Default case removed - no action needed for unknown items
        }
    };

    return (
        <aside className={styles.sidebar}>
            <nav>
                <ul>
                    <li
                        className={currentView === 'dashboard' || currentView === 'chat' ? styles.active : ''}
                        onClick={() => handleItemClick('Match')}
                    >
                        <FaHeart /> Match
                    </li>
                    <li
                        className={currentView === 'my-profile' ? styles.active : ''}
                        onClick={() => handleItemClick('Profile')}
                    >
                        <FaUser /> Profile
                    </li>
                    <li
                        className={currentView === 'settings' ? styles.active : ''}
                        onClick={() => handleItemClick('Settings')}
                    >
                        <FaCog /> Settings
                    </li>
                    <li
                        className={''}
                        onClick={() => handleItemClick('Log out')}
                    >
                        <FaSignOutAlt /> Log out
                    </li>
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar; 