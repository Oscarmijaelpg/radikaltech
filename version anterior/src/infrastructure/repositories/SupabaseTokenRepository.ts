import { SupabaseClient } from '@supabase/supabase-js';
import { ITokenRepository } from '../../core/domain/repositories/ITokenRepository';
import { 
  Plan, 
  UserWallet, 
  UserSubscription, 
  TokenTransaction,
  SpendTokenResponse,
  CreditTokenResponse,
  CanUseServiceResponse,
  Service
} from '../../core/domain/entities/Token';

export class SupabaseTokenRepository implements ITokenRepository {
  constructor(private supabase: SupabaseClient) {}

  async getPlans(): Promise<Plan[]> {
    const { data, error } = await this.supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getServices(): Promise<Service[]> {
    const { data, error } = await this.supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateService(serviceId: string, updates: Partial<Service>): Promise<Service> {
    const { data, error } = await this.supabase
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWallet(userId: string): Promise<UserWallet | null> {
    const { data, error } = await this.supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
    return data || null;
  }

  async getActiveSubscriptions(userId: string): Promise<UserSubscription[]> {
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getTransactionHistory(userId: string): Promise<TokenTransaction[]> {
    const { data, error } = await this.supabase
      .from('token_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  async canUseService(userId: string, serviceSlug: string): Promise<CanUseServiceResponse> {
    const { data, error } = await this.supabase.rpc('can_use_service', {
      p_user_id: userId,
      p_service_slug: serviceSlug
    });

    if (error) throw error;
    return data;
  }

  async spendTokens(userId: string, serviceSlug: string, chatId?: string, messageId?: string, metadata?: any): Promise<SpendTokenResponse> {
    const { data, error } = await this.supabase.rpc('spend_tokens', {
        p_user_id: userId,
        p_service_slug: serviceSlug,
        p_chat_id: chatId,
        p_message_id: messageId,
        p_metadata: metadata || {}
    });

    if (error) throw error;
    return data;
  }

  async spendTokensExact(userId: string, amount: number, description: string, metadata?: any): Promise<SpendTokenResponse> {
    const { data, error } = await this.supabase.rpc('spend_tokens_exact', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
        p_metadata: metadata || {}
    });

    if (error) throw error;
    return data;
  }

  async creditTokens(userId: string, amount: number, source: string, planId?: string, subscriptionId?: string, description?: string, paymentId?: string, metadata?: any): Promise<CreditTokenResponse> {
     const { data, error } = await this.supabase.rpc('credit_tokens', {
        p_user_id: userId,
        p_amount: amount,
        p_source: source,
        p_plan_id: planId,
        p_subscription_id: subscriptionId,
        p_description: description,
        p_payment_id: paymentId,
        p_metadata: metadata || {}
     });

     if (error) throw error;
     return data;
  }

  async simulatePaymentAndCredit(userId: string, plan: Plan): Promise<CreditTokenResponse> {
    const totalTokens = Number(plan.tokens_granted || 0) + Number(plan.bonus_tokens || 0);
    const description = `Compra simulada de ${plan.name}`;

    if (plan.plan_type === 'monthly' || plan.plan_type === 'annual') {
       // Usamos el nuevo RPC para evitar errores de RLS y asegurar atomicidad
       const { data, error } = await this.supabase.rpc('simulate_purchase', {
         p_user_id: userId,
         p_plan_id: plan.id,
         p_amount: totalTokens,
         p_description: description
       });

       if (error) {
           console.error('Error in simulate_purchase RPC:', error);
           throw error;
       }

       return {
           success: true,
           tokens_added: totalTokens
       };
    } else {
       // Para recargas únicas, solo acreditamos los tokens
       return this.creditTokens(
           userId, 
           totalTokens, 
           'plan_purchase', 
           plan.id, 
           undefined, 
           description
       );
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await this.supabase.rpc('cancel_subscription', {
      p_sub_id: subscriptionId,
      p_user_id: user.id
    });

    if (error) {
        console.error('Error in cancel_subscription RPC:', error);
        throw error;
    }
  }
}
