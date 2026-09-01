import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryEmailRepository } from "../infra/in-memory-email-repository.js";
import { SendEmailUseCase } from "./send-email.use-case.js";

const mockAdd = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("../../../queues/email.queue.js", async () => {
  return {
    emailQueue: { add: mockAdd },
  };
});

describe("SendEmailUseCase", () => {
  let repository: InMemoryEmailRepository;
  let useCase: SendEmailUseCase;

  beforeEach(() => {
    repository = new InMemoryEmailRepository();
    useCase = new SendEmailUseCase(repository);
    mockAdd.mockClear();
  });

  it("should create and queue an email", async () => {
    const result = await useCase.execute({
      to: "user@example.com",
      subject: "Welcome!",
      template: "welcome",
      data: { name: "John" },
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe("sent");
    expect(result.to).toBe("user@example.com");
    expect(mockAdd).toHaveBeenCalledWith(
      "send-email",
      expect.objectContaining({
        to: "user@example.com",
        subject: "Welcome!",
      }),
    );
  });

  it("should call queue with correct data", async () => {
    await useCase.execute({
      to: "test@example.com",
      subject: "Test",
      template: "test",
      data: { key: "value" },
    });

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith("send-email", {
      to: "test@example.com",
      subject: "Test",
      html: expect.stringContaining("test"),
    });
  });
});

describe("SendEmailUseCase", () => {
  let repository: InMemoryEmailRepository;
  let useCase: SendEmailUseCase;

  beforeEach(() => {
    repository = new InMemoryEmailRepository();
    useCase = new SendEmailUseCase(repository);
    mockAdd.mockClear();
  });

  it("should create and queue an email", async () => {
    const result = await useCase.execute({
      to: "user@example.com",
      subject: "Welcome!",
      template: "welcome",
      data: { name: "John" },
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe("sent");
    expect(result.to).toBe("user@example.com");
    expect(mockAdd).toHaveBeenCalledWith(
      "send-email",
      expect.objectContaining({
        to: "user@example.com",
        subject: "Welcome!",
      }),
    );
  });

  it("should call queue with correct data", async () => {
    await useCase.execute({
      to: "test@example.com",
      subject: "Test",
      template: "test",
      data: { key: "value" },
    });

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith("send-email", {
      to: "test@example.com",
      subject: "Test",
      html: expect.stringContaining("test"),
    });
  });
});
