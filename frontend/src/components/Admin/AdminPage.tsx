import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar
} from '@mui/material';
import { adminApi } from '../../api/adminApi';
import styles from './AdminPage.module.css';

interface User {
  id: string;
  _id?: string;
  email: string;
  nickname: string;
  gender: string;
  createdAt: string;
  isActive: boolean;
  matchingStatus?: 'WAITING' | 'MATCHED' | 'IDLE';
}

const getStatusLabel = (user: User) => {
  switch (user.matchingStatus) {
    case 'WAITING':
      return '매칭 대기중';
    case 'MATCHED':
      return '매칭됨';
    case 'IDLE':
    default:
      return '매칭 중 아님';
  }
};

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchUsers();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers();
      if (Array.isArray(response)) {
        setUsers(response);
      } else {
        setError(response?.message || '사용자 목록을 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '사용자 목록을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  async (userId: string, currentStatus: boolean) => {
    try {
      const response = await adminApi.toggleUserStatus(userId, !currentStatus);
      if (response.success) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, isActive: !currentStatus } : user
        ));
      } else {
        setError(response.message || '사용자 상태 변경에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '사용자 상태를 변경하는 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            관리자 대시보드
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" className={styles.container}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} className={styles.tableContainer}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이메일</TableCell>
                  <TableCell>닉네임</TableCell>
                  <TableCell>성별</TableCell>
                  <TableCell>가입일</TableCell>
                  <TableCell>상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id || user._id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.nickname}</TableCell>
                    <TableCell>{user.gender === 'male' ? '남성' : '여성'}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusLabel(user)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminPage; 