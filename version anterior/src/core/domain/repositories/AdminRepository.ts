import { User } from '../entities';

export interface AdminDashboardStats {
  totalUsers: number;
  onboardedUsers: number;
  activeClients: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
}

export interface AdminRepository {
  getDashboardStats(): Promise<AdminDashboardStats>;
  getUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string, permissions?: string[]): Promise<void>;
  updateAdminPermissions(userId: string, permissions: string[]): Promise<void>;
}
