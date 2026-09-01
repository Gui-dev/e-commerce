import type { UserRepository } from "../domain/user-repository.js";

export class UpdateUserRoleUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string, role: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new Error("User not found");
    return this.userRepository.updateRole(id, role);
  }
}
