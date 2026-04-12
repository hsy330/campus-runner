import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';

const ChatPage = lazy(() => import('./pages/ChatPage.jsx').then((module) => ({ default: module.ChatPage })));
const ChatRoomList = lazy(() => import('./pages/ChatPage.jsx').then((module) => ({ default: module.ChatRoomList })));
const AdminDashboardPage = lazy(() => import('./pages/AdminPage.jsx').then((module) => ({ default: module.AdminDashboardPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminPage.jsx').then((module) => ({ default: module.AdminLoginPage })));
const AppealPage = lazy(() => import('./pages/AppealPage.jsx').then((module) => ({ default: module.AppealPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx').then((module) => ({ default: module.OrdersPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx').then((module) => ({ default: module.ProfilePage })));
const PublishPage = lazy(() => import('./pages/PublishPage.jsx').then((module) => ({ default: module.PublishPage })));
const ReviewPage = lazy(() => import('./pages/ReviewPage.jsx').then((module) => ({ default: module.ReviewPage })));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage.jsx').then((module) => ({ default: module.TaskDetailPage })));

function PageFallback() {
  return <div className="page-loading">页面加载中...</div>;
}

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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/*" element={<AdminDashboardPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/tasks/:taskId/review" element={<ReviewPage />} />
            <Route path="/tasks/:taskId/appeal" element={<AppealPage />} />
            <Route path="/publish" element={<PublishPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/chat" element={<ChatRoomList />} />
            <Route path="/chat/:roomId" element={<ChatPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
