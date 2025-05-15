import React, { useEffect, useRef, useState } from 'react';
import styles from './ProfileSlideshow.module.css';

// 샘플 프로필 데이터
const sampleProfiles = [
  {
    id: 1,
    name: 'Emma',
    age: 28,
    imageUrl: 'https://randomuser.me/api/portraits/women/32.jpg'
  },
  {
    id: 2,
    name: 'Sophia',
    age: 24,
    imageUrl: 'https://randomuser.me/api/portraits/women/44.jpg'
  },
  {
    id: 3,
    name: 'Olivia',
    age: 26,
    imageUrl: 'https://randomuser.me/api/portraits/women/68.jpg'
  },
  {
    id: 4,
    name: 'Ava',
    age: 23,
    imageUrl: 'https://randomuser.me/api/portraits/women/90.jpg'
  },
  {
    id: 5,
    name: 'Mia',
    age: 25,
    imageUrl: 'https://randomuser.me/api/portraits/women/79.jpg'
  },
  {
    id: 6,
    name: 'Isabella',
    age: 27,
    imageUrl: 'https://randomuser.me/api/portraits/women/63.jpg'
  },
  {
    id: 7,
    name: 'Emily',
    age: 29,
    imageUrl: 'https://randomuser.me/api/portraits/women/17.jpg'
  },
  {
    id: 8,
    name: 'Charlotte',
    age: 22,
    imageUrl: 'https://randomuser.me/api/portraits/women/33.jpg'
  }
];

const ProfileSlideshow: React.FC = () => {
  // 초기에 더 많은 프로필을 표시하기 위해 샘플 데이터 확장
  const initialProfiles = [...sampleProfiles, ...sampleProfiles.slice(0, 4)];
  const [allProfiles, setAllProfiles] = useState(initialProfiles);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [animationPaused, setAnimationPaused] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  
  // 무한 스크롤 애니메이션 구현
  useEffect(() => {
    // 스크롤 애니메이션 함수
    const animateScroll = () => {
      if (animationPaused || !containerRef.current) return;
      
      // 매우 작은 값씩 증가시켜 부드러운 스크롤 효과
      setScrollPosition(prev => {
        const newPosition = prev + 0.35; // 스크롤 속도를 더 느리게 조정
        
        // 카드 하나가 완전히 화면 밖으로 나가면 처리
        if (newPosition >= 280 && !animationPaused) { // 카드 높이 + 간격
          // 마지막에 새 프로필 추가
          setAllProfiles(prev => {
            // 이미 충분한 카드가 있으면 추가하지 않음
            if (prev.length > 10) return prev;
            
            // 랜덤하게 프로필 선택하여 복제
            const randomIndex = Math.floor(Math.random() * sampleProfiles.length);
            const newProfile = {...sampleProfiles[randomIndex]};
            newProfile.id = Date.now() + Math.random(); // 고유 ID 생성
            return [...prev, newProfile];
          });
          
          // 화면 밖으로 나간 첫 번째 아이템 제거
          if (newPosition >= 300) {
            setAnimationPaused(true);
            setTimeout(() => {
              if (containerRef.current) {
                setAllProfiles(prev => prev.slice(1));
                setScrollPosition(newPosition - 280);
                setAnimationPaused(false);
              }
            }, 50);
          }
        }
        
        return newPosition;
      });
    };
    
    // 약 60fps로 애니메이션 실행
    const animationId = setInterval(animateScroll, 16);
    
    return () => clearInterval(animationId);
  }, [animationPaused]);
  
  // 마우스 호버 이벤트 핸들러 (터치 디바이스에서는 작동하지 않음)
  const handleCardMouseEnter = (index: number) => {
    setHoveredCard(index);
  };
  
  const handleCardMouseLeave = () => {
    setHoveredCard(null);
  };
  
  return (
    <div className={styles.slideshowContainer}>
      <div className={styles.profileSlideshow} ref={containerRef}>
        <div 
          className={styles.profileInnerContainer}
          style={{ transform: `translateY(-${scrollPosition}px)` }}
        >
          {/* 처음에 7개의 프로필만 보여주기 */}
          {allProfiles.map((profile, index) => (
            <div
              key={profile.id}
              className={styles.profileCard}
              style={{ 
                backgroundImage: `url(${profile.imageUrl})`,
                // 호버한 카드는 블러 효과 감소
                filter: hoveredCard === index ? 'blur(2px)' : 'blur(4px)'
              }}
              onMouseEnter={() => handleCardMouseEnter(index)}
              onMouseLeave={handleCardMouseLeave}
            >
              <div className={styles.profileInfo}>
                <div className={styles.profileName}>{profile.name}</div>
                <div className={styles.profileAge}>{profile.age}세</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSlideshow; 