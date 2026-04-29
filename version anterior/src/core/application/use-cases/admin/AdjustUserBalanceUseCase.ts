import { ITokenRepository } from '../../../domain/repositories/ITokenRepository';

export class AdjustUserBalanceUseCase {
  constructor(private tokenRepository: ITokenRepository) {}

  async execute(userId: string, amount: number, type: 'add' | 'subtract'): Promise<void> {
    if (type === 'add') {
      await this.tokenRepository.creditTokens(
        userId,
        amount,
        'manual_adjustment',
        undefined,
        undefined,
        'Ajuste manual por administrador'
      );
    } else {
      await this.tokenRepository.spendTokensExact(
        userId,
        amount,
        'Ajuste manual por administrador (Reducción)'
      );
    }
  }
}
