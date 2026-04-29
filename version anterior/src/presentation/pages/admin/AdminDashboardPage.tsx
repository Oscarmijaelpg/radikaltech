
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CommercialTab } from './tabs/CommercialTab';
import { FinanceTab } from './tabs/FinanceTab';
import { MarketingTab } from './tabs/MarketingTab';
import { ProductTab } from './tabs/ProductTab';
import { ExecutiveTab } from './tabs/ExecutiveTab';
import { TokensTab } from './tabs/TokensTab';
import { UsersTab } from './tabs/UsersTab';
import { AdminDetailModal } from './components/AdminDetailModal';

type AdminTab = 'executive' | 'commercial' | 'finance' | 'marketing' | 'product' | 'tokens' | 'users';

export const AdminDashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('executive');
  const [selectedKpi, setSelectedKpi] = useState<any>(null);

  useEffect(() => {
    if (!loading && user?.role !== 'admin' && user?.rol !== 'admin') {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const allTabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'executive', label: 'Ejecutivo', icon: 'monitoring' },
    { id: 'users', label: 'Usuarios', icon: 'group' },
    { id: 'commercial', label: 'Comercial', icon: 'trending_up' },
    { id: 'finance', label: 'Finanzas', icon: 'payments' },
    { id: 'marketing', label: 'Marketing', icon: 'campaign' },
    { id: 'product', label: 'Producto', icon: 'inventory_2' },
    { id: 'tokens', label: 'Tokens y Planes', icon: 'local_activity' }
  ];

  const allowedTabs = allTabs.filter(tab => {
    if (user?.admin_permissions === undefined || user?.admin_permissions === null) return true;
    return user.admin_permissions.includes(tab.id as string);
  });

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.find(t => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [user?.admin_permissions]);

  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (user?.role !== 'admin' && user?.rol !== 'admin') return null;
  if (allowedTabs.length === 0) return <div className="p-10 text-center">No tienes permisos para ver ninguna sección.</div>;

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg-light))] ">
      <div className="max-w-[1400px] mx-auto p-4 md:p-8">
        {/* Admin Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 ">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--color-primary))] flex items-center justify-center shadow-xl shadow-primary/20 rotate-3">
              <span className="material-symbols-outlined text-white text-3xl">settings_account_box</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Radikal Admin
              </h1>
              <p className="text-sm text-slate-500 font-medium">Panel de control de operaciones</p>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 mb-8 sticky top-0 bg-[hsl(var(--color-bg-light))] z-20 pt-2 shadow-sm ">
          <div className="flex gap-8 px-1">
            {allowedTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 px-2 text-sm font-bold transition-all whitespace-nowrap border-b-2 relative ${activeTab === tab.id
                    ? 'border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'executive' && <ExecutiveTab onOpenKpi={setSelectedKpi} />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'commercial' && <CommercialTab onOpenKpi={setSelectedKpi} />}
          {activeTab === 'finance' && <FinanceTab onOpenKpi={setSelectedKpi} />}
          {activeTab === 'marketing' && <MarketingTab onOpenKpi={setSelectedKpi} />}
          {activeTab === 'product' && <ProductTab onOpenKpi={setSelectedKpi} />}
          {activeTab === 'tokens' && <TokensTab />}
        </div>
      </div>

      <AdminDetailModal
        isOpen={!!selectedKpi}
        onClose={() => setSelectedKpi(null)}
        title={selectedKpi?.label || 'Detalle del KPI'}
        data={selectedKpi}
      />
    </div>
  );
};
