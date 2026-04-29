import { AuthRepository } from '../../domain/repositories/AuthRepository';

export class UpdatePasswordUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(newPassword: string): Promise<void> {
    if (newPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
    return await this.authRepository.updatePassword(newPassword);
  }
}
