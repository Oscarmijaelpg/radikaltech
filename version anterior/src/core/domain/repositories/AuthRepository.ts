
import { User } from '../entities';

export interface AuthRepository {
  login(email: string, password: string): Promise<User>;
  loginWithGoogle(): Promise<void>;
  register(email: string, password: string, fullName: string, phone: string): Promise<User>;
  resetPassword(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  updateUserOnboarding(userId: string, data: Partial<User>): Promise<void>;
  saveUserChannels(userId: string, channels: string[]): Promise<void>;
}
