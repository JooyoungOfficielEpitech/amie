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

// Define type for social signup initial data
interface InitialSocialData {
  provider: 'google' | 'kakao';
  socialEmail: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'chat' | 'my-profile' | 'settings'>('dashboard');
  const [showSignupFlow, setShowSignupFlow] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // State to hold initial data for social signup
  const [socialSignupData, setSocialSignupData] = useState<InitialSocialData | null>(null);
  const [currentChatRoomId, setCurrentChatRoomId] = useState<string | null>(null); // State for current room ID
  const [userCredit, setUserCredit] = useState<number | null>(null); // Add state for user credit
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  // Auto search 기능을 위한 상태 추가
  const [isAutoSearchEnabled, setIsAutoSearchEnabled] = useState<boolean>(false);

  // Fetch user profile function (ensure setCurrentUserProfile is called correctly)
  const fetchUserProfile = useCallback(async () => {
      console.log('[App fetchUserProfile] Fetching user profile...'); 
      try {
          const response = await userApi.getProfile(); 
          console.log('[App fetchUserProfile] API Response:', response); 
          if (response.success && response.user) {
              setCurrentUserProfile(response.user); // Set the full profile object
              setUserCredit(response.user.credit); // Set credit separately
              console.log('[App fetchUserProfile] User profile state SET:', response.user);
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

  // Function to handle successful login - Wrapped in useCallback
  const handleLoginSuccess = useCallback((token?: string) => {
    console.log("Login Success triggered!");
    // 명시적으로 토큰을 accessToken으로 저장 (중복 작업이지만 안전성 확보)
    if (token) {
      localStorage.setItem('accessToken', token);
      console.log("Token explicitly saved to localStorage as 'accessToken'");
    }
    
    setIsLoggedIn(true);
    setActiveView('dashboard'); 
    setShowSignupFlow(false); 
    // fetchUserProfile은 useEffect에서 호출되지만, 지연 발생 가능성이 있어서 명시적으로 다시 호출
    setTimeout(() => {
      fetchUserProfile(); // 상태 업데이트 후 프로필 정보 명시적으로 다시 가져오기
    }, 300);
  }, [fetchUserProfile]); // fetchUserProfile 의존성 추가

  // Function to handle starting the NORMAL signup process
  const handleStartSignup = () => {
    console.log("Start Normal Signup triggered!");
    setSocialSignupData(null); // Ensure no social data is present
    setShowSignupFlow(true);
  };

  // Function to handle starting the SOCIAL signup process
  const handleStartSocialSignup = (provider: 'google' | 'kakao', socialEmail: string) => {
    console.log("Start Social Signup triggered for:", provider, socialEmail);
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
      console.log("Signup Complete in App:", finalData);
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
              ? finalData.businessCard // 이제 finalData.businessCard는 string | null | undefined 타입
              : undefined;

          let response: any; // To store response from either API call

          // Check if it's a social signup flow
          if (socialSignupData) {
              console.log("Processing SOCIAL signup...");
              const socialPayload: SocialRegisterData = {
                  provider: socialSignupData.provider,
                  socialEmail: socialSignupData.socialEmail,
                  nickname: finalData.nickname,
                  birthYear: birthYear,
                  height: height,
                  city: finalData.city,
                  gender: finalData.gender,
                  profileImages: profileImageUrls,
                  businessCardImage: businessCardImageUrl // 실제 URL 사용
              };
              console.log("Social Register API Payload:", socialPayload);
              response = await authApi.socialRegister(socialPayload);
              console.log("Social Register API Response:", response);

          } else {
              console.log("Processing NORMAL signup...");
              // Normal email signup
              const registerPayload: RegisterData = {
                  email: finalData.email,
                  password: finalData.password,
                  nickname: finalData.nickname,
                  birthYear: birthYear,
                  height: height,
                  city: finalData.city,
                  gender: finalData.gender,
                  profileImages: profileImageUrls,
                  businessCardImage: businessCardImageUrl // 실제 URL 사용
              };
              console.log("Register API Payload:", registerPayload);
              response = await authApi.register(registerPayload);
              console.log("Register API Response:", response);
          }

          // Handle API response (common part)
          if (response.success) { 
              // Social signup might return token directly, normal signup might not
              if (response.token) {
                 console.log("Signup successful, logging in...");
                 localStorage.setItem('accessToken', response.token);
                 handleLoginSuccess(); // Use existing login success handler
                 
                 // 잠시 후 크레딧 정보를 명시적으로 다시 가져오기
                 setTimeout(async () => {
                   await fetchUserProfile();
                 }, 500);
              } else {
                 alert("회원가입 성공! 다시 로그인해주세요.");
                 setIsLoggedIn(false); // Ensure user is logged out
                 setActiveView('dashboard'); // Go back to login view
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
      console.log("Signup Flow Closed/Cancelled");
      setShowSignupFlow(false);
      setSocialSignupData(null); // Reset social signup data on close
  }

  // Function to handle logout
  const handleLogout = () => {
      console.log("Logout triggered!"); 
      localStorage.removeItem('accessToken'); // Ensure token is removed on logout
      setIsLoggedIn(false);
      setShowSignupFlow(false); 
      setCurrentChatRoomId(null); 
      setUserCredit(null); // Clear credit on logout
      setActiveView('dashboard'); 
  };

  // Navigation functions
  const navigateToChat = (roomId: string) => { 
      if (isLoggedIn) {
          console.log(`Navigating to chat room: ${roomId}`);
          setCurrentChatRoomId(roomId); 
          setActiveView('chat');
      }
  };

  const navigateToDashboard = () => {
      if (isLoggedIn) {
          setCurrentChatRoomId(null); 
          setActiveView('dashboard');
      }
  };

  const navigateToMyProfile = () => {
      if (isLoggedIn) {
           setCurrentChatRoomId(null); 
           setActiveView('my-profile');
      }
  };

  const navigateToSettings = () => {
      if (isLoggedIn) {
           setCurrentChatRoomId(null); 
           setActiveView('settings');
      }
  };

  // Helper function to render the active component
  const renderActiveView = () => {
      // Derive userId directly from the LATEST state value within the render function
      const userId = currentUserProfile?.id; 

      console.log(`[App renderActiveView Decision] activeView: ${activeView}, isLoggedIn: ${isLoggedIn}, userId: ${userId}`);

      // Simplified check: If logged in, but userId is still not available (falsy), show loading.
      if (isLoggedIn && !userId) { 
          console.log(`[App renderActiveView] isLoggedIn is true, but userId ('${userId}') is falsy. Returning loading indicator.`);
          return <div>Loading user data...</div>; 
      }
      
      // If not logged in, the main return block will handle rendering Login component.
      // So if we reach here, isLoggedIn is true AND userId is valid.

      switch (activeView) {
          case 'dashboard':
              return <MainPage 
                          onLogout={handleLogout} 
                          onNavigateToChat={navigateToChat} 
                          onNavigateToMyProfile={navigateToMyProfile}
                          onNavigateToSettings={navigateToSettings}
                          currentView={activeView}
                          onCreditUpdate={fetchUserProfile} // Pass the profile fetch function
                          isAutoSearchEnabled={isAutoSearchEnabled}
                      />;
          case 'chat':
              if (!currentChatRoomId) {
                   console.error("Attempted to render ChatPage without a roomId!");
                   navigateToDashboard(); 
                   return null; 
              }
              // Add an explicit check for userId before rendering ChatPage
              if (!userId) {
                  console.error("Attempted to render ChatPage without a valid userId!");
                  // Optionally show loading or navigate away
                  return <div>Loading user data...</div>; // Or navigateToDashboard();
              }
              // Now userId is guaranteed to be a string here
              return <ChatPage 
                          onLogout={handleLogout} 
                          onNavigateToDashboard={navigateToDashboard} 
                          onNavigateToMyProfile={navigateToMyProfile}
                          onNavigateToSettings={navigateToSettings}
                          currentView={activeView}
                          roomId={currentChatRoomId} 
                          userId={userId} // Now guaranteed to be a string
                          onCreditUpdate={fetchUserProfile} // 크레딧 업데이트 함수 추가
                          isAutoSearchEnabled={isAutoSearchEnabled} // Auto search 상태 전달
                      />;
          case 'my-profile':
              // No need to re-check userId here
              return <MyProfile 
                          onNavigateToDashboard={navigateToDashboard}
                          onLogout={handleLogout}
                          onNavigateToMyProfile={navigateToMyProfile}
                          onNavigateToSettings={navigateToSettings}
                          currentView={activeView}
                          currentChatRoomId={currentChatRoomId}
                          onNavigateToChat={navigateToChat}
                      />; 
          case 'settings':
               // No need to re-check userId here
              return <Settings 
                          onNavigateToDashboard={navigateToDashboard}
                          onLogout={handleLogout}
                          onNavigateToMyProfile={navigateToMyProfile}
                          onNavigateToSettings={navigateToSettings}
                          currentView={activeView}
                          currentChatRoomId={currentChatRoomId}
                          onNavigateToChat={navigateToChat}
                      />;
          default:
              // Fallback to dashboard if view is unknown, assuming profile loaded if logged in
              console.log(`[App renderActiveView] Default case, rendering MainPage.`);
              return <MainPage 
                          onLogout={handleLogout} 
                          onNavigateToChat={navigateToChat} 
                          onNavigateToMyProfile={navigateToMyProfile} 
                          onNavigateToSettings={navigateToSettings}
                          currentView={activeView}
                          onCreditUpdate={fetchUserProfile} 
                          isAutoSearchEnabled={isAutoSearchEnabled}
                       />;
      }
  };

  // Use useEffect to check token and set initial login state
  useEffect(() => {
    // Check if token exists in localStorage (using accessToken as standard)
    const token = localStorage.getItem('accessToken');
    
    // 토큰 내용 디버깅
    if (token) {
      console.log('[App] Token debugging - token exists');
      try {
        // Base64 디코딩으로 토큰 내용 확인
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('[App] Token payload:', payload);
          
          // 만료시간 확인
          if (payload.exp) {
            const expiryDate = new Date(payload.exp * 1000);
            const now = new Date();
            const isExpired = expiryDate < now;
            console.log('[App] Token expiry:', expiryDate.toISOString());
            console.log('[App] Token is ' + (isExpired ? 'EXPIRED' : 'valid'));
          }
        }
      } catch (error) {
        console.error('[App] Error decoding token:', error);
      }
    }
    
    if (token) {
      console.log('[App] Token found, setting logged in state to true.');
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      setUserCredit(null); // Ensure credit is null if not logged in initially
    }
  }, []);

  // Use a separate useEffect to fetch credit *after* isLoggedIn is confirmed true
  useEffect(() => {
      if (isLoggedIn) {
          console.log("[App] isLoggedIn is true, fetching user credit.");
          fetchUserProfile(); 
      }
  }, [isLoggedIn]); // Run whenever isLoggedIn changes

  // 매칭된 채팅방이 있으면 자동으로 채팅방으로 이동
  useEffect(() => {
    if (isLoggedIn && currentChatRoomId && activeView === 'dashboard') {
      console.log('[App] Auto navigating to chat room:', currentChatRoomId);
      setActiveView('chat');
    }
  }, [isLoggedIn, currentChatRoomId, activeView]);

  return (
    <div className="app">
      <AuthProvider>
        <CreditProvider>
          <PaymentProvider onCreditUpdate={fetchUserProfile}>
            {!isLoggedIn 
              ? <div className="loginPageContainer">
                  <Login 
                    onLoginSuccess={handleLoginSuccess} 
                    onStartSignup={handleStartSignup} 
                    onStartSocialSignup={handleStartSocialSignup} 
                  />
                </div>
              : (
                // New container for logged-in view (Header + Main Content)
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100vh',
                  overflow: 'hidden' // Prevent this container from scrolling
                }}>
                  {/* Pass userCredit and fetchUserProfile to Header */}
                  <Header 
                    creditBalance={userCredit} 
                    onRefetchCredit={fetchUserProfile}
                    userGender={currentUserProfile?.gender} // 사용자 성별 정보 전달
                    isAutoSearchEnabled={isAutoSearchEnabled}
                    onAutoSearchChange={setIsAutoSearchEnabled}
                  /> 
                  {/* Container for the actual page content (MainPage, ChatPage, etc.) */}
                  <div style={{
                    flexGrow: 1, // Take remaining vertical space
                    overflow: 'hidden' // Prevent content area from causing outer scroll
                  }}>
                    {renderActiveView()} // Call renderActiveView for the main content
                  </div>
                </div>
              )
            }
            
            {/* 회원가입 플로우 오버레이 */}
            {showSignupFlow && (
                <SignupFlow 
                    isOpen={true}
                    onClose={handleCloseSignup} 
                    onComplete={handleSignupComplete}
                    initialSocialData={socialSignupData} 
                />
            )}

            {/* Optional: Display Loading Indicator */}
            {isLoading && <div className="loading-overlay">처리 중...</div>}

            {/* Optional: Display Error Message */}
            {error && <div className="error-message">오류: {error}</div>}
          </PaymentProvider>
        </CreditProvider>
      </AuthProvider>
    </div>
  );
}

export default App;