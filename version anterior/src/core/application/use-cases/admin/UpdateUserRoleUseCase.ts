import { AdminRepository } from '../../../domain/repositories/AdminRepository';

export class UpdateUserRoleUseCase {
  constructor(private adminRepository: AdminRepository) {}

  async execute(userId: string, role: string, permissions?: string[]): Promise<void> {
    if (!userId) throw new Error('User ID is required');
    if (!role) throw new Error('Role is required');
    return await this.adminRepository.updateUserRole(userId, role, permissions);
  }
}
