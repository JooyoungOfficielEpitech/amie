import React from 'react';
import styles from './MainPage.module.css';
import { UserProfile } from '../../api';
import * as AppStrings from '../../constants/strings';

// 통합된 매칭 박스 Props 정의
interface MatchingBoxProps {
  profile: UserProfile;
  isMatching: boolean;
  isButtonDisabled: boolean;
  matchedRoomId: string | null;
  buttonText: string;
  isLoadingRoomStatus: boolean;
  matchError: string | null;
  onMatchButtonClick: () => void;
  isSocketConnected: boolean;
}

const MatchingBox: React.FC<MatchingBoxProps> = ({
  profile,
  isMatching,
  isButtonDisabled,
  buttonText,
  matchError,
  onMatchButtonClick,
  isSocketConnected
}) => {
  return (
    <section className={styles.contentBox}>
      <div className={styles.profileHeader}>
        <span className={styles.profileTitle}>{`${AppStrings.MAINPAGE_PROFILE_TITLE_PREFIX}${profile.nickname}${AppStrings.MAINPAGE_PROFILE_TITLE_SUFFIX}`}</span>
        <span className={styles.statusBadge}>
          {isSocketConnected ? AppStrings.MAINPAGE_STATUS_ACTIVE : 'DISCONNECTED'}
        </span>
      </div>
      
      {/* 매칭 시작/취소 버튼 */}
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

export default MatchingBox; 