import type { UserRepository } from "../domain/user-repository.js";

export class GetUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new Error("User not found");
    return user;
  }
}
