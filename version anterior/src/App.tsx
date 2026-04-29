
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from './presentation/pages/AuthPage';
import { MemoryPage } from './presentation/pages/MemoryPage';
import { ChatPage } from './presentation/pages/ChatPage';
import { OnboardingPage } from './presentation/pages/OnboardingPage';
import { ContentPage } from './presentation/pages/ContentPage';
import { TeamPage } from './presentation/pages/TeamPage';
import { MainLayout } from './presentation/components/layout/MainLayout';
import { ProtectedRoute } from './presentation/components/auth/ProtectedRoute';
import { useAuth } from './presentation/context/AuthContext';
import { Button } from './presentation/components/ui/Button';
import { useUserChats } from './presentation/hooks/useChat';
import { SubscriptionPage } from './presentation/pages/SubscriptionPage';
import { AdminDashboardPage } from './presentation/pages/admin/AdminDashboardPage';
import { UpdatePasswordPage } from './presentation/pages/UpdatePasswordPage';
import { useProjectContext } from './presentation/context/ProjectContext';

function AppRoutes() {
  const { user } = useAuth();
  const { activeProject } = useProjectContext();
  const { data: conversations = [] } = useUserChats(user?.id, activeProject?.id);

  useEffect(() => {

    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);


  return (
    <div className="relative">

      <Routes>
        <Route path="/auth" element={<AuthPage onLogin={() => { }} />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />

        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingPage onComplete={() => { }} />
          </ProtectedRoute>
        } />

        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout conversations={conversations}>
              <MemoryPage />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/content" element={
          <ProtectedRoute>
            <MainLayout conversations={conversations}>
              <ContentPage />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/tokens" element={
          <ProtectedRoute>
            <MainLayout conversations={conversations}>
              <SubscriptionPage />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/team" element={
          <ProtectedRoute>
            <MainLayout conversations={conversations}>
              <TeamPage />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute>
            <MainLayout conversations={conversations}>
              <AdminDashboardPage />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat/:chatId" element={
          <ProtectedRoute>
            <MainLayout conversations={conversations}>
              <ChatPage onOpenNewChat={() => { }} />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
