
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet, usePlans, useTransactionHistory, useActiveSubscriptions, useCancelSubscription } from '../hooks/useTokens';
import { PaymentSimulationModal } from '../components/tokens/PaymentSimulationModal';
import { Plan } from '../../core/domain/entities/Token';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export const SubscriptionPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: wallet, isLoading: isLoadingWallet } = useWallet();
    const { data: plans, isLoading: isLoadingPlans } = usePlans();
    const { data: transactions, isLoading: isLoadingHistory } = useTransactionHistory();
    const { data: subscriptions, isLoading: isLoadingSubs } = useActiveSubscriptions();
    const { mutate: cancelSub, isPending: isCanceling } = useCancelSubscription();
    const [searchParams, setSearchParams] = useSearchParams();
    const [subscriptionToCancel, setSubscriptionToCancel] = useState<any | null>(null);

    useEffect(() => {
        const status = searchParams.get('status');
        const collectionStatus = searchParams.get('collection_status');

        if (status === 'approved' || collectionStatus === 'approved') {
            // Success! We might want to alert the user or just refresh
            alert('¡Pago completado con éxito! Tu saldo se actualizará en unos instantes.');
            
            // Clear params to prevent re-alerts
            const newParams = new URLSearchParams(searchParams);
            ['status', 'collection_status', 'collection_id', 'preference_id', 'payment_id', 'payment_type', 'merchant_order_id'].forEach(p => newParams.delete(p));
            setSearchParams(newParams);

            // Refresh data
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
                queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] });
                queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
            }, 3000);
        } else if (status === 'failure' || status === 'pending') {
            alert('Hubo un problema con tu pago o está pendiente. Por favor verifica tu cuenta de Mercado Pago.');
            const newParams = new URLSearchParams(searchParams);
            ['status', 'collection_status', 'collection_id', 'preference_id', 'payment_id', 'payment_type', 'merchant_order_id'].forEach(p => newParams.delete(p));
            setSearchParams(newParams);
        }
    }, [searchParams, setSearchParams]);

    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    const handlePlanClick = (plan: Plan) => {
        setSelectedPlan(plan);
    };

    const isLoading = isLoadingWallet || isLoadingPlans || isLoadingHistory || isLoadingSubs;

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-gray-500">Cargando información de tu cuenta...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-10">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header / Balance */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
                            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 ">
                                Mi Billetera
                            </h1>
                            <div className="flex flex-col text-sm text-gray-500 mt-0.5">
                                <span className="font-bold text-gray-700">{user?.full_name}</span>
                                <span>{user?.email}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 md:mt-0 text-center md:text-right">
                        <div className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">
                            Saldo Actual
                        </div>
                        <div className="text-5xl font-black text-gray-900 flex items-center justify-center md:justify-end gap-2">
                            <span>🪙</span>
                            {wallet?.balance?.toLocaleString() || 0}
                        </div>
                    </div>
                </div>

                {/* Suscripciones Activas */}
                {subscriptions && subscriptions.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <span>⭐</span> Suscripciones Activas
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subscriptions.map((sub: any) => {
                                const planInfo = plans?.find(p => p.id === sub.plan_id);
                                return (
                                    <div key={sub.id} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100 ">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-green-800 ">{planInfo?.name || 'Suscripción Activa'}</h3>
                                                <p className="text-sm text-green-600 mt-1">Estado: <span className="uppercase font-semibold">{sub.status}</span></p>
                                            </div>
                                            <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold uppercase">
                                                Activa
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-col sm:flex-row justify-between items-end gap-3 text-xs">
                                            <div className="text-green-700/80 space-y-1 flex-1">
                                                <p>Iniciada: {sub.started_at ? new Date(sub.started_at).toLocaleDateString() : 'N/A'}</p>
                                                <p>Vence: {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <button 
                                                onClick={() => setSubscriptionToCancel(sub)}
                                                disabled={isCanceling}
                                                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                                            >
                                                {isCanceling ? (subscriptionToCancel?.id === sub.id ? 'Cancelando...' : 'Cancelar') : 'Cancelar'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Cancel Confirmation Modal */}
                <Modal
                    isOpen={!!subscriptionToCancel}
                    onClose={() => setSubscriptionToCancel(null)}
                    title="Confirmar Cancelación"
                    maxWidth="md"
                >
                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
                                <span className="material-symbols-outlined text-4xl">cancel</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">¿Estás seguro?</h3>
                            <p className="text-gray-600">
                                Estás a punto de cancelar tu suscripción. <br />
                                <span className="font-bold text-gray-900 mt-2 block">
                                    {plans?.find(p => p.id === subscriptionToCancel?.plan_id)?.name || 'Plan'}
                                </span>
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setSubscriptionToCancel(null)}
                            >
                                No, mantener
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1 bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
                                onClick={() => {
                                    if (subscriptionToCancel) {
                                        cancelSub(subscriptionToCancel.id, {
                                            onSuccess: () => setSubscriptionToCancel(null)
                                        });
                                    }
                                }}
                                disabled={isCanceling}
                            >
                                {isCanceling ? 'Procesando...' : 'Sí, cancelar'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Planes Comerciales */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 ">Recargas y Planes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans?.map((plan) => {
                            if (plan.plan_type === 'welcome') return null; // Hide welcome plan

                            const isFeatured = plan.is_featured;
                            const isPlanActive = plan.plan_type !== 'one_time' && (subscriptions?.some(sub => sub.plan_id === plan.id) || false);

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-2xl bg-white p-6 flex flex-col items-center text-center transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${isFeatured
                                            ? 'shadow-lg border-2 border-primary ring-4 ring-primary/10'
                                            : 'border border-gray-100 shadow-sm'
                                        }`}
                                >
                                    {isFeatured && (
                                        <div className="absolute top-0 -translate-y-1/2 bg-gradient-to-r from-primary to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                            Más Popular
                                        </div>
                                    )}

                                    <h3 className="text-xl font-bold text-gray-900 mt-2">{plan.name}</h3>
                                    {plan.description && (
                                        <p className="text-sm text-gray-500 mt-2 min-h-[40px]">{plan.description}</p>
                                    )}

                                    <div className="my-6">
                                        <div className="text-4xl font-black text-gray-900 ">
                                            {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 uppercase tracking-widest">{plan.currency}</div>
                                    </div>

                                    <div className="w-full space-y-3 mb-8">
                                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                            <span className="text-sm font-medium text-gray-600 ">Tokens Base</span>
                                            <span className="font-bold text-gray-900 ">{plan.tokens_granted.toLocaleString()}</span>
                                        </div>
                                        {plan.bonus_tokens > 0 && (
                                            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-100 ">
                                                <span className="text-sm font-bold text-emerald-600 ">🎁 Bonus</span>
                                                <span className="font-bold text-emerald-600 ">+{plan.bonus_tokens.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto w-full">
                                        <Button
                                            variant={isPlanActive ? 'outline' : (isFeatured ? 'primary' : 'outline')}
                                            className="w-full font-bold"
                                            onClick={() => !isPlanActive && handlePlanClick(plan)}
                                            disabled={isPlanActive}
                                        >
                                            {isPlanActive ? 'Plan Activo ✅' : (plan.plan_type === 'one_time' ? 'Comprar Recarga' : 'Suscribirse')}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Historial de Transacciones */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 ">Historial de Transacciones</h2>
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Descripción</th>
                                        <th className="px-6 py-4 text-center">Tipo</th>
                                        <th className="px-6 py-4 text-right">Monto</th>
                                        <th className="px-6 py-4 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 ">
                                    {transactions?.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                No hay transacciones recientes.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions?.map(tx => (
                                            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-gray-500 ">
                                                    {new Date(tx.created_at || '').toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-normal min-w-[200px]">
                                                    {tx.description || tx.source}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${tx.type === 'credit'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        {tx.type === 'credit' ? 'Ingreso' : 'Egreso'}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'
                                                    }`}>
                                                    {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-500 ">
                                                    {tx.balance_after.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>

            {selectedPlan && (
                <PaymentSimulationModal
                    plan={selectedPlan}
                    onClose={() => setSelectedPlan(null)}
                    onSuccess={() => setSelectedPlan(null)}
                    onCancel={() => setSelectedPlan(null)}
                />
            )}
        </div>
    );
};
