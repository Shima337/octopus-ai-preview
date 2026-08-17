export function getVideoModel(video, availableSources = {}) {
  const supplied = availableSources[video.id];
  const source = supplied?.source ?? video.source;
  const captions = supplied?.captions ?? video.captions;
  if (!source) return { mode: 'placeholder', video };
  return { mode: 'player', video, source, captions };
}
