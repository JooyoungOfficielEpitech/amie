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
