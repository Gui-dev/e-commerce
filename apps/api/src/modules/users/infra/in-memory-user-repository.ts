import type { User, UserRepository } from "../domain/user-repository.js";

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async list(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateRole(id: string, role: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updated: User = { ...user, role, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async create(data: Omit<User, "createdAt" | "updatedAt">): Promise<User> {
    const now = new Date();
    const user: User = { ...data, createdAt: now, updatedAt: now };
    this.users.set(user.id, user);
    return user;
  }
}
