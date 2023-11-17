const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')

const bot = new Telegraf("6968301690:AAG8BHwo0TnIZLHJNLo59RcQG5eC7mK0C-4");

bot.start((ctx) => ctx.reply('Welcome to KriptAl'));

bot.help((ctx) => ctx.reply('Send me a sticker'));

bot.on('message', (ctx) => {
    ctx.reply(ctx.message);
});

bot.launch();

console.log("Bot started");

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));