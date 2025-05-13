import React from 'react';
import styles from './MainPage.module.css';
import { UserProfile } from '../../api';
import * as AppStrings from '../../constants/strings';

// --- 여성용 매칭 박스 Props 정의 ---
interface FemaleMatchingBoxProps {
  profile: UserProfile;
  isMatching: boolean;
  isButtonDisabled: boolean;
  matchedRoomId: string | null;
  buttonText: string;
  isLoadingRoomStatus: boolean;
  matchError: string | null;
  onMatchButtonClick: () => void;
}

const FemaleMatchingBox: React.FC<FemaleMatchingBoxProps> = ({
  profile,
  isMatching,
  isButtonDisabled,
  buttonText,
  matchError,
  onMatchButtonClick
}) => {
  return (
    <section className={styles.contentBox}>
      <div className={styles.profileHeader}>
        <span className={styles.profileTitle}>{`${AppStrings.MAINPAGE_PROFILE_TITLE_PREFIX}${profile.nickname}${AppStrings.MAINPAGE_PROFILE_TITLE_SUFFIX}`}</span>
        <span className={styles.statusBadge}>{profile.isActive ? AppStrings.MAINPAGE_STATUS_ACTIVE : '비활성'}</span>
      </div>
      
      {/* 여성 사용자용 UI - 기존 버튼 방식 */}
      <button
        className={`${styles.actionButton} ${isMatching ? styles.matchingActive : ''}`}
        onClick={onMatchButtonClick}
        disabled={isButtonDisabled}
      >
        {buttonText}
      </button>
      
      {/* 오류 메시지 표시 */}
      {matchError && <p className={styles.errorMessage}>{matchError}</p>}
    </section>
  );
};

export default FemaleMatchingBox; 