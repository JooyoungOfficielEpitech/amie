import React, { useEffect, useState } from 'react';
import './RippleAnimation.css';

interface CentralRippleAnimationProps {
  isVisible: boolean;
}

const CentralRippleAnimation: React.FC<CentralRippleAnimationProps> = ({ isVisible }) => {
  const [fade, setFade] = useState<'in' | 'out' | null>(null);
  
  useEffect(() => {
    console.log('[CentralRippleAnimation] isVisible 변경됨:', isVisible);
    
    if (isVisible) {
      console.log('[CentralRippleAnimation] 페이드 인 시작');
      setFade('in');
    } else {
      // 애니메이션이 이미 보이는 상태일 때만 페이드 아웃
      if (fade === 'in') {
        console.log('[CentralRippleAnimation] 페이드 아웃 시작');
        setFade('out');
        // 페이드 아웃 애니메이션 완료 후 null로 설정
        const timer = setTimeout(() => {
          console.log('[CentralRippleAnimation] 애니메이션 완전히 제거');
          setFade(null);
        }, 600);
        return () => clearTimeout(timer);
      } else {
        setFade(null);
      }
    }
  }, [isVisible, fade]);
  
  if (fade === null) {
    console.log('[CentralRippleAnimation] 렌더링 안함 (fade === null)');
    return null;
  }
  
  console.log('[CentralRippleAnimation] 렌더링:', fade === 'in' ? '페이드 인' : '페이드 아웃');
  
  return (
    <div className={`central-ripple-container ${fade === 'in' ? 'fade-in' : 'fade-out'}`}>
      <div className="central-ripple ripple-1"></div>
      <div className="central-ripple ripple-2"></div>
      <div className="central-ripple ripple-3"></div>
      <div className="central-ripple ripple-4"></div>
      <div className="central-ripple ripple-5"></div>
    </div>
  );
};

export default CentralRippleAnimation; 