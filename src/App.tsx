import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { DashboardLayout } from './components/DashboardLayout';
import { Campaigns } from './components/Campaigns';
import { CampaignView } from './components/CampaignView';
import { AddApplicant } from './components/AddApplicant';
import { AuditLogsView } from './components/AuditLogsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { toast } from './utils/toast';

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Campaigns />} />
          <Route path="campaign/:id" element={<CampaignView />} />
          <Route path="campaign/:id/add" element={<AddApplicant />} />
          <Route path="logs" element={<AuditLogsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  useEffect(() => {
    // Override window.alert to use toast notifications
    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      const msgStr = String(message || '');
      if (msgStr.toLowerCase().includes('ошибка') || msgStr.toLowerCase().includes('невозможно')) {
        toast.error(msgStr);
      } else {
        toast.warning(msgStr);
      }
    };

    // Global listener for unhandled errors
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global Error caught:', event.error || event.message);
      toast.error(`Ошибка: ${event.message || 'Произошёл сбой операции'}`);
    };

    // Global listener for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Rejection caught:', event.reason);
      const message = typeof event.reason === 'string' 
        ? event.reason 
        : (event.reason?.message || 'Ошибка выполнения фонового запроса');
      toast.error(`Ошибка сети/сервера: ${message}`);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster 
          position="top-right" 
          toastOptions={{
            duration: 4000,
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}


