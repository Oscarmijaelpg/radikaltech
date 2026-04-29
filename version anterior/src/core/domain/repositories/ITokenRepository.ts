import { 
  Plan, 
  UserWallet, 
  UserSubscription, 
  TokenTransaction,
  SpendTokenResponse,
  CreditTokenResponse,
  CanUseServiceResponse
} from '../entities/Token';

export interface ITokenRepository {
  getPlans(): Promise<Plan[]>;
  getWallet(userId: string): Promise<UserWallet | null>;
  getActiveSubscriptions(userId: string): Promise<UserSubscription[]>;
  getTransactionHistory(userId: string): Promise<TokenTransaction[]>;
  canUseService(userId: string, serviceSlug: string): Promise<CanUseServiceResponse>;
  spendTokens(userId: string, serviceSlug: string, chatId?: string, messageId?: string, metadata?: any): Promise<SpendTokenResponse>;
  spendTokensExact(userId: string, amount: number, description: string, metadata?: any): Promise<SpendTokenResponse>;
  creditTokens(userId: string, amount: number, source: string, planId?: string, subscriptionId?: string, description?: string, paymentId?: string, metadata?: any): Promise<CreditTokenResponse>;
  simulatePaymentAndCredit(userId: string, plan: Plan): Promise<CreditTokenResponse>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}
