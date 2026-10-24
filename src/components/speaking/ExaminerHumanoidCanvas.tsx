import React, { useState, useEffect } from 'react';

export type ExaminerArtStyle = 'humanoid' | 'anime';

export interface ExaminerHumanoidCanvasProps {
  gender: 'female' | 'male';
  artStyle?: ExaminerArtStyle;
  isSpeaking: boolean;
  isListening: boolean;
  mouthOpenness: number; // 0 to 1
  examinerName?: string;
  activePartLabel?: string;
  compact?: boolean;
}

/**
 * British Council Video-Call Examiner Viewport & Portrait
 * Features a borderless rounded-2xl ambient dark slate viewport (`bg-slate-900/90`),
 * minimal top live indicator (`● REC · IELTS Part 1 Active`) + examiner name tag,
 * rich multi-stop facial shading, refined hair contours, natural 4s blink cycle,
 * gentle resting breathing motion, and audio-synchronized viseme lip movement.
 */
export const ExaminerHumanoidCanvas: React.FC<ExaminerHumanoidCanvasProps> = ({
  gender,
  isSpeaking,
  isListening,
  mouthOpenness,
  examinerName,
  activePartLabel = 'IELTS Part 1 Active',
  compact = false
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeGazeOffset, setEyeGazeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [breathPhase, setBreathPhase] = useState<number>(0);

  // Natural blink every ~4 seconds
  useEffect(() => {
    let timeoutId: number;
    const scheduleBlink = () => {
      const nextBlinkMs = 3600 + Math.random() * 900; // ~4s natural cadence
      timeoutId = window.setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, nextBlinkMs);
    };
    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  // Gentle breathing & subtle attentive eye micro-movements
  useEffect(() => {
    const interval = window.setInterval(() => {
      setBreathPhase((prev) => (prev + 1) % 120);
      if (Math.random() < 0.3) {
        setEyeGazeOffset({
          x: (Math.random() - 0.5) * 1.2,
          y: (Math.random() - 0.5) * 0.8
        });
      } else {
        setEyeGazeOffset({ x: 0, y: 0 });
      }
    }, 850);
    return () => clearInterval(interval);
  }, []);

  const breathY = Math.sin((breathPhase / 120) * Math.PI * 2) * 1.1;
  const headPoseY = isSpeaking ? (mouthOpenness > 0.55 ? -1.0 : 0.4) : isListening ? 0.8 : breathY;

  // Responsive mouth viseme articulation synchronized to audio playback
  const openAmt = isSpeaking ? Math.max(0.16, Math.min(1, mouthOpenness)) : 0;
  const mouthHalfWidth = isSpeaking ? 10.5 + openAmt * 3.2 : 12;
  const mouthOpenHeight = isSpeaking ? 2.2 + openAmt * 9.5 : 0.6;

  const displayName =
    examinerName || (gender === 'female' ? 'Dr. Clara Sterling' : 'Prof. Arthur Pendelton');

  return (
    <div
      className={`relative w-full ${
        compact ? 'h-56 sm:h-64' : 'h-64 sm:h-72'
      } rounded-2xl overflow-hidden bg-slate-900/90 shadow-lg select-none flex flex-col justify-between`}
    >
      {/* Top Bar: Minimal Live Indicator & Examiner Name Tag */}
      <div className="relative z-20 px-3.5 py-2.5 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isSpeaking
                ? 'bg-rose-500 animate-pulse'
                : isListening
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-[11px] font-mono font-semibold text-slate-200 tracking-tight truncate">
            REC · {activePartLabel}
          </span>
        </div>

        <span className="px-2.5 py-0.5 rounded-lg bg-slate-950/65 backdrop-blur-xs text-[11px] font-medium text-slate-200 truncate">
          {displayName}
        </span>
      </div>

      {/* Center Portrait SVG Canvas */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 280 260"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          aria-label={displayName}
        >
          <defs>
            {/* Ambient British Council Video-Call Studio Backdrop */}
            <radialGradient id={`bcStudioBg_${gender}`} cx="50%" cy="38%" r="75%">
              <stop offset="0%" stopColor={gender === 'female' ? '#24344D' : '#1E2D42'} />
              <stop offset="55%" stopColor="#131C2E" />
              <stop offset="100%" stopColor="#0B111E" />
            </radialGradient>

            {/* Soft Studio Key Light Glow */}
            <radialGradient id="studioKeyGlow" cx="35%" cy="25%" r="60%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </radialGradient>

            {/* Rich Multi-Stop Facial Shading Gradients */}
            <radialGradient id="faceDepthFemale" cx="44%" cy="36%" r="62%">
              <stop offset="0%" stopColor="#FFF3EB" />
              <stop offset="42%" stopColor="#FAD9C8" />
              <stop offset="78%" stopColor="#E6B69E" />
              <stop offset="100%" stopColor="#C68E75" />
            </radialGradient>

            <radialGradient id="faceDepthMale" cx="44%" cy="36%" r="62%">
              <stop offset="0%" stopColor="#FCEADE" />
              <stop offset="45%" stopColor="#SLATE" stopOpacity="0" />
              <stop offset="45%" stopColor="#EOC6B0" />
              <stop offset="80%" stopColor="#D5A187" />
              <stop offset="100%" stopColor="#B47C62" />
            </radialGradient>

            <linearGradient id="skinToneMaleLinear" x1="20%" y1="10%" x2="80%" y2="95%">
              <stop offset="0%" stopColor="#FCEADE" />
              <stop offset="48%" stopColor="#EDC8B2" />
              <stop offset="82%" stopColor="#D29E82" />
              <stop offset="100%" stopColor="#B37B5F" />
            </linearGradient>

            {/* Soft Cheek & Temple Contour Gradients */}
            <radialGradient id="cheekWarmth" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E07A68" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#E07A68" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="neckShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4A2518" stopOpacity="0.48" />
              <stop offset="65%" stopColor="#6D3B28" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6D3B28" stopOpacity="0" />
            </linearGradient>

            {/* Refined Multi-Tonal Hair Gradients */}
            <linearGradient id="refinedHairFemale" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#4A2E21" />
              <stop offset="35%" stopColor="#321C13" />
              <stop offset="75%" stopColor="#1E100A" />
              <stop offset="100%" stopColor="#120905" />
            </linearGradient>

            <linearGradient id="refinedHairMale" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="45%" stopColor="#273449" />
              <stop offset="85%" stopColor="#151E2E" />
              <stop offset="100%" stopColor="#0B111E" />
            </linearGradient>

            {/* Natural Multi-Layered Iris Gradients */}
            <radialGradient id="naturalIrisFemale" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#090D16" />
              <stop offset="35%" stopColor="#2563EB" />
              <stop offset="75%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>

            <radialGradient id="naturalIrisMale" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#090D16" />
              <stop offset="36%" stopColor="#475569" />
              <stop offset="78%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#090D16" />
            </radialGradient>

            {/* Formal British Council Attire Gradients */}
            <linearGradient id="blazerFemale" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="50%" stopColor="#172554" />
              <stop offset="100%" stopColor="#0B132B" />
            </linearGradient>

            <linearGradient id="blazerMale" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="55%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#070B14" />
            </linearGradient>

            {/* Natural Lip Shading */}
            <linearGradient id="naturalLipFemale" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D16B70" />
              <stop offset="100%" stopColor="#A8464D" />
            </linearGradient>

            <linearGradient id="naturalLipMale" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#BD7E76" />
              <stop offset="100%" stopColor="#945952" />
            </linearGradient>
          </defs>

          {/* Studio Backdrop with Subtle Architectural Depth */}
          <rect width="280" height="260" fill={`url(#bcStudioBg_${gender})`} />
          <rect width="280" height="260" fill="url(#studioKeyGlow)" />

          {/* Subtle Acoustic Panel Lines in Background */}
          <g opacity="0.12">
            <line x1="0" y1="196" x2="280" y2="196" stroke="#94A3B8" strokeWidth="1" />
            <rect x="26" y="34" width="54" height="82" rx="4" fill="none" stroke="#64748B" strokeWidth="1" />
            <rect x="200" y="34" width="54" height="82" rx="4" fill="none" stroke="#64748B" strokeWidth="1" />
          </g>

          {/* Animated Head & Upper Torso Group (Breathing + Speech Micro-Movements) */}
          <g
            style={{
              transform: `translate(10px, ${headPoseY}px)`,
              transition: 'transform 140ms ease-out'
            }}
          >
            {/* Back Sculpted Hair Layer (Dr. Clara) */}
            {gender === 'female' && (
              <path
                d="M68,94 C55,134 57,188 72,226 L188,226 C203,188 205,134 192,94 C186,48 161,32 130,32 C99,32 74,48 68,94 Z"
                fill="url(#refinedHairFemale)"
              />
            )}

            {/* Tailored British Council Examiner Attire */}
            {gender === 'female' ? (
              <g>
                <path
                  d="M30,260 C37,202 74,185 130,185 C186,185 223,202 230,260 Z"
                  fill="url(#blazerFemale)"
                />
                <path d="M91,185 L130,237 L107,260 L77,196 Z" fill="#0F172A" opacity="0.6" />
                <path d="M169,185 L130,237 L153,260 L183,196 Z" fill="#0F172A" opacity="0.6" />
                <polygon points="104,185 130,234 156,185" fill="#F8FAFC" />
                <path
                  d="M112,188 Q130,203 148,188"
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="1.5"
                  opacity="0.8"
                />
                <circle cx="130" cy="196" r="2" fill="#FDE68A" />
              </g>
            ) : (
              <g>
                <path
                  d="M24,260 C33,198 72,183 130,183 C188,183 227,198 236,260 Z"
                  fill="url(#blazerMale)"
                />
                <polygon points="102,183 130,242 158,183" fill="#F8FAFC" />
                <polygon points="124,191 136,191 139,246 130,256 121,246" fill="#881337" />
                <polygon points="122,185 138,185 135,193 125,193" fill="#4C0519" />
                <polygon points="102,181 125,192 114,204 98,187" fill="#E2E8F0" />
                <polygon points="158,181 135,192 146,204 162,187" fill="#E2E8F0" />
                <path d="M84,187 L104,183 L122,250 L92,250 Z" fill="#090D16" />
                <path d="M176,187 L156,183 L138,250 L168,250 Z" fill="#090D16" />
              </g>
            )}

            {/* Neck & Submental Shadow */}
            <path
              d="M109,153 L109,189 C109,197 151,197 151,189 L151,153 Z"
              fill={gender === 'female' ? 'url(#faceDepthFemale)' : 'url(#skinToneMaleLinear)'}
            />
            <path
              d="M109,155 Q130,174 151,155 L151,177 Q130,186 109,177 Z"
              fill="url(#neckShadow)"
            />

            {/* Ears with Natural Shading */}
            <g>
              <path
                d="M79,107 C72,105 70,119 75,128 C78,133 81,131 82,127"
                fill={gender === 'female' ? 'url(#faceDepthFemale)' : 'url(#skinToneMaleLinear)'}
              />
              <path d="M76,113 Q74,120 78,124" fill="none" stroke="#AD7159" strokeWidth="1.3" opacity="0.55" />

              <path
                d="M181,107 C188,105 190,119 185,128 C182,133 179,131 178,127"
                fill={gender === 'female' ? 'url(#faceDepthFemale)' : 'url(#skinToneMaleLinear)'}
              />
              <path d="M184,113 Q186,120 182,124" fill="none" stroke="#AD7159" strokeWidth="1.3" opacity="0.55" />
            </g>

            {/* Sculpted Cranium, Cheekbones & Jawline */}
            <path
              d={
                gender === 'female'
                  ? 'M80,93 C80,55 101,39 130,39 C159,39 180,55 180,93 C180,121 171,145 150,161 C139,169 121,169 110,161 C89,145 80,121 80,93 Z'
                  : 'M78,89 C78,51 100,37 130,37 C160,37 182,51 182,89 C182,119 174,145 154,162 C141,171 119,171 106,162 C86,145 78,119 78,89 Z'
              }
              fill={gender === 'female' ? 'url(#faceDepthFemale)' : 'url(#skinToneMaleLinear)'}
            />

            {/* Soft Cheekbone Warmth & Facial Contour Definition */}
            <ellipse cx="97" cy="123" rx="15" ry="9" fill="url(#cheekWarmth)" />
            <ellipse cx="163" cy="123" rx="15" ry="9" fill="url(#cheekWarmth)" />
            <path
              d="M84,125 C92,151 112,166 130,167 C148,166 168,151 176,125"
              fill="none"
              stroke="#8D553E"
              strokeWidth="1.2"
              opacity="0.38"
            />

            {/* Natural Eyebrows */}
            <g
              style={{
                transform: `translateY(${isSpeaking ? -1.4 : isListening ? -0.9 : 0}px)`,
                transition: 'transform 160ms ease-out'
              }}
            >
              {gender === 'female' ? (
                <>
                  <path
                    d="M91,91 C98,86.5 109,86.5 117,90.5"
                    fill="none"
                    stroke="#2B1810"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M143,90.5 C151,86.5 162,86.5 169,91"
                    fill="none"
                    stroke="#2B1810"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <path
                    d="M89,89.5 C97,85 110,85.5 118,89.5"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M142,89.5 C150,85.5 163,85 171,89.5"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </>
              )}
            </g>

            {/* Refined Natural Eyes with Subtle Catchlights & 4s Blink */}
            {isBlinking ? (
              <g>
                <path
                  d="M92,105 Q104.5,110.5 117,105"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M143,105 Q155.5,110.5 168,105"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              <g>
                {/* Left Eye */}
                <g>
                  <path
                    d="M91,97.5 Q104,93 117,98.5"
                    fill="none"
                    stroke="#8C5843"
                    strokeWidth="1.0"
                    opacity="0.6"
                  />
                  <path
                    d="M91,104.5 C96,98.2 111,98.2 117,104.5 C111,110 96,110 91,104.5 Z"
                    fill="#F8FAFC"
                  />
                  <g transform={`translate(${eyeGazeOffset.x}, ${eyeGazeOffset.y})`}>
                    <circle
                      cx="104"
                      cy="104"
                      r="4.9"
                      fill={gender === 'female' ? 'url(#naturalIrisFemale)' : 'url(#naturalIrisMale)'}
                    />
                    <circle cx="104" cy="104" r="2.2" fill="#090D16" />
                    <circle cx="105.8" cy="102.3" r="1.3" fill="#FFFFFF" opacity="0.92" />
                    <circle cx="102.4" cy="105.6" r="0.65" fill="#FFFFFF" opacity="0.7" />
                  </g>
                  <path
                    d="M90.5,104.5 C96,97.8 111,97.8 117.5,104.5"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth={gender === 'female' ? '2.3' : '1.8'}
                    strokeLinecap="round"
                  />
                  <path
                    d="M93,106 C98,109.8 110,109.8 115,106"
                    fill="none"
                    stroke="#7C4D3A"
                    strokeWidth="0.85"
                    opacity="0.5"
                  />
                </g>

                {/* Right Eye */}
                <g>
                  <path
                    d="M143,98.5 Q156,93 169,97.5"
                    fill="none"
                    stroke="#8C5843"
                    strokeWidth="1.0"
                    opacity="0.6"
                  />
                  <path
                    d="M143,104.5 C149,98.2 164,98.2 169,104.5 C164,110 149,110 143,104.5 Z"
                    fill="#F8FAFC"
                  />
                  <g transform={`translate(${eyeGazeOffset.x}, ${eyeGazeOffset.y})`}>
                    <circle
                      cx="156"
                      cy="104"
                      r="4.9"
                      fill={gender === 'female' ? 'url(#naturalIrisFemale)' : 'url(#naturalIrisMale)'}
                    />
                    <circle cx="156" cy="104" r="2.2" fill="#090D16" />
                    <circle cx="157.8" cy="102.3" r="1.3" fill="#FFFFFF" opacity="0.92" />
                    <circle cx="154.4" cy="105.6" r="0.65" fill="#FFFFFF" opacity="0.7" />
                  </g>
                  <path
                    d="M142.5,104.5 C149,97.8 164,97.8 169.5,104.5"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth={gender === 'female' ? '2.3' : '1.8'}
                    strokeLinecap="round"
                  />
                  <path
                    d="M145,106 C150,109.8 162,109.8 167,106"
                    fill="none"
                    stroke="#7C4D3A"
                    strokeWidth="0.85"
                    opacity="0.5"
                  />
                </g>
              </g>
            )}

            {/* Refined Frame Spectacles for Prof. Arthur */}
            {gender === 'male' && (
              <g opacity="0.88">
                <rect
                  x="86"
                  y="94.5"
                  width="35"
                  height="19.5"
                  rx="5.5"
                  fill="rgba(255,255,255,0.02)"
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                <rect
                  x="139"
                  y="94.5"
                  width="35"
                  height="19.5"
                  rx="5.5"
                  fill="rgba(255,255,255,0.02)"
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                <path d="M121,102.5 Q130,99.5 139,102.5" fill="none" stroke="#334155" strokeWidth="1.8" />
                <line x1="78" y1="101.5" x2="86" y2="101.5" stroke="#334155" strokeWidth="1.6" />
                <line x1="174" y1="101.5" x2="182" y2="101.5" stroke="#334155" strokeWidth="1.6" />
              </g>
            )}

            {/* Sculpted Nasal Bridge & Soft Highlight */}
            <g>
              <path
                d="M127,100 L125,123.5 Q130,128.5 135,123.5 L133,100"
                fill="rgba(160, 98, 72, 0.13)"
              />
              <line
                x1="130"
                y1="101"
                x2="130"
                y2="122.5"
                stroke="rgba(255, 255, 255, 0.42)"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path
                d="M122.5,124.5 Q126,128.2 130,128.2 Q134,128.2 137.5,124.5"
                fill="none"
                stroke="#9C6049"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>

            {/* Responsive Mouth Viseme Animation Synchronized to Audio */}
            <g transform="translate(130, 143)">
              {isSpeaking ? (
                <g>
                  <path
                    d={`M ${-mouthHalfWidth},0 Q 0,${-mouthOpenHeight * 0.65} ${mouthHalfWidth},0 Q 0,${mouthOpenHeight * 1.1} ${-mouthHalfWidth},0 Z`}
                    fill="#450A0A"
                  />
                  {mouthOpenHeight > 3.0 && (
                    <path
                      d={`M ${-mouthHalfWidth + 3},${-mouthOpenHeight * 0.2} Q 0,${-mouthOpenHeight * 0.38} ${mouthHalfWidth - 3},${-mouthOpenHeight * 0.2} L ${mouthHalfWidth - 4},0 Q 0,${-mouthOpenHeight * 0.1} ${-mouthHalfWidth + 4},0 Z`}
                      fill="#F8FAFC"
                    />
                  )}
                  {mouthOpenHeight > 4.6 && (
                    <ellipse
                      cx="0"
                      cy={mouthOpenHeight * 0.34}
                      rx={mouthHalfWidth * 0.5}
                      ry={mouthOpenHeight * 0.26}
                      fill="#BE123C"
                    />
                  )}
                  <path
                    d={`M ${-mouthHalfWidth},0 C ${-mouthHalfWidth * 0.5},${-mouthOpenHeight * 0.7} -3,${-mouthOpenHeight * 0.8} 0,${-mouthOpenHeight * 0.6} C 3,${-mouthOpenHeight * 0.8} ${mouthHalfWidth * 0.5},${-mouthOpenHeight * 0.7} ${mouthHalfWidth},0`}
                    fill="none"
                    stroke={gender === 'female' ? 'url(#naturalLipFemale)' : 'url(#naturalLipMale)'}
                    strokeWidth={gender === 'female' ? '2.8' : '2.3'}
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${-mouthHalfWidth},0 Q 0,${mouthOpenHeight * 1.2} ${mouthHalfWidth},0`}
                    fill="none"
                    stroke={gender === 'female' ? 'url(#naturalLipFemale)' : 'url(#naturalLipMale)'}
                    strokeWidth={gender === 'female' ? '3.0' : '2.4'}
                    strokeLinecap="round"
                  />
                </g>
              ) : (
                <g>
                  <path
                    d="M-12.5,0 C-7.5,-2.9 -2.8,-3.2 0,-1.6 C2.8,-3.2 7.5,-2.9 12.5,0 Q0,3.0 -12.5,0 Z"
                    fill={gender === 'female' ? 'url(#naturalLipFemale)' : 'url(#naturalLipMale)'}
                    opacity={gender === 'female' ? '0.88' : '0.7'}
                  />
                  <path
                    d="M-13,-0.1 Q0,3.4 13,-0.1"
                    fill="none"
                    stroke="#7F2D2D"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M-4.5,7.5 Q0,9.5 4.5,7.5"
                    fill="none"
                    stroke="#9C6049"
                    strokeWidth="0.95"
                    opacity="0.4"
                    strokeLinecap="round"
                  />
                </g>
              )}
            </g>

            {/* Refined Front Hair Contours */}
            {gender === 'female' ? (
              <g>
                <path
                  d="M74,97 C72,55 98,35 132,35 C164,35 188,55 186,97 C178,71 158,55 128,53 C102,53 84,69 74,97 Z"
                  fill="url(#refinedHairFemale)"
                />
                <path
                  d="M116,43 C94,53 80,75 76,107 C84,83 100,65 122,53 Z"
                  fill="#23120B"
                />
                <path
                  d="M134,43 C156,53 174,75 182,105 C172,81 156,63 132,53 Z"
                  fill="#23120B"
                />
                <path
                  d="M93,60 Q130,45 167,60"
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              <g>
                <path
                  d="M76,91 C74,51 98,31 130,31 C162,31 186,51 184,91 C178,65 158,49 130,49 C102,49 82,65 76,91 Z"
                  fill="url(#refinedHairMale)"
                />
                <path
                  d="M102,41 C122,35 152,41 174,63 C154,49 126,45 102,51 Z"
                  fill="#334155"
                  opacity="0.5"
                />
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Subtle Bottom Audio Activity Bar (No Clipped Text Badges) */}
      <div className="relative z-20 px-3.5 py-2 bg-gradient-to-t from-slate-950/75 to-transparent flex items-center justify-between text-[11px] font-mono text-slate-300">
        <span className="truncate">
          {isSpeaking
            ? 'Examiner Speaking (British RP)'
            : isListening
            ? 'Listening to Candidate...'
            : 'Cambridge Video Assessment'}
        </span>
        <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
          {[0, 1, 2, 3].map((bar) => (
            <span
              key={bar}
              className={`w-1 rounded-full transition-all duration-150 ${
                isSpeaking
                  ? 'bg-sky-400 h-3'
                  : isListening
                  ? 'bg-emerald-400 h-2.5'
                  : 'bg-slate-600 h-1.5'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
