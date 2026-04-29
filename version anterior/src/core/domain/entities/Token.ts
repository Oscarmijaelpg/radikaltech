export type PlanType = 'monthly' | 'annual' | 'one_time' | 'welcome';

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  plan_type: PlanType;
  price: number;
  currency: string;
  tokens_granted: number;
  bonus_tokens: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  trial_days: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at?: string;
  updated_at?: string;
}

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'past_due';

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  next_renewal_at: string | null;
  external_payment_id: string | null;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export type TransactionType = 'credit' | 'debit';
export type TransactionSource = 'plan_purchase' | 'subscription_renewal' | 'welcome_bonus' | 'manual_adjustment' | 'refund' | 'service_usage' | 'promotion';

export interface TokenTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  source: TransactionSource;
  amount: number;
  balance_after: number;
  plan_id?: string;
  subscription_id?: string;
  service_id?: string;
  message_id?: string;
  chat_id?: string;
  description?: string;
  external_payment_id?: string;
  metadata?: any;
  created_at?: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description?: string;
  token_cost: number;
  category?: string;
  is_active: boolean;
  icon?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SpendTokenResponse {
  success: boolean;
  transaction_id?: string;
  tokens_spent?: number;
  balance_after?: number;
  error?: string;
  balance?: number;
  required?: number;
}

export interface CreditTokenResponse {
  success: boolean;
  transaction_id?: string;
  tokens_added?: number;
  balance_after?: number;
  error?: string;
}

export interface CanUseServiceResponse {
  can_use: boolean;
  balance?: number;
  cost?: number;
  reason?: string;
  missing?: number;
}
