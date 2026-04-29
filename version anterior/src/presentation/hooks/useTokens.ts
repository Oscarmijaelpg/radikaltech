import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseTokenRepository } from '../../infrastructure/repositories/SupabaseTokenRepository';
import { supabase } from '../../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';
import { Plan, Service } from '../../core/domain/entities/Token';

const tokenRepository = new SupabaseTokenRepository(supabase);

export const useWallet = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => tokenRepository.getWallet(user!.id),
    enabled: !!user?.id,
  });
};

export const usePlans = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => tokenRepository.getPlans(),
  });
};

export const useServices = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => tokenRepository.getServices(),
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, updates }: { serviceId: string, updates: Partial<Service> }) => {
      return tokenRepository.updateService(serviceId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
};

export const useActiveSubscriptions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: () => tokenRepository.getActiveSubscriptions(user!.id),
    enabled: !!user?.id,
  });
};

export const useTransactionHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => tokenRepository.getTransactionHistory(user!.id),
    enabled: !!user?.id,
  });
};

export const useCreateMPPreference = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (plan: Plan) => {
      if (!user) throw new Error('User not logged in');
      const { data, error } = await supabase.functions.invoke('create-mp-preference', {
        body: { 
          title: plan.name, 
          price: plan.price, 
          planId: plan.id,
          userId: user.id,
          redirectUrl: window.location.origin + '/tokens'
        }
      });
      if (error) throw error;
      return data;
    }
  });
};

export const useSimulatePayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (plan: Plan) => {
      if (!user) throw new Error('User not logged in');
      return tokenRepository.simulatePaymentAndCredit(user.id, plan);
    },
    onSuccess: () => {
      // Invalidate related caches when a purchase completes
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] });
    },
  });
};

export const useSpendTokens = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ serviceSlug, chatId, messageId, metadata }: { serviceSlug: string, chatId?: string, messageId?: string, metadata?: any }) => {
        if (!user) throw new Error('User not logged in');
        return tokenRepository.spendTokens(user.id, serviceSlug, chatId, messageId, metadata);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
    }
  });
};

export const useSpendTokensExact = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ amount, description, metadata }: { amount: number, description: string, metadata?: any }) => {
        if (!user) throw new Error('User not logged in');
        return tokenRepository.spendTokensExact(user.id, amount, description, metadata);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
    }
  });
};

export const useCancelSubscription = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: (subscriptionId: string) => tokenRepository.cancelSubscription(subscriptionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] });
        }
    });
};
