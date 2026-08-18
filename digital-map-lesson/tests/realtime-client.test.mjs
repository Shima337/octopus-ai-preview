import test from 'node:test';
import assert from 'node:assert/strict';

import { createRealtimeClient } from '../src/realtime-client.js';

function fakeEnvironment() {
  const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track] };
  const channel = {
    readyState: 'open', sent: [], closed: false,
    send(value) { this.sent.push(JSON.parse(value)); },
    close() { this.closed = true; },
  };
  class FakePeer {
    constructor() {
      this.iceGatheringState = 'complete';
      this.addedTracks = [];
      this.closed = false;
      this.localDescription = null;
      this.remoteDescription = null;
    }
    addTrack(value, source) { this.addedTracks.push({ value, source }); }
    createDataChannel(label) { channel.label = label; return channel; }
    async createOffer() { return { type: 'offer', sdp: 'offer-sdp' }; }
    async setLocalDescription(value) { this.localDescription = value; }
    async setRemoteDescription(value) { this.remoteDescription = value; }
    close() { this.closed = true; }
  }
  class FakeAudio {
    constructor() { this.autoplay = false; this.srcObject = null; this.paused = false; }
    pause() { this.paused = true; }
  }
  return {
    track, stream, channel, peers: [], audios: [],
    dependencies: {
      RTCPeerConnectionImpl: class extends FakePeer {
        constructor() { super(); env.peers.push(this); }
      },
      getUserMedia: async () => stream,
      AudioImpl: class extends FakeAudio {
        constructor() { super(); env.audios.push(this); }
      },
    },
  };
}

let env;

test('realtime client attaches microphone and exchanges the completed offer SDP', async () => {
  env = fakeEnvironment();
  const statuses = [];
  const sessionOffers = [];
  const client = createRealtimeClient(env.dependencies);
  await client.connect({
    createSession: async (sdp) => { sessionOffers.push(sdp); return 'answer-sdp'; },
    onStatus: (status) => statuses.push(status),
    onTurn: () => {},
    onError: () => {},
  });
  assert.deepEqual(statuses, ['connecting']);
  assert.deepEqual(sessionOffers, ['offer-sdp']);
  assert.equal(env.peers[0].addedTracks[0].value, env.track);
  assert.deepEqual(env.peers[0].remoteDescription, { type: 'answer', sdp: 'answer-sdp' });
  assert.equal(env.channel.label, 'oai-events');
  assert.equal(env.audios[0].autoplay, true);
});

test('realtime client normalizes transcript events and status changes', async () => {
  env = fakeEnvironment();
  const turns = [];
  const statuses = [];
  const client = createRealtimeClient(env.dependencies);
  await client.connect({ createSession: async () => 'answer-sdp', onStatus: (value) => statuses.push(value), onTurn: (turn) => turns.push(turn), onError: () => {} });
  env.channel.onopen();
  env.channel.onmessage({ data: JSON.stringify({ type: 'conversation.item.input_audio_transcription.completed', transcript: '  Не открою ссылку  ' }) });
  env.channel.onmessage({ data: JSON.stringify({ type: 'response.output_audio_transcript.done', transcript: 'Кому расскажешь?' }) });
  env.channel.onmessage({ data: JSON.stringify({ type: 'response.audio.delta', delta: 'audio' }) });
  env.channel.onmessage({ data: JSON.stringify({ type: 'response.done' }) });
  assert.deepEqual(turns, [
    { role: 'user', text: 'Не открою ссылку' },
    { role: 'assistant', text: 'Кому расскажешь?' },
  ]);
  assert.equal(statuses.includes('mentor-speaking'), true);
  assert.equal(statuses.at(-1), 'listening');
  assert.equal(env.channel.sent[0].type, 'response.create');
});

test('mute and close control the owned microphone and connection resources', async () => {
  env = fakeEnvironment();
  const client = createRealtimeClient(env.dependencies);
  await client.connect({ createSession: async () => 'answer-sdp', onStatus: () => {}, onTurn: () => {}, onError: () => {} });
  client.setMuted(true);
  assert.equal(env.track.enabled, false);
  client.setMuted(false);
  assert.equal(env.track.enabled, true);
  client.close();
  client.close();
  assert.equal(env.track.stopped, true);
  assert.equal(env.channel.closed, true);
  assert.equal(env.peers[0].closed, true);
  assert.equal(env.audios[0].paused, true);
  assert.equal(env.audios[0].srcObject, null);
});
