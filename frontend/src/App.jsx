import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage/MainPage';
import AdminPage from './components/Admin/AdminPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/*" element={<MainPage />} />
      </Routes>
    </Router>
  );
}

export default App; 