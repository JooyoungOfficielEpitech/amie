import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './UserList.css';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API 호출로 실제 데이터 가져오기
    const fetchUsers = async () => {
      try {
        // 임시 데이터
        const mockUsers = [
          { id: 1, name: '홍길동', email: 'hong@example.com', status: '대기열 밖', lastActive: '2024-03-20 15:30' },
          { id: 2, name: '김철수', email: 'kim@example.com', status: '대기열 안', lastActive: '2024-03-20 15:35' },
          { id: 3, name: '이영희', email: 'lee@example.com', status: '매칭 됨', lastActive: '2024-03-20 15:40' },
        ];
        setUsers(mockUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="user-list">
      <h2>사용자 목록</h2>
      <div className="user-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>이름</th>
              <th>이메일</th>
              <th>상태</th>
              <th>마지막 활동</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`status-badge ${user.status.replace(/\s+/g, '-').toLowerCase()}`}>
                    {user.status}
                  </span>
                </td>
                <td>{user.lastActive}</td>
                <td>
                  <Link to={`/admin/users/${user.id}`} className="detail-link">
                    상세보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList; 