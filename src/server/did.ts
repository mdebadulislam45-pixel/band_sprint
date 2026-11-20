const DID_API_BASE = 'https://api.d-id.com';

export function isDIDConfigured(): boolean {
  const key = (process.env.D_ID_API_KEY || process.env.DID_API_KEY || '').trim();
  return Boolean(key);
}

export function getDIDAuthHeader(): string {
  const rawKey = (process.env.D_ID_API_KEY || process.env.DID_API_KEY || '').trim();
  if (!rawKey) return '';
  if (rawKey.startsWith('Basic ') || rawKey.startsWith('Bearer ')) {
    return rawKey;
  }
  if (rawKey.includes(':')) {
    return `Basic ${Buffer.from(rawKey).toString('base64')}`;
  }
  // Standard D-ID key format (base64 encoded key:)
  return `Basic ${Buffer.from(`${rawKey}:`).toString('base64')}`;
}

export interface DIDStreamResponse {
  id: string;
  offer: {
    type: string;
    sdp: string;
  };
  ice_servers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  session_id: string;
}

export async function createDIDStream(sourceUrl: string): Promise<DIDStreamResponse> {
  const authHeader = getDIDAuthHeader();
  if (!authHeader) {
    throw new Error('D-ID API key is not configured in environment variables.');
  }

  const response = await fetch(`${DID_API_BASE}/talks/streams`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source_url: sourceUrl,
      stream_warmup: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`D-ID stream creation failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as DIDStreamResponse;
}

export async function submitDIDAnswer(streamId: string, sessionId: string, answer: any): Promise<any> {
  const authHeader = getDIDAuthHeader();
  if (!authHeader) {
    throw new Error('D-ID API key is not configured.');
  }

  const response = await fetch(`${DID_API_BASE}/talks/streams/${encodeURIComponent(streamId)}/sdp`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      answer,
      session_id: sessionId
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`D-ID SDP exchange failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export async function submitDIDIceCandidate(
  streamId: string,
  sessionId: string,
  candidate: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null }
): Promise<any> {
  const authHeader = getDIDAuthHeader();
  if (!authHeader) {
    throw new Error('D-ID API key is not configured.');
  }

  const response = await fetch(`${DID_API_BASE}/talks/streams/${encodeURIComponent(streamId)}/ice`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      session_id: sessionId
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`D-ID ICE exchange failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export async function sendDIDTalk(
  streamId: string,
  sessionId: string,
  text: string,
  voiceId: string = 'en-GB-SoniaNeural'
): Promise<any> {
  const authHeader = getDIDAuthHeader();
  if (!authHeader) {
    throw new Error('D-ID API key is not configured.');
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Speech text cannot be empty.');
  }

  const response = await fetch(`${DID_API_BASE}/talks/streams/${encodeURIComponent(streamId)}`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      script: {
        type: 'text',
        subtitles: 'false',
        provider: {
          type: 'microsoft',
          voice_id: voiceId
        },
        ssml: 'false',
        input: cleanText
      },
      config: {
        fluent: 'true',
        pad_audio: '0.0',
        stitch: 'true'
      },
      session_id: sessionId
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`D-ID talk command failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export async function destroyDIDStream(streamId: string, sessionId: string): Promise<any> {
  const authHeader = getDIDAuthHeader();
  if (!authHeader) return { success: true };

  try {
    const response = await fetch(`${DID_API_BASE}/talks/streams/${encodeURIComponent(streamId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId
      })
    });
    return { success: response.ok };
  } catch (err) {
    return { success: false };
  }
}
