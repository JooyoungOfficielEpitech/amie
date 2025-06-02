import { useState, useEffect, useCallback } from 'react';
import Login from './components/Login/Login';
import MainPage from './components/MainPage/MainPage';
import ChatPage from './components/ChatPage/ChatPage';
import MyProfile from './components/MyProfile/MyProfile';
import Settings from './components/Settings/Settings';
import SignupFlow from './components/SignupFlow/SignupFlow';
import { SignupData } from './types';
import './App.css';
import { authApi, RegisterData, SocialRegisterData, userApi, UserProfile } from './api';
import Header from './components/MainPage/Header';
import { CreditProvider } from './contexts/CreditContext';
import { AuthProvider } from './contexts/AuthContext';
import { PaymentProvider } from './contexts/PaymentContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './components/Admin/AdminLogin';
import AdminPage from './components/Admin/AdminPage.tsx';
import { useImageUpload } from './hooks/useImageUpload';
import { RechargeModalProvider } from './contexts/RechargeModalContext';

// Define type for social signup initial data
interface InitialSocialData {
  provider: 'google' | 'kakao';
  socialEmail: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showSignupFlow, setShowSignupFlow] = useState<boolean>(false);
  const [isLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [socialSignupData, setSocialSignupData] = useState<InitialSocialData | null>(null);
  const [currentChatRoomId, setCurrentChatRoomId] = useState<string | null>(null);
  const [userCredit, setUserCredit] = useState<number | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAutoSearchEnabled, setIsAutoSearchEnabled] = useState<boolean>(() => {
    const savedState = localStorage.getItem('isAutoSearchEnabled');
    return savedState === 'true';
  });

  useImageUpload({ userId: null, folderPath: 'profile' });

  // isAutoSearchEnabled 변경될 때마다 로그 출력 및 localStorage에 저장
  useEffect(() => {
    // localStorage에 상태 저장 (로그아웃해도 유지)
    localStorage.setItem('isAutoSearchEnabled', isAutoSearchEnabled ? 'true' : 'false');
  }, [isAutoSearchEnabled]);

  // Fetch user profile function (ensure setCurrentUserProfile is called correctly)
  const fetchUserProfile = useCallback(async () => {
      try {
          const response = await userApi.getProfile();
          if (response.success && response.user) {
              setCurrentUserProfile(response.user); // Set the full profile object
              setUserCredit(response.user.credit); // Set credit separately
          } else {
              const message = response.message || '프로필 정보 없음';
              console.error("[App fetchUserProfile] Failed to get profile:", message);
              setError('프로필 정보를 가져오지 못했습니다: ' + message);
              setCurrentUserProfile(null); 
              setUserCredit(null); 
          }
      } catch (err: any) {
          console.error("[App fetchUserProfile] Error fetching user profile:", err);
          setError(err.message || '프로필 정보를 가져오는데 실패했습니다.');
          setCurrentUserProfile(null); 
          setUserCredit(null); 
      }
  }, []); // Keep empty dependency array

  // isAutoSearchEnabled 변경될 때마다 로그 출력 및 localStorage에 저장
  useEffect(() => {
    // 앱 시작 시 access_token 남아있으면 삭제
    localStorage.removeItem('access_token');
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      setUserCredit(null);
      localStorage.removeItem('currentChatRoomId');
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserProfile();
    }
  }, [isLoggedIn]);

  // Function to handle successful login - Wrapped in useCallback
  const handleLoginSuccess = useCallback((token?: string) => {
    if (token) {
      localStorage.setItem('accessToken', token);
      localStorage.removeItem('access_token');
      setIsLoggedIn(true);
      fetchUserProfile(); // 즉시 호출
    }
    setShowSignupFlow(false);
    // 로그인 성공 시 localStorage에서 auto search 상태 명시적으로 가져오기
    const savedAutoSearchState = localStorage.getItem('isAutoSearchEnabled');
    setIsAutoSearchEnabled(savedAutoSearchState === 'true');
  }, [fetchUserProfile]);

  // Function to handle starting the NORMAL signup process
  const handleStartSignup = () => {
    setSocialSignupData(null); // Ensure no social data is present
    setShowSignupFlow(true);
  };

  // Function to handle starting the SOCIAL signup process
  const handleStartSocialSignup = (provider: 'google' | 'kakao', socialEmail: string) => {
    if (!socialEmail) {
        alert("Google 계정에서 이메일 정보를 가져올 수 없습니다. Google 설정을 확인해주세요.");
        return;
    }
    setSocialSignupData({ provider, socialEmail });
    setShowSignupFlow(true);
     // Keep user logged out visually until signup is complete
    setIsLoggedIn(false); 
  };

  // Unified function to handle signup completion (both normal and social)
  const handleSignupComplete = async (finalData: SignupData) => {
    try {
      // Convert date string to birthYear
      const birthYear = new Date(finalData.dob).getFullYear();
      const height = parseInt(finalData.height);

      // Filter out null values from profilePics
      const profileImageUrls = finalData.profilePics.filter((url): url is string => url !== null);

      // Get business card URL if it exists and user is male
      const businessCardImageUrl = finalData.gender === 'male' ? finalData.businessCard || undefined : undefined;

      let response; // To store response from either API call

      // Check if it's a social signup flow
      if (socialSignupData) {
        const socialPayload: SocialRegisterData = {
          provider: socialSignupData.provider,
          socialEmail: socialSignupData.socialEmail,
          nickname: finalData.nickname,
          birthYear: birthYear,
          height: height,
          city: finalData.city,
          gender: finalData.gender as 'male' | 'female',
          profileImages: profileImageUrls,
          businessCardImage: businessCardImageUrl
        };
        response = await authApi.socialRegister(socialPayload);
      } else {
        // Normal email signup
        const registerPayload: RegisterData = {
          email: finalData.email,
          password: finalData.password,
          nickname: finalData.nickname,
          birthYear: birthYear,
          height: height,
          city: finalData.city,
          gender: finalData.gender as 'male' | 'female',
          profileImages: profileImageUrls,
          businessCardImage: businessCardImageUrl
        };
        response = await authApi.register(registerPayload);
      }

      if (response.success) {
        // Automatically log in after successful registration
        const loginResponse = await authApi.login({
          email: finalData.email,
          password: finalData.password
        });

        if (loginResponse.success && loginResponse.token) {
          localStorage.setItem('accessToken', loginResponse.token);
          setIsLoggedIn(true);
          setShowSignupFlow(false);
          setSocialSignupData(null);
          await fetchUserProfile(); // Fetch user profile after login
        } else {
          throw new Error('자동 로그인에 실패했습니다.');
        }
      } else {
        throw new Error(response.message || '회원가입에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      alert(error.message || '회원가입 중 오류가 발생했습니다.');
    }
  };

  // Function to cancel/close signup flow
  const handleCloseSignup = () => {
      setShowSignupFlow(false);
      setSocialSignupData(null); // Reset social signup data on close
  }

  // Function to handle logout
  const handleLogout = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('access_token');
      localStorage.removeItem('currentChatRoomId');
      setIsLoggedIn(false);
      setShowSignupFlow(false); 
      setCurrentChatRoomId(null); 
      setUserCredit(null); // Clear credit on logout
  };

  // Auto search 상태 변경 핸들러
  const handleAutoSearchChange = (enabled: boolean) => {
    setIsAutoSearchEnabled(enabled);
  };

  // 렌더링 전에 헤더에 표시할 컴포넌트
  const renderHeader = () => {
    if (!isLoggedIn) return null;
    if (!currentUserProfile) return <div style={{height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>로딩 중...</div>;
    return (
      <Header
        creditBalance={userCredit}
        userGender={currentUserProfile.gender}
        isAutoSearchEnabled={isAutoSearchEnabled}
        onAutoSearchChange={handleAutoSearchChange}
      />
    );
  };

  useEffect(() => {
    if (currentUserProfile) {
      localStorage.setItem('currentUserProfile', JSON.stringify(currentUserProfile));
    }
  }, [currentUserProfile]);

  return (
    <div className="app">
      <AuthProvider>
        <CreditProvider>
          <PaymentProvider onCreditUpdate={fetchUserProfile}>
            <Router>
              <Routes>
                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route 
                  path="/admin/*" 
                  element={
                    localStorage.getItem('adminToken') ? (
                      <AdminPage />
                    ) : (
                      <Navigate to="/admin/login" replace />
                    )
                  } 
                />
                
                {/* Main app routes */}
                {!isLoggedIn ? (
                  <Route path="*" element={
                    <div className="loginPageContainer">
                      <Login 
                        onLoginSuccess={handleLoginSuccess} 
                        onStartSignup={handleStartSignup} 
                        onStartSocialSignup={handleStartSocialSignup} 
                      />
                    </div>
                  } />
                ) : (
                  <>
                    <Route path="/" element={
                      <>
                        {renderHeader()}
                        <MainPage 
                          onLogout={handleLogout} 
                          onCreditUpdate={fetchUserProfile}
                        />
                      </>
                    } />
                    <Route path="/chat/:roomId" element={
                      <>
                        {renderHeader()}
                        <ChatPage 
                          onLogout={handleLogout} 
                          userId={currentUserProfile?.id || ''}
                          onCreditUpdate={fetchUserProfile}
                        />
                      </>
                    } />
                    <Route path="/my-profile" element={
                      <>
                        {renderHeader()}
                        <MyProfile 
                          onLogout={handleLogout}
                          currentView={'my-profile'}
                          currentChatRoomId={currentChatRoomId}
                        />
                      </>
                    } />
                    <Route path="/settings" element={
                      <>
                        {renderHeader()}
                        <Settings 
                          onLogout={handleLogout}
                          currentView={'settings'}
                          currentChatRoomId={currentChatRoomId}
                        />
                      </>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </>
                )}
              </Routes>
            </Router>

            {showSignupFlow && (
              <SignupFlow 
                isOpen={true}
                onClose={handleCloseSignup} 
                onComplete={handleSignupComplete}
                initialSocialData={socialSignupData} 
              />
            )}
            {isLoading && <div className="loading-overlay">처리 중...</div>}
            {error && <div className="error-message">오류: {error}</div>}
          </PaymentProvider>
        </CreditProvider>
      </AuthProvider>
    </div>
  );
}

export default function WrappedApp() {
  return (
    <RechargeModalProvider>
      <App />
    </RechargeModalProvider>
  );
}