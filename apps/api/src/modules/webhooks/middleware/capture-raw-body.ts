import { Readable } from "node:stream";
import type { FastifyReply, FastifyRequest, RequestPayload, preParsingHookHandler } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

type PreParsingPayload = RequestPayload;

export const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

export const captureRawBody: preParsingHookHandler = (
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
