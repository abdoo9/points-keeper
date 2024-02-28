import { Context } from "../context.js";

export function isReplayToMessage(ctx: Context) {
  return Boolean(ctx.message?.reply_to_message);
}
