import { AdminDashboardStats, AdminRepository } from '../../core/domain/repositories/AdminRepository';
import { User } from '../../core/domain/entities';
import { supabase } from '../supabase/client';

export class SupabaseAdminRepository implements AdminRepository {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      // 1. Get total users
      const { count: totalUsersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      if (usersError) throw usersError;

      // 2. Get onboarded users
      const { count: onboardedUsersCount, error: onboardedError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('onboarding_completed', true);
        
      if (onboardedError) throw onboardedError;

      // 3. Get MRR from active subscriptions and plans
      // We will fetch active subscriptions and their related plans to sum up the prices
      const { data: subscriptionsData, error: subsError } = await supabase
        .from('user_subscriptions')
        .select(`
          plan_id,
          plans ( price )
        `)
        .eq('status', 'active');
        
      if (subsError) throw subsError;

      let mrr = 0;
      let activeClients = 0;

      if (subscriptionsData) {
        // Technically, one user could have multiple active subscriptions, 
        // but for this metric, we'll sum the MRR and count active entries.
        subscriptionsData.forEach((sub: any) => {
          if (sub.plans && sub.plans.price) {
            mrr += Number(sub.plans.price);
          }
        });
        
        // Let's count active clients by unique users with active subscriptions
        const { count: activeClientsCount, error: activeClientsError } = await supabase
          .from('user_subscriptions')
          .select('user_id', { count: 'exact', head: true })
          .eq('status', 'active');
          
        if (activeClientsError) throw activeClientsError;
        
        activeClients = activeClientsCount || 0;
      }

      return {
        totalUsers: totalUsersCount || 0,
        onboardedUsers: onboardedUsersCount || 0,
        activeClients: activeClients,
        mrr: mrr,
        arr: mrr * 12
      };

    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      // Return Fallback 0s in case of error to not break the UI
      return {
        totalUsers: 0,
        onboardedUsers: 0,
        activeClients: 0,
        mrr: 0,
        arr: 0
      };
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as User[];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async updateUserRole(userId: string, role: string, permissions?: string[]): Promise<void> {
    const data: any = { rol: role };
    
    if (role === 'user') {
      data.admin_permissions = null;
    } else if (permissions) {
      data.admin_permissions = permissions;
    }

    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId);

    if (error) throw error;
  }

  async updateAdminPermissions(userId: string, permissions: string[]): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ admin_permissions: permissions })
      .eq('id', userId);

    if (error) throw error;
  }
}
