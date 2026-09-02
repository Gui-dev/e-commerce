import type { User } from "@/types";
import { http, HttpResponse } from "msw";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const mockUser: User = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
  image: null,
  role: "customer",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

export const authHandlers = [
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === "test@example.com" && body.password === "password123") {
      return HttpResponse.json({ data: { user: mockUser, token: "mock-jwt-token" } });
    }

    return HttpResponse.json(
      { error: "UNAUTHORIZED", message: "Invalid email or password" },
      { status: 401 },
    );
  }),

  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string; password: string };

    if (body.email === "existing@example.com") {
      return HttpResponse.json(
        { error: "CONFLICT", message: "Email already registered" },
        { status: 409 },
      );
    }

    return HttpResponse.json(
      { data: { user: { ...mockUser, ...body, id: "user-new" }, token: "mock-jwt-token-new" } },
      { status: 201 },
    );
  }),
];
