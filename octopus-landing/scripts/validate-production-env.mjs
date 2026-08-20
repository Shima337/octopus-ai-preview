import { loadEnv } from 'vite';

const isDraftValidation = process.argv.slice(2).includes('--draft');
const fileEnvironment = loadEnv('production', process.cwd(), '');
const botUrl = (
  process.env.VITE_TELEGRAM_BOT_URL
  ?? fileEnvironment.VITE_TELEGRAM_BOT_URL
  ?? ''
).trim();
const telegramUrlPattern = /^(?:https:\/\/t\.me\/|tg:\/\/resolve\?domain=)([A-Za-z0-9_]+)$/;
const placeholderNamePatterns = [/replace_with_real_bot/i, /example/i, /localhost/i];
const nonProductionNamePatterns = [
  /(?:^|_)(?:test(?:ing)?|demo|dev(?:elopment)?|stag(?:e|ing)|qa)(?:_|$)/i,
];
const forbiddenNamePatterns = isDraftValidation
  ? placeholderNamePatterns
  : [...placeholderNamePatterns, ...nonProductionNamePatterns];
const botName = botUrl.match(telegramUrlPattern)?.[1];

if (!botName || forbiddenNamePatterns.some((pattern) => pattern.test(botName))) {
  console.error('A real VITE_TELEGRAM_BOT_URL is required for production.');
  process.exitCode = 1;
}
