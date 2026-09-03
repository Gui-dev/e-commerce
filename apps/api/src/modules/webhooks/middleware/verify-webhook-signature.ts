import { createHmac, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import type { FastifyReply, FastifyRequest, RequestPayload, preHandlerHookHandler } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

type PreParsingPayload = RequestPayload;

export const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

export const captureRawBody = (
  request: FastifyRequest,
  _reply: FastifyReply,
  payload: PreParsingPayload,
  done: (err?: Error | null, body?: PreParsingPayload) => void,
) => {
  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  if (Buffer.isBuffer(payload)) {
    request.rawBody = payload;
    done(null, payload);
    return;
  }
  if (typeof payload === "string") {
    request.rawBody = Buffer.from(payload);
    done(null, payload);
    return;
  }
  payload.on("data", (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk));
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_WEBHOOK_BODY_BYTES) {
      payload.destroy(new Error("Webhook body exceeds maximum allowed size"));
    }
  });
  payload.on("end", () => {
    request.rawBody = Buffer.concat(chunks);
    done(null, Readable.from(Buffer.concat(chunks)));
  });
  payload.on("error", (err: Error) => done(err));
};

export const verifyWebhookSignature: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const secret = process.env.WEBHOOK_SECRET;
  const signature = request.headers["x-webhook-signature"];

  if (!secret || typeof signature !== "string" || signature.length === 0 || !request.rawBody) {
    return reply
      .code(401)
      .send({ error: "INVALID_SIGNATURE", message: "Invalid webhook signature" });
  }

  if (!/^[0-9a-fA-F]+$/.test(signature)) {
    return reply
      .code(401)
      .send({ error: "INVALID_SIGNATURE", message: "Invalid webhook signature" });
  }

  const expected = createHmac("sha256", secret).update(request.rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(signature, "hex");

  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return reply
      .code(401)
      .send({ error: "INVALID_SIGNATURE", message: "Invalid webhook signature" });
  }
};
