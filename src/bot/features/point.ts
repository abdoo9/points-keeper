import { chatAction } from "@grammyjs/auto-chat-action";
import { Composer } from "grammy";
import type { Context } from "#root/bot/context.js";
import { logHandle } from "#root/bot/helpers/logging.js";
import { isReplayToMessage } from "../filters/is-replay-to-messsage.js";
import { escapeHTML } from "../helpers/escape-html.js";
import { getStandings } from "../helpers/get-standings.js";

const composer = new Composer<Context>();

const feature = composer.chatType("supergroup");

feature.hears(
  /^[+-]\d+$/,
  logHandle("add or remove points"),
  chatAction("typing"),
  async (ctx, next) => {
    if (!isReplayToMessage(ctx)) return next();
    const { text } = ctx.message;
    const userId = ctx.message.reply_to_message?.from?.id;
    const firstName = ctx.message.reply_to_message?.from?.first_name;
    const points = Number(text);

    if (!userId || !firstName) return next();
    const admins = await ctx.getChatAdministrators();
    const isAdmin = admins.some((admin) => admin.user.id === ctx.from?.id);
    if (!isAdmin) {
      await ctx.reply("فقط المشرفين يمكنهم اضافة او ازالة النقاط");
      return;
    }

    // Initialize ctx.session.usersPoints if it doesn't exist
    ctx.session.usersPoints = ctx.session.usersPoints || {};

    ctx.session.usersPoints[userId] = ctx.session.usersPoints?.[userId]
      ? {
          firstName,
          points: ctx.session.usersPoints[userId].points + points,
        }
      : { firstName, points };

    const usersPointsArray = Object.entries(ctx.session.usersPoints).map(
      ([id, user]) => ({ id, ...user }),
    );
    usersPointsArray.sort((a, b) => b.points - a.points);

    let message = "";
    const totalPoints = usersPointsArray.reduce(
      (sum, user) => sum + user.points,
      0,
    );
    // eslint-disable-next-line no-restricted-syntax
    for (const [index, user] of usersPointsArray.entries()) {
      const cup = getStandings(index);
      message += `‏${cup} <a href="tg://user?id=${user.id}">${escapeHTML(user.firstName)}</a> لديه ${user.points} ${user.points === 1 ? "نقطة" : "نقاط"}.\n`;
    }

    message += `\nالمجموع الكلي للنقاط هو ${totalPoints} ${totalPoints === 1 ? "نقطة" : "نقاط"}.\n`;
    message += `تم اضافة ${points} ${points === 1 ? "نقطة" : "نقاط"} لـ ${firstName}.\n`;

    await ctx.reply(message, {
      parse_mode: "HTML",
    });
  },
);

feature.hears("ترسيت النقاط", logHandle("reset points"), async (ctx) => {
  const admins = await ctx.getChatAdministrators();
  const isAdmin = admins.some((admin) => admin.user.id === ctx.from?.id);
  if (!isAdmin) {
    await ctx.reply("فقط المشرفين يمكنهم اضافة او ازالة النقاط");
    return;
  }
  ctx.session.usersPoints = {};
  await ctx.reply("تم ترسيت النقاط.");
});
export { composer as pointFeature };
