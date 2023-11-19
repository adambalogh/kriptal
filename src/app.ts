import { Bot } from "./bot";

const bot = new Bot();

bot.start();
console.log("Bot started");

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));