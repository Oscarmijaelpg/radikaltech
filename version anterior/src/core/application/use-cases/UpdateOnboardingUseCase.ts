
import { AuthRepository } from '../../domain/repositories/AuthRepository';
import { User } from '../../domain/entities';

export class UpdateOnboardingUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(userId: string, data: Partial<User>, channels?: string[]): Promise<void> {
    await this.authRepository.updateUserOnboarding(userId, data);
    
    if (channels && channels.length > 0) {
      await this.authRepository.saveUserChannels(userId, channels);
    }
  }
}
