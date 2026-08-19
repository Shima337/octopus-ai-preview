const botUrl = process.env.VITE_TELEGRAM_BOT_URL?.trim() ?? '';
const telegramUrlPattern = /^(?:https:\/\/t\.me\/|tg:\/\/resolve\?domain=)([A-Za-z0-9_]+)$/;
const forbiddenNames = new Set(['replace_with_real_bot', 'example', 'localhost']);
const botName = botUrl.match(telegramUrlPattern)?.[1];

if (!botName || forbiddenNames.has(botName.toLowerCase())) {
  console.error('A real VITE_TELEGRAM_BOT_URL is required for production.');
  process.exitCode = 1;
}
