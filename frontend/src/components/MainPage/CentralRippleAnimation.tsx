import React, { useEffect, useState } from 'react';
import './RippleAnimation.css';

interface CentralRippleAnimationProps {
  isVisible: boolean;
}

const CentralRippleAnimation: React.FC<CentralRippleAnimationProps> = ({ isVisible }) => {
  const [fade, setFade] = useState<'in' | 'out' | null>(null);
  
  useEffect(() => {
    if (isVisible) {
      setFade('in');
    } else {
      // 애니메이션이 이미 보이는 상태일 때만 페이드 아웃
      if (fade === 'in') {
        setFade('out');
        // 페이드 아웃 애니메이션 완료 후 null로 설정
        const timer = setTimeout(() => {
          setFade(null);
        }, 600);
        return () => clearTimeout(timer);
      } else {
        setFade(null);
      }
    }
  }, [isVisible, fade]);
  
  if (fade === null) {
    return null;
  }
  
  // 애니메이션 요소 수를 2개로 제한
  return (
    <div className={`central-ripple-container ${fade === 'in' ? 'fade-in' : 'fade-out'}`}>
      <div className="central-ripple ripple-1"></div>
      <div className="central-ripple ripple-2"></div>
    </div>
  );
};

export default CentralRippleAnimation; 