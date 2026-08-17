export function canSpeak(browserWindow = globalThis.window) {
  return Boolean(browserWindow?.speechSynthesis && browserWindow?.SpeechSynthesisUtterance);
}

export function stopSpeaking(browserWindow = globalThis.window) {
  if (!canSpeak(browserWindow)) return false;
  browserWindow.speechSynthesis.cancel();
  return true;
}

export function speak(text, browserWindow = globalThis.window) {
  if (!canSpeak(browserWindow)) return false;
  browserWindow.speechSynthesis.cancel();
  const utterance = new browserWindow.SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  utterance.rate = 0.92;
  browserWindow.speechSynthesis.speak(utterance);
  return true;
}
