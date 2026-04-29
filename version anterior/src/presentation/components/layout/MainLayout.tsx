
import React from 'react';
import { Sidebar } from './Sidebar';
import { Chat } from '../../../core/domain/entities';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { NewChatModal } from '../chat/NewChatModal';

interface MainLayoutProps {
  children: React.ReactNode;
  conversations: Chat[];
  showSidebar?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  conversations,
  showSidebar = true
}) => {
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[hsl(var(--color-bg-light))]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {showSidebar && (
        <div className={`
          fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar
            conversations={conversations}
            onOpenNewChat={() => setIsNewChatModalOpen(true)}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm z-40 sticky top-0">
          <div className="flex items-center gap-3" onClick={() => navigate('/')}>
            <img
              src="https://i.ibb.co/NgHmpDKp/Sin-t-tulo-1.png"
              alt="Radikal AI Logo"
              className="h-6 w-auto object-contain"
            />
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>


        <main className={`flex-1 overflow-auto transition-all duration-300 ${showSidebar ? '' : 'w-full'}`}>
          {children}
        </main>
      </div>

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
    </div>
  );
};
