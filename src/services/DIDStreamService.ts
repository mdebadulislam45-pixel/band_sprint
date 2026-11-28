import { getStoredSessionToken } from './authService';

export interface DIDConfigResponse {
  configured: boolean;
  provider: string;
}

function buildAuthJsonHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getStoredSessionToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export interface DIDStreamInitData {
  id: string;
  offer: RTCSessionDescriptionInit;
  ice_servers: RTCIceServer[];
  session_id: string;
}

export class DIDStreamService {
  private static instance: DIDStreamService;
  private peerConnection: RTCPeerConnection | null = null;
  private streamId: string | null = null;
  private sessionId: string | null = null;
  private isConnecting: boolean = false;
  private isConnected: boolean = false;
  private isConfiguredCached: boolean | null = null;

  public static getInstance(): DIDStreamService {
    if (!DIDStreamService.instance) {
      DIDStreamService.instance = new DIDStreamService();
    }
    return DIDStreamService.instance;
  }

  public async checkConfig(): Promise<boolean> {
    if (this.isConfiguredCached !== null) {
      return this.isConfiguredCached;
    }
    try {
      const res = await fetch('/api/did/config');
      if (res.ok) {
        const data: DIDConfigResponse = await res.json();
        this.isConfiguredCached = Boolean(data.configured);
        return this.isConfiguredCached;
      }
    } catch {
      // /api/* is unavailable on the static site, so the config check fails
      // there by design — D-ID simply stays unconfigured.
    }
    this.isConfiguredCached = false;
    return false;
  }

  public async startStream(
    videoElement: HTMLVideoElement,
    gender: 'female' | 'male',
    onStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'error', message?: string) => void
  ): Promise<boolean> {
    if (this.isConnecting) return false;
    this.isConnecting = true;
    onStatusChange?.('connecting', 'Establishing D-ID WebRTC Stream...');

    try {
      // Clean up any existing connection first
      await this.closeStream();

      // 1. Initialize stream session from backend proxy
      const res = await fetch('/api/did/streams', {
        method: 'POST',
        headers: buildAuthJsonHeaders(),
        body: JSON.stringify({ gender })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status} initializing stream`);
      }

      const streamData: DIDStreamInitData = await res.json();
      this.streamId = streamData.id;
      this.sessionId = streamData.session_id;

      // 2. Create WebRTC PeerConnection with D-ID ICE servers
      const pc = new RTCPeerConnection({
        iceServers: streamData.ice_servers || [{ urls: ['stun:stun.l.google.com:19302'] }]
      });
      this.peerConnection = pc;

      // 3. Set up track receiver for the remote video stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          videoElement.srcObject = event.streams[0];
          videoElement.play().catch(() => { /* Autoplay blocked until the student interacts — expected browser behaviour. */ });
          this.isConnected = true;
          onStatusChange?.('connected', 'D-ID Live Examiner Stream Connected');
        }
      };

      // 4. Send local ICE candidates to D-ID via backend
      pc.onicecandidate = (event) => {
        if (event.candidate && this.streamId && this.sessionId) {
          fetch(`/api/did/streams/${encodeURIComponent(this.streamId)}/ice`, {
            method: 'POST',
            headers: buildAuthJsonHeaders(),
            body: JSON.stringify({
              candidate: event.candidate,
              sessionId: this.sessionId
            })
          }).catch(() => { /* ICE candidate send failed — the peer connection continues with the remaining candidates. */ });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          this.isConnected = true;
          onStatusChange?.('connected', 'D-ID Live Examiner Ready');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          this.isConnected = false;
          onStatusChange?.('error', 'D-ID WebRTC connection closed');
        }
      };

      // 5. Set remote offer description
      await pc.setRemoteDescription(new RTCSessionDescription(streamData.offer));

      // 6. Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 7. Submit answer to D-ID via backend
      const answerRes = await fetch(`/api/did/streams/${encodeURIComponent(this.streamId)}/sdp`, {
        method: 'POST',
        headers: buildAuthJsonHeaders(),
        body: JSON.stringify({
          answer,
          sessionId: this.sessionId
        })
      });

      if (!answerRes.ok) {
        throw new Error('Failed to exchange SDP answer with D-ID');
      }

      this.isConnecting = false;
      return true;
    } catch (err: any) {
      console.warn('[D-ID] WebRTC startStream failed:', err?.message || err);
      this.isConnecting = false;
      this.isConnected = false;
      onStatusChange?.('error', err?.message || 'Could not connect D-ID stream');
      await this.closeStream();
      return false;
    }
  }

  public async speakText(text: string, voiceId?: string): Promise<boolean> {
    if (!this.streamId || !this.sessionId || !this.isConnected) {
      return false;
    }

    try {
      const res = await fetch(`/api/did/streams/${encodeURIComponent(this.streamId)}/talk`, {
        method: 'POST',
        headers: buildAuthJsonHeaders(),
        body: JSON.stringify({
          text,
          voiceId: voiceId || 'en-GB-SoniaNeural',
          sessionId: this.sessionId
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('[D-ID] speakText failed:', err);
      return false;
    }
  }

  public async closeStream(): Promise<void> {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }

    if (this.streamId && this.sessionId) {
      const sid = this.streamId;
      const sessId = this.sessionId;
      this.streamId = null;
      this.sessionId = null;
      this.isConnected = false;

      fetch(`/api/did/streams/${encodeURIComponent(sid)}`, {
        method: 'DELETE',
        headers: buildAuthJsonHeaders(),
        body: JSON.stringify({ sessionId: sessId })
      }).catch(() => {});
    }

    this.isConnecting = false;
    this.isConnected = false;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const didStreamService = DIDStreamService.getInstance();
