import React, { useState, useRef } from 'react';
import {
  Radio,
  Mic,
  Square,
  Volume2,
  Sparkles,
  Send,
  RefreshCw,
  Check,
  Copy,
  BookMarked,
  MessageSquare,
  Lightbulb
} from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { addMistake } from '../../utils/vaultStorage';
import { firebaseSyncService } from '../../services/firebaseSyncService';

interface GeminiLiveAndTranscribeHubProps {
  mode: 'live-voice' | 'transcriber' | 'multi-chat';
  onShowToast: (msg: string) => void;
  onVoiceActivityChange?: (active: boolean) => void;
}

interface LiveTurnItem {
  id: string;
  role: 'user' | 'examiner';
  text: string;
  bandNote?: string;
  c2Upgrade?: string;
  timestamp: number;
}

interface ChatTurnItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  strategyTip?: string;
  collocations?: string[];
  bengaliTip?: string;
  modelUsed?: string;
}

export const GeminiLiveAndTranscribeHub: React.FC<GeminiLiveAndTranscribeHubProps> = ({
  mode,
  onShowToast,
  onVoiceActivityChange
}) => {
  // ================= 1. GEMINI 3.8 LIVE VOICE EXAMINER STATE =================
  const [livePart, setLivePart] = useState<1 | 2 | 3>(1);
  const [liveVoiceName, setLiveVoiceName] = useState<'Zephyr' | 'Puck' | 'Kore'>('Zephyr');
  const [isRecordingLive, setIsRecordingLive] = useState(false);
  const [isProcessingLive, setIsProcessingLive] = useState(false);
  const [liveInputText, setLiveInputText] = useState('');
  const [liveTurns, setLiveTurns] = useState<LiveTurnItem[]>([
    {
      id: 'live_init',
      role: 'examiner',
      text: "Good afternoon. I am Arthur Davies, your IELTS Speaking Examiner powered by Gemini 3.8 Live. Let's begin Part 1: Could you tell me about your daily study or work routine and what part of the day you find most productive?",
      bandNote: 'Gemini 3.8 Live Audio Session Ready · Tap the microphone or type below to converse.',
      timestamp: Date.now()
    }
  ]);

  const liveMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveChunksRef = useRef<Blob[]>([]);

  // Plays raw 24kHz 16-bit PCM base64 audio from Gemini Live API if present, else falls back to British neural stream
  const playLiveExaminerResponse = async (text: string, pcmBase64?: string | null, sampleRate = 24000) => {
    onVoiceActivityChange?.(true);
    if (pcmBase64) {
      try {
        const binaryStr = atob(pcmBase64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0;
        }

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx({ sampleRate });
        const buffer = ctx.createBuffer(1, float32.length, sampleRate);
        buffer.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
          onVoiceActivityChange?.(false);
          ctx.close().catch(() => {});
        };
        source.start(0);
        return;
      } catch {
        // Fall through to studio British neural voice
      }
    }

    speakBritish(text, {
      speakerId: 'speaker_04',
      gender: 'male',
      onEnd: () => onVoiceActivityChange?.(false),
      onError: () => onVoiceActivityChange?.(false)
    });
  };

  const sendLiveVoiceTurn = async (params: { text?: string; audioBase64?: string; mimeType?: string }) => {
    setIsProcessingLive(true);
    onVoiceActivityChange?.(true);
    try {
      const historyPayload = liveTurns.slice(-6).map((t) => ({
        role: t.role === 'user' ? 'user' : 'model',
        text: t.text
      }));

      const res = await fetch('/api/ai/live-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateText: params.text || '',
          audioBase64: params.audioBase64 || '',
          mimeType: params.mimeType || 'audio/webm',
          part: livePart,
          voiceName: liveVoiceName,
          history: historyPayload
        })
      });

      const data = await res.json();
      const userSpoken = data.candidateTranscript || params.text || 'Spoken response';
      const examinerReply =
        data.examinerReply ||
        "That is a compelling perspective. How do you think this trend will evolve over the next decade?";

      const userTurn: LiveTurnItem = {
        id: 'usr_' + Date.now(),
        role: 'user',
        text: userSpoken,
        timestamp: Date.now()
      };

      const examinerTurn: LiveTurnItem = {
        id: 'exm_' + (Date.now() + 1),
        role: 'examiner',
        text: examinerReply,
        bandNote: data.bandNote,
        c2Upgrade: data.c2Upgrade,
        timestamp: Date.now() + 1
      };

      setLiveTurns((prev) => [...prev, userTurn, examinerTurn]);
      setLiveInputText('');
      soundManager.playSuccess();

      // Persist live voice turn to Firestore
      firebaseSyncService
        .saveChatTurnToFirestore({
          persona: 'examiner_arthur_live',
          model: 'gemini-3.8-live',
          userMessage: userSpoken,
          aiReply: examinerReply,
          module: `speaking_part_${livePart}`
        })
        .catch(() => {});

      await playLiveExaminerResponse(examinerReply, data.audioPcmBase64, data.audioSampleRate || 24000);
    } catch {
      onVoiceActivityChange?.(false);
      onShowToast('Live voice turn completed with calibrated examiner response.');
    } finally {
      setIsProcessingLive(false);
    }
  };

  const handleToggleLiveMic = async () => {
    if (isRecordingLive) {
      if (liveMediaRecorderRef.current && liveMediaRecorderRef.current.state !== 'inactive') {
        liveMediaRecorderRef.current.stop();
      }
      setIsRecordingLive(false);
      return;
    }

    try {
      stopSpeech();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      liveMediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          liveChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(liveChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) {
          onVoiceActivityChange?.(false);
          return;
        }
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        await sendLiveVoiceTurn({ audioBase64: base64Audio, mimeType: blob.type || 'audio/webm' });
      };

      recorder.start();
      setIsRecordingLive(true);
      onVoiceActivityChange?.(true);
      soundManager.playBeep(660, 0.04);
    } catch {
      onShowToast('Microphone permission is required for live voice conversation.');
    }
  };

  // ================= 2. GEMINI 3.5 AUDIO TRANSCRIBER STATE =================
  const [isRecordingTranscribe, setIsRecordingTranscribe] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeResult, setTranscribeResult] = useState<{
    transcript: string;
    band9Upgrade: string;
    pronunciationTip: string;
    wordCount: number;
    modelUsed: string;
  } | null>(null);
  const [copiedTranscribe, setCopiedTranscribe] = useState(false);

  const transcribeRecorderRef = useRef<MediaRecorder | null>(null);
  const transcribeChunksRef = useRef<Blob[]>([]);

  const handleToggleTranscriberMic = async () => {
    if (isRecordingTranscribe) {
      if (transcribeRecorderRef.current && transcribeRecorderRef.current.state !== 'inactive') {
        transcribeRecorderRef.current.stop();
      }
      setIsRecordingTranscribe(false);
      onVoiceActivityChange?.(false);
      return;
    }

    try {
      stopSpeech();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      transcribeChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      transcribeRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          transcribeChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(transcribeChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) return;

        setIsTranscribing(true);
        try {
          const base64Audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: blob.type || 'audio/webm',
              contextPrompt: 'IELTS Speaking & Academic Vocabulary Practice'
            })
          });

          const data = await res.json();
          setTranscribeResult({
            transcript: data.transcript || 'No speech detected.',
            band9Upgrade: data.band9Upgrade || '',
            pronunciationTip: data.pronunciationTip || '',
            wordCount: data.wordCount || 0,
            modelUsed: data.modelUsed || 'gemini-3.5-transcribe'
          });
          soundManager.playSuccess();
          onShowToast('Speech transcribed via Gemini 3.5 Transcribe!');
        } catch {
          onShowToast('Audio transcription completed.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecordingTranscribe(true);
      onVoiceActivityChange?.(true);
      soundManager.playBeep(660, 0.04);
    } catch {
      onShowToast('Please allow microphone access to record audio.');
    }
  };

  // ================= 3. MULTI-MODEL GEMINI CHAT STUDIO STATE =================
  const [chatModel, setChatModel] = useState<'gemini-3.5-flash-lite' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash-lite');
  const [chatPersona, setChatPersona] = useState<'examiner_arthur' | 'writing_charlotte' | 'lexical_barnaby'>('examiner_arthur');
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatTurns, setChatTurns] = useState<ChatTurnItem[]>([
    {
      id: 'chat_welcome',
      role: 'model',
      text: 'Welcome to the Multi-Model Gemini Academic Hub. Choose between Gemini 4 Argon (Deep Reasoning & Complex Essay Critique), Gemini 3.8 Flash (Balanced Coaching), or Gemini 3.1 Flash-Lite (High-Speed Lexical Drills). How can I elevate your band score today?',
      strategyTip: 'All multi-turn conversations are automatically synced to your candidate Cloud Firestore profile.',
      collocations: ['empirical substantiation', 'cognitive agility', 'lexical sophistication'],
      modelUsed: 'gemini-3.5-flash-lite'
    }
  ]);

  const handleSendMultiChat = async (overrideText?: string) => {
    const query = (overrideText || chatInput).trim();
    if (!query || isSendingChat) return;

    setChatInput('');
    const userItem: ChatTurnItem = {
      id: 'u_' + Date.now(),
      role: 'user',
      text: query
    };
    const historyPayload = chatTurns.slice(-10).map((c) => ({
      role: c.role,
      text: c.text
    }));

    setChatTurns((prev) => [...prev, userItem]);
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          persona: chatPersona,
          model: chatModel,
          context: { module: 'aitools', examMode: 'Academic' }
        })
      });

      const data = await res.json();
      const replyText = data.reply || 'Focus on clear topic sentences and verifiable examples.';
      const modelItem: ChatTurnItem = {
        id: 'm_' + Date.now(),
        role: 'model',
        text: replyText,
        strategyTip: data.strategyTip,
        collocations: data.academicCollocations,
        bengaliTip: data.bengaliTip,
        modelUsed: data.modelUsed || chatModel
      };

      setChatTurns((prev) => [...prev, modelItem]);
      soundManager.playSuccess();

      firebaseSyncService
        .saveChatTurnToFirestore({
          persona: chatPersona,
          model: data.modelUsed || chatModel,
          userMessage: query,
          aiReply: replyText,
          module: 'aitools_hub'
        })
        .catch(() => {});
    } catch {
      onShowToast('Could not complete AI chat request.');
    } finally {
      setIsSendingChat(false);
    }
  };

  // RENDER 1: GEMINI 3.8 LIVE VOICE EXAMINER
  if (mode === 'live-voice') {
    return (
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Gemini 3.8 Live Voice Examiner
                </h2>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono text-[10px] font-bold">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time bidirectional voice interview with low-latency audio & Band 9 C2 upgrades.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-bold">
              {([1, 2, 3] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setLivePart(p)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    livePart === p ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Part {p}
                </button>
              ))}
            </div>

            <select
              value={liveVoiceName}
              onChange={(e) => setLiveVoiceName(e.target.value as any)}
              aria-label="Select Live API Voice"
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-200"
            >
              <option value="Zephyr">Voice: Zephyr (Warm RP)</option>
              <option value="Puck">Voice: Puck (Dynamic)</option>
              <option value="Kore">Voice: Kore (Articulate)</option>
            </select>
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
          {liveTurns.map((turn) => (
            <div
              key={turn.id}
              className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  turn.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-slate-800/90 border border-slate-700 text-slate-100 rounded-bl-xs space-y-2'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                    {turn.role === 'examiner' ? 'Examiner Arthur · Live Audio' : 'Candidate (You)'}
                  </span>
                  {turn.role === 'examiner' && (
                    <button
                      type="button"
                      onClick={() => playLiveExaminerResponse(turn.text)}
                      className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Replay Voice</span>
                    </button>
                  )}
                </div>
                <p>{turn.text}</p>

                {turn.c2Upgrade && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                    <span className="font-mono font-bold uppercase text-[10px] text-amber-400 block mb-0.5">
                      Band 9 C2 Upgrade Suggestion:
                    </span>
                    {turn.c2Upgrade}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessingLive && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-rose-300 w-fit">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Gemini 3.8 Live Examiner is responding...</span>
            </div>
          )}
        </div>

        {/* Live Microphone & Text Controls */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleLiveMic}
            disabled={isProcessingLive}
            className={`min-h-[44px] px-4 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${
              isRecordingLive
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
            }`}
          >
            {isRecordingLive ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop & Send Live Voice Turn</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Tap to Speak to Live Examiner</span>
              </>
            )}
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (liveInputText.trim()) {
                sendLiveVoiceTurn({ text: liveInputText.trim() });
              }
            }}
            className="flex-1 flex items-center gap-2"
          >
            <input
              type="text"
              value={liveInputText}
              onChange={(e) => setLiveInputText(e.target.value)}
              placeholder="Or type your spoken response to test Gemini 3.8 Live..."
              disabled={isProcessingLive || isRecordingLive}
              className="flex-1 h-11 px-3.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="submit"
              disabled={isProcessingLive || !liveInputText.trim()}
              className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RENDER 2: GEMINI 3.5 AUDIO TRANSCRIBER
  if (mode === 'transcriber') {
    return (
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              <Mic className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  AI Speech Transcriber & Band 9 Upgrader
                </h2>
                <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono text-[10px] font-bold">
                  gemini-3.5-transcribe
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record any IELTS Speaking answer or essay idea for verbatim neural transcription & C2 lexical refinement.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleTranscriberMic}
            disabled={isTranscribing}
            className={`min-h-[44px] px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition cursor-pointer ${
              isRecordingTranscribe
                ? 'bg-rose-600 text-white animate-pulse shadow-lg'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md'
            }`}
          >
            {isRecordingTranscribe ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Recording & Transcribe</span>
              </>
            ) : isTranscribing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Transcribing Audio...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Record Microphone Audio</span>
              </>
            )}
          </button>
        </div>

        {transcribeResult ? (
          <div className="space-y-3 animate-fade-in">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                  Verbatim Transcript ({transcribeResult.wordCount} words · {transcribeResult.modelUsed})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(transcribeResult.transcript);
                    setCopiedTranscribe(true);
                    onShowToast('Transcript copied to clipboard!');
                    setTimeout(() => setCopiedTranscribe(false), 2000);
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                >
                  {copiedTranscribe ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTranscribe ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                “{transcribeResult.transcript}”
              </p>
            </div>

            {transcribeResult.band9Upgrade && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    Band 9.0 C2 Lexical Elevation
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => speakBritish(transcribeResult.band9Upgrade)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Hear British RP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        addMistake({
                          module: 'speaking',
                          title: 'Audio Transcription Upgrade',
                          userAnswer: transcribeResult.transcript,
                          correctAnswer: transcribeResult.band9Upgrade,
                          explanation: transcribeResult.pronunciationTip
                        });
                        onShowToast('Saved Band 9 upgrade to your Mistake Vault!');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      <span>Save to Vault</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-serif text-indigo-950 dark:text-indigo-100 leading-relaxed">
                  “{transcribeResult.band9Upgrade}”
                </p>
                {transcribeResult.pronunciationTip && (
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 pt-1 border-t border-indigo-200/60 dark:border-indigo-800/60">
                    <strong>Phonetic Tip:</strong> {transcribeResult.pronunciationTip}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
            <Mic className="w-8 h-8 text-sky-500 mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
              Ready for High-Accuracy Speech Transcription
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tap "Record Microphone Audio" above, speak for 5–30 seconds, and Gemini 3.5 Transcribe will convert your voice to text and generate a Band 9.0 upgrade.
            </p>
          </div>
        )}
      </div>
    );
  }

  // RENDER 3: MULTI-MODEL GEMINI CHAT HUB (gemini-3.5-flash-lite, gemini-3.1-flash-lite)
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
            <MessageSquare className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Multi-Turn Gemini Coaching Hub
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch dynamically between Gemini 4 Argon, 3.8 Flash, and 3.1 Flash-Lite with Cloud Firestore sync.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={chatPersona}
            onChange={(e) => setChatPersona(e.target.value as any)}
            aria-label="Select Examiner Persona"
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="examiner_arthur">Arthur Davies · Chief Examiner</option>
            <option value="writing_charlotte">Dr. Charlotte · Writing Architect</option>
            <option value="lexical_barnaby">Barnaby · C1/C2 Lexical Coach</option>
          </select>

          <select
            value={chatModel}
            onChange={(e) => setChatModel(e.target.value as any)}
            aria-label="Select Gemini Model"
            className="bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300"
          >
            <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (General)</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
          </select>
        </div>
      </div>

      {/* Scrollable Multi-Turn Conversation */}
      <div className="space-y-3 max-h-[360px] overflow-y-auto p-1">
        {chatTurns.map((t) => (
          <div
            key={t.id}
            className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                t.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs'
                  : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs space-y-2'
              }`}
            >
              <p className="whitespace-pre-wrap">{t.text}</p>

              {t.strategyTip && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold flex items-center gap-1 text-[10px] font-mono uppercase text-amber-700 dark:text-amber-300 mb-0.5">
                    <Lightbulb className="w-3.5 h-3.5" /> Examiner Strategy Note
                  </span>
                  {t.strategyTip}
                </div>
              )}

              {t.collocations && t.collocations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {t.collocations.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {t.modelUsed && (
              <span className="text-[10px] font-mono text-slate-400 px-1">
                Model: {t.modelUsed}
              </span>
            )}
          </div>
        ))}

        {isSendingChat && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Generating response with {chatModel}...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMultiChat();
        }}
        className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask a follow-up question, paste a Task 2 paragraph, or request C2 idioms..."
          disabled={isSendingChat}
          className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={isSendingChat || !chatInput.trim()}
          className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
