const botUrl = process.env.VITE_TELEGRAM_BOT_URL?.trim() ?? '';
const telegramUrlPattern = /^(?:https:\/\/t\.me\/|tg:\/\/resolve\?domain=)([A-Za-z0-9_]+)$/;
const forbiddenNamePatterns = [/replace_with_real_bot/i, /example/i, /localhost/i];
const botName = botUrl.match(telegramUrlPattern)?.[1];

if (!botName || forbiddenNamePatterns.some((pattern) => pattern.test(botName))) {
  console.error('A real VITE_TELEGRAM_BOT_URL is required for production.');
  process.exitCode = 1;
}
