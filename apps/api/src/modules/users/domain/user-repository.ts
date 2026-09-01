import type { User } from "./user.js";

export type { User };

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(): Promise<User[]>;
  updateRole(id: string, role: string): Promise<User>;
}
