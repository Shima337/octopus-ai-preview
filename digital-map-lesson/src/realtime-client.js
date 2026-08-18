function waitForIce(peer) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const handle = () => {
      if (peer.iceGatheringState !== 'complete') return;
      peer.removeEventListener?.('icegatheringstatechange', handle);
      resolve();
    };
    peer.addEventListener?.('icegatheringstatechange', handle);
  });
}

function transcriptTurn(event) {
  const text = typeof event.transcript === 'string' ? event.transcript.trim() : '';
  if (!text) return null;
  if (event.type === 'conversation.item.input_audio_transcription.completed') return { role: 'user', text };
  if (['response.output_audio_transcript.done', 'response.audio_transcript.done'].includes(event.type)) return { role: 'assistant', text };
  return null;
}

export function createRealtimeClient({
  RTCPeerConnectionImpl = globalThis.RTCPeerConnection,
  getUserMedia = (constraints) => globalThis.navigator.mediaDevices.getUserMedia(constraints),
  AudioImpl = globalThis.Audio,
} = {}) {
  let peer = null;
  let stream = null;
  let channel = null;
  let audio = null;
  let closed = false;

  return {
    async connect({ createSession, onStatus = () => {}, onTurn = () => {}, onError = () => {} }) {
      closed = false;
      onStatus('connecting');
      try {
        stream = await getUserMedia({ audio: true });
        peer = new RTCPeerConnectionImpl();
        audio = new AudioImpl();
        audio.autoplay = true;
        peer.ontrack = (event) => { audio.srcObject = event.streams?.[0] ?? null; };
        for (const track of stream.getTracks()) peer.addTrack(track, stream);
        channel = peer.createDataChannel('oai-events');
        channel.onopen = () => {
          if (closed) return;
          onStatus('listening');
          channel.send(JSON.stringify({
            type: 'response.create',
            response: { instructions: 'Коротко поприветствуй ребёнка, напомни говорить только о вымышленной истории и задай первый вопрос.' },
          }));
        };
        channel.onmessage = (message) => {
          if (closed) return;
          let event;
          try { event = JSON.parse(message.data); } catch { return; }
          const turn = transcriptTurn(event);
          if (turn) onTurn(turn);
          if (['response.audio.delta', 'response.output_audio.delta', 'response.created'].includes(event.type)) onStatus('mentor-speaking');
          if (event.type === 'response.done') onStatus('listening');
          if (event.type === 'error') onError('SESSION_FAILED');
        };
        channel.onerror = () => onError('SESSION_FAILED');
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await waitForIce(peer);
        const answerSdp = await createSession(peer.localDescription?.sdp ?? offer.sdp);
        await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (error) {
        this.close();
        onError(error?.name === 'NotAllowedError' ? 'MIC_DENIED' : 'SESSION_FAILED');
        throw error;
      }
    },
    setMuted(muted) {
      for (const track of stream?.getTracks() ?? []) track.enabled = !muted;
    },
    close() {
      if (closed) return;
      closed = true;
      for (const track of stream?.getTracks() ?? []) track.stop();
      channel?.close?.();
      peer?.close?.();
      audio?.pause?.();
      if (audio) audio.srcObject = null;
    },
  };
}
