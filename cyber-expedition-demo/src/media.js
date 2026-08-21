export function getMediaModel(video) {
  const base = {
    source: video?.source ?? null,
    poster: video?.poster ?? null,
    captions: video?.captions ?? null,
    audio: video?.audio ?? null,
  };
  if (base.source) return { mode: 'video', ...base };
  if (base.audio) return { mode: 'audio', ...base };
  return { mode: 'placeholder', ...base };
}
