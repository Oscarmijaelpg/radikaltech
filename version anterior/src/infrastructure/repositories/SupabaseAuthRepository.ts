import { User, UserChannel } from '../../core/domain/entities';
import { AuthRepository } from '../../core/domain/repositories/AuthRepository';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private supabase: SupabaseClient) {
  }

  async login(email: string, password: string): Promise<User> {
    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    if (!authData.user) throw new Error('User not found');

    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!userData && !userError) throw new Error('User profile not found');
    if (userError) throw userError;

    return userData as User;
  }

  async loginWithGoogle(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  }

  async register(email: string, password: string, fullName: string, phone: string): Promise<User> {
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: fullName, 
          phone: phone,
          role: 'user'
        } 
      },
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    return {
      id: authData.user.id,
      email: email,
      full_name: fullName,
      phone: phone,
      role: 'user' as const,
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as User;
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) throw error;
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) return null;

      const { data: userData, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) return null;
      return userData as User;
    } catch (e) {
      console.error('getCurrentUser unexpected error:', e);
      return null;
    }
  }

  async updateUserOnboarding(userId: string, data: Partial<User>): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .upsert({ ...data, id: userId });

    if (error) throw error;
  }

  async saveUserChannels(userId: string, channels: string[]): Promise<void> {
    if (!channels || channels.length === 0) return;

    const channelsData = channels.map(channel => ({
      user_id: userId,
      channel_name: channel
    }));

    await this.supabase.from('user_channels').delete().eq('user_id', userId);

    const { error } = await this.supabase
      .from('user_channels')
      .insert(channelsData);

    if (error) throw error;
  }
}
