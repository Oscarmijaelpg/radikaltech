import { AuthRepository } from '../../domain/repositories/AuthRepository';

export class LoginWithGoogleUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(): Promise<void> {
    await this.authRepository.loginWithGoogle();
  }
}
