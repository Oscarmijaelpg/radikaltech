
import { AuthRepository } from '../../domain/repositories/AuthRepository';
import { User } from '../../domain/entities';

export class RegisterUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(email: string, password: string, fullName: string, phone: string): Promise<User> {
    if (!email) throw new Error('El correo electrónico es requerido');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
    if (!fullName) throw new Error('El nombre completo es requerido');
    if (!phone) throw new Error('El número de celular es requerido');
    
    return await this.authRepository.register(email, password, fullName, phone);
  }
}
