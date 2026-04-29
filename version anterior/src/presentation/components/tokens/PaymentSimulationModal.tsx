import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plan } from '../../../core/domain/entities/Token';
import { useSimulatePayment, useCreateMPPreference } from '../../hooks/useTokens';
import { Button } from '../ui/Button';

interface PaymentSimulationModalProps {
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
  onCancel?: () => void;
}

export const PaymentSimulationModal: React.FC<PaymentSimulationModalProps> = ({ plan, onClose, onSuccess, onCancel }) => {
  const { mutateAsync: simulatePayment, isPending } = useSimulatePayment();
  const { mutateAsync: createPreference, isPending: isRedirecting } = useCreateMPPreference();
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholder, setCardholder] = useState('');

  // Handle formatters
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    // Format groups of 4 digits
    value = value.replace(/(.{4})/g, '$1 ').trim();
    if(value.length <= 19) setCardNumber(value);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`; // Format MM/YY
    }
    setExpiry(value);
  };


  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (cardNumber.replace(/\s/g, '') !== '4242424242424242') {
         setError('Por favor, usa la tarjeta de prueba de Mercado Pago: 4242 4242 4242 4242');
         return;
      }
      if (!expiry || !cvc || !cardholder) {
         setError('Por favor, completa todos los campos.');
         return;
      }

      setError(null);
      await simulatePayment(plan);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago simulado.');
    }
  };

  const handleRealCheckout = async () => {
    try {
      setError(null);
      const data = await createPreference(plan);
      if (data && data.sandbox_init_point) {
         window.location.href = data.sandbox_init_point;
      } else {
         setError('No se pudo generar el enlace de pago.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con Mercado Pago.');
    }
  };

  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: plan.currency,
  }).format(plan.price);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header styling like Mercado Pago */}
        <div className="bg-[#009EE3] text-white p-6 pb-8 text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
               <span className="material-symbols-outlined text-4xl">inventory_2</span>
            </div>
            <h2 className="text-xl font-medium tracking-tight">Comprar {plan.name}</h2>
            <div className="text-3xl font-bold mt-1 tracking-tighter">{formattedPrice}</div>
        </div>
        
        <div className="p-6 bg-white -mt-4 rounded-t-2xl">
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center mb-6">
              <span className="text-slate-600 font-medium text-sm">Crédito Total (TR)</span>
              <span className="font-bold text-slate-900 text-lg">
                  {Number(plan.tokens_granted || 0) + Number(plan.bonus_tokens || 0)}
              </span>
          </div>

        <form onSubmit={handlePay} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                   <span className="material-symbols-outlined text-sm">credit_card</span>
                   Número de Tarjeta
                </label>
                <input 
                    type="text" 
                    placeholder="4242 4242 4242 4242" 
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-lg font-medium tracking-wide focus:bg-white focus:ring-2 focus:ring-[#009EE3]/20 focus:border-[#009EE3] transition-all"
                    maxLength={19}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                       <span className="material-symbols-outlined text-sm">event</span>
                       Vencimiento
                    </label>
                    <input 
                        type="text" 
                        placeholder="MM/YY" 
                        value={expiry}
                        onChange={handleExpiryChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-lg font-medium tracking-wide focus:bg-white focus:ring-2 focus:ring-[#009EE3]/20 focus:border-[#009EE3] transition-all text-center"
                        maxLength={5}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                       <span className="material-symbols-outlined text-sm">lock</span>
                       CVV
                    </label>
                    <input 
                        type="text" 
                        placeholder="***" 
                        value={cvc}
                        onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-lg font-medium tracking-widest focus:bg-white focus:ring-2 focus:ring-[#009EE3]/20 focus:border-[#009EE3] transition-all text-center"
                        maxLength={4}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                   <span className="material-symbols-outlined text-sm">person</span>
                   Nombre del Titular
                </label>
                <input 
                    type="text" 
                    placeholder="Juan Pérez" 
                    value={cardholder}
                    onChange={e => setCardholder(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium uppercase focus:bg-white focus:ring-2 focus:ring-[#009EE3]/20 focus:border-[#009EE3] transition-all"
                />
            </div>

            {error && (
                <div className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                    <p className="flex-1">{error}</p>
                </div>
            )}

            <div className="pt-2">
                <Button 
                    type="submit" 
                    isLoading={isPending}
                    className="w-full py-4 mb-3 rounded-xl text-lg font-bold bg-[#009EE3] hover:bg-[#0081BA] border-none !text-white transition-colors"
                    disabled={isRedirecting}
                >
                    Pagar {formattedPrice}
                </Button>
                
                <div className="relative flex items-center py-2 mb-3">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">O usa Checkout Pro</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <Button 
                    type="button" 
                    isLoading={isRedirecting}
                    onClick={handleRealCheckout}
                    className="w-full py-4 rounded-xl text-lg font-bold bg-[#009EE3] hover:bg-[#0081BA] border-none !text-white transition-colors flex items-center justify-center gap-2"
                    disabled={isPending}
                >
                    <span className="material-symbols-outlined">shopping_cart_checkout</span>
                    Ir a Mercado Pago
                </Button>

                <button 
                  type="button" 
                  onClick={onClose} 
                  disabled={isPending || isRedirecting}
                  className="w-full py-3 mt-4 text-slate-500 font-medium hover:text-slate-800 transition-colors rounded-xl"
                >
                    Cancelar Compra
                </button>
            </div>
        </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
