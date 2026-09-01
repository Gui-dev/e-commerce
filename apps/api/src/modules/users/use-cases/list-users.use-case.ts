import type { UserRepository } from "../domain/user-repository.js";

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute() {
    return this.userRepository.list();
  }
}
