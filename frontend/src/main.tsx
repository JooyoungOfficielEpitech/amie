// import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = "545394132150-07rlp3eco58brrg03g4j4nruh4l3btjg.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode> {/* 임시 주석 처리 */}
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  // </React.StrictMode>, {/* 임시 주석 처리 */}
)
