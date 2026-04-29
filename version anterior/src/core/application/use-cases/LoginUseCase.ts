
import { AuthRepository } from '../../domain/repositories/AuthRepository';
import { User } from '../../domain/entities';

export class LoginUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(email: string, password: string): Promise<User> {
    // Business logic could go here (e.g. validation)
    if (!email.includes('@')) throw new Error('Invalid email');
    
    return await this.authRepository.login(email, password);
  }
}
