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
import { CreditModalProvider } from './contexts/CreditModalContext';

// Define type for social signup initial data
interface InitialSocialData {
  provider: 'google' | 'kakao';
  socialEmail: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showSignupFlow, setShowSignupFlow] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [socialSignupData, setSocialSignupData] = useState<InitialSocialData | null>(null);
  const [currentChatRoomId, setCurrentChatRoomId] = useState<string | null>(null);
  const [userCredit, setUserCredit] = useState<number | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAutoSearchEnabled, setIsAutoSearchEnabled] = useState<boolean>(() => {
    const savedState = localStorage.getItem('isAutoSearchEnabled');
    return savedState === 'true';
  });

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
      setIsLoading(true);
      setError(null);

      try {
          const birthYear = parseInt(finalData.dob, 10);
          const height = parseInt(finalData.height, 10);
          if (isNaN(birthYear) || isNaN(height) || !finalData.gender || (finalData.gender !== 'male' && finalData.gender !== 'female')) {
              throw new Error("입력된 프로필 정보가 유효하지 않습니다.");
          }
          // Use actual uploaded image URLs, filtering out any nulls
          const profileImageUrls = finalData.profilePics.filter(url => url !== null) as string[];

          const MIN_PROFILE_PICS = 3; // Or fetch from a shared config
          if (profileImageUrls.length < MIN_PROFILE_PICS) {
              throw new Error(`프로필 사진을 최소 ${MIN_PROFILE_PICS}개 업로드해야 합니다.`);
          }

          // Use actual uploaded business card URL if available
          const businessCardImageUrl = finalData.gender === 'male' && finalData.businessCard
              ? finalData.businessCard
              : undefined;

          let response: any;

          if (socialSignupData) {
              const socialPayload: SocialRegisterData = {
                  provider: socialSignupData.provider,
                  socialEmail: socialSignupData.socialEmail,
                  nickname: finalData.nickname,
                  birthYear: birthYear,
                  height: height,
                  city: finalData.city,
                  gender: finalData.gender,
                  profileImages: profileImageUrls,
                  businessCardImage: businessCardImageUrl
              };
              response = await authApi.socialRegister(socialPayload);
          } else {
              const registerPayload: RegisterData = {
                  email: finalData.email,
                  password: finalData.password,
                  nickname: finalData.nickname,
                  birthYear: birthYear,
                  height: height,
                  city: finalData.city,
                  gender: finalData.gender,
                  profileImages: profileImageUrls,
                  businessCardImage: businessCardImageUrl
              };
              response = await authApi.register(registerPayload);
          }

          // Handle API response (common part)
          if (response.success) { 
              // 모든 회원가입 성공 시 자동 로그인 처리
              if (response.token) {
                  localStorage.setItem('accessToken', response.token);
                  localStorage.removeItem('access_token');
                  handleLoginSuccess(response.token);
                  
                  // 잠시 후 크레딧 정보를 명시적으로 다시 가져오기
                  setTimeout(async () => {
                      await fetchUserProfile();
                  }, 500);
              } else {
                  // 토큰이 없는 경우 로그인 시도
                  try {
                      const loginResponse = await authApi.login({
                          email: finalData.email,
                          password: finalData.password
                      });
                      if (loginResponse.success && loginResponse.token) {
                          localStorage.setItem('accessToken', loginResponse.token);
                          localStorage.removeItem('access_token');
                          handleLoginSuccess(loginResponse.token);
                      } else {
                          throw new Error('자동 로그인에 실패했습니다.');
                      }
                  } catch (loginErr) {
                      throw new Error('회원가입은 성공했으나 자동 로그인에 실패했습니다. 다시 로그인해주세요.');
                  }
              }
          } else {
              throw new Error(response.message || (socialSignupData ? "소셜 회원가입 실패" : "회원가입 실패"));
          }

      } catch (err: any) {
          console.error("회원가입 처리 중 오류 발생:", err);
          const errorMessage = err.response?.data?.message || err.message || "알 수 없는 오류가 발생했습니다.";
          setError(errorMessage);
          alert(`회원가입 오류: ${errorMessage}`);
      } finally {
          setIsLoading(false);
          setShowSignupFlow(false); // Close signup flow on completion/error
          setSocialSignupData(null); // Reset social signup data
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

  useEffect(() => {
    if (currentUserProfile && currentUserProfile.gender === 'female' && isAutoSearchEnabled) {
      setIsAutoSearchEnabled(false);
      localStorage.setItem('isAutoSearchEnabled', 'false');
    }
  }, [currentUserProfile, isAutoSearchEnabled]);

  return (
    <CreditModalProvider>
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
                          setIsAutoSearchEnabled={setIsAutoSearchEnabled}
                          isAutoSearchEnabled={isAutoSearchEnabled}
                          onAutoSearchChange={handleAutoSearchChange}
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
    </CreditModalProvider>
  );
}

export default App;