import { AdminDashboardStats, AdminRepository } from '../../../domain/repositories/AdminRepository';

export class GetDashboardStatsUseCase {
  constructor(private adminRepository: AdminRepository) {}

  async execute(): Promise<AdminDashboardStats> {
    return await this.adminRepository.getDashboardStats();
  }
}
