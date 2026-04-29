import { AdminRepository } from '../../../domain/repositories/AdminRepository';
import { User } from '../../../domain/entities';

export class GetUsersUseCase {
  constructor(private adminRepository: AdminRepository) {}

  async execute(): Promise<User[]> {
    return await this.adminRepository.getUsers();
  }
}
