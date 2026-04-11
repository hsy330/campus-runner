import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { OrdersPage } from './pages/OrdersPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { PublishPage } from './pages/PublishPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ReviewPage } from './pages/ReviewPage.jsx';
import { TaskDetailPage } from './pages/TaskDetailPage.jsx';

function ProtectedRoute() {
  const { ready, token } = useAuth();
  if (!ready) {
    return <div className="page-loading">正在恢复登录状态...</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <AppLayout><Outlet /></AppLayout>;
}

function PublicRoute({ children }) {
  const { ready, token } = useAuth();
  if (!ready) {
    return <div className="page-loading">正在恢复登录状态...</div>;
  }
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/tasks/:taskId/review" element={<ReviewPage />} />
          <Route path="/publish" element={<PublishPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
