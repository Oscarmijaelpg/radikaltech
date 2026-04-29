import { AuthRepository } from '../../domain/repositories/AuthRepository';

export class ResetPasswordUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(email: string): Promise<void> {
    if (!email) throw new Error('El correo electrónico es requerido');
    return await this.authRepository.resetPassword(email);
  }
}
