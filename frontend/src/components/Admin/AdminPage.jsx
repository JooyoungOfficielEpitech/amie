import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import UserList from './UserList';
import UserDetail from './UserDetail';
import MatchingStats from './MatchingStats';
import ChatHistory from './ChatHistory';
import './AdminPage.css';

const AdminPage = () => {
  return (
    <div className="admin-page">
      <nav className="admin-nav">
        <Link to="/admin">대시보드</Link>
        <Link to="/admin/users">사용자 관리</Link>
        <Link to="/admin/matching">매칭 통계</Link>
        <Link to="/admin/chats">채팅 기록</Link>
      </nav>
      
      <div className="admin-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserList />} />
          <Route path="/users/:userId" element={<UserDetail />} />
          <Route path="/matching" element={<MatchingStats />} />
          <Route path="/chats" element={<ChatHistory />} />
        </Routes>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <div className="dashboard">
      <h2>관리자 대시보드</h2>
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>실시간 접속자</h3>
          <p>0명</p>
        </div>
        <div className="stat-card">
          <h3>매칭 대기 중</h3>
          <p>0명</p>
        </div>
        <div className="stat-card">
          <h3>활성 채팅방</h3>
          <p>0개</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage; 