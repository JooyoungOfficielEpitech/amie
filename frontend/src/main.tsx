import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PaymentProvider } from './contexts/PaymentContext.tsx'
import { CreditProvider } from './contexts/CreditContext.tsx'
import { ProfileProvider } from './contexts/ProfileContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { SocketProvider } from './contexts/SocketContext.tsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

// ===================== 환경 변수 디버깅 코드 (나중에 제거) =====================
console.log('🔍 === 환경 변수 디버깅 시작 ===');
console.log('🔹 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('🔹 NODE_ENV:', import.meta.env.MODE);
console.log('🔹 DEV:', import.meta.env.DEV);
console.log('🔹 PROD:', import.meta.env.PROD);
console.log('🔹 모든 환경 변수:', import.meta.env);
console.log('🔍 === 환경 변수 디버깅 종료 ===');
// ===========================================================================

const googleClientId = "545394132150-07rlp3eco58brrg03g4j4nruh4l3btjg.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <SocketProvider>
          <ProfileProvider>
            <CreditProvider>
              <PaymentProvider>
                <App />
              </PaymentProvider>
            </CreditProvider>
          </ProfileProvider>
        </SocketProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
