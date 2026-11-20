import React from 'react';
import { MapPin, Check, Compass, Layers, GitCommit, ArrowRight, CornerDownRight } from 'lucide-react';

interface InteractiveMapProps {
  currentAnswer: string;
  onSelectPin: (letter: string) => void;
  disabled?: boolean;
}

export const CDIELTSSVGMap: React.FC<InteractiveMapProps> = ({
  currentAnswer,
  onSelectPin,
  disabled
}) => {
  const pins = [
    { letter: 'A', name: 'Adjacent to Dining Hall', x: 120, y: 70 },
    { letter: 'B', name: 'Opposite Clock Tower', x: 280, y: 70 },
    { letter: 'C', name: 'Behind North Auditorium (North Path)', x: 380, y: 150 },
    { letter: 'D', name: 'Central Library Lawn', x: 190, y: 190 },
    { letter: 'E', name: 'South Gate Car Park', x: 80, y: 220 }
  ];

  return (
    <div className="border-2 border-slate-400 bg-[#F8FAFC] p-3 space-y-2 font-mono text-xs select-none">
      <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 text-[11px] font-bold text-[#002F6C]">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-blue-700" />
          <span>CAMBRIDGE UNIVERSITY CAMPUS PLAN · SECTION 2</span>
        </div>
        <span className="text-slate-500">[Click Map Pin A–E to Select Answer]</span>
      </div>

      <div className="relative w-full max-w-[500px] mx-auto bg-slate-100 border border-slate-300 shadow-inner rounded-none overflow-hidden">
        <svg
          viewBox="0 0 500 280"
          className="w-full h-auto cursor-pointer"
          style={{ maxHeight: '240px' }}
        >
          {/* Background Grid & Pathways */}
          <rect width="500" height="280" fill="#F1F5F9" />
          <path d="M 0 140 Q 250 120 500 140" stroke="#CBD5E1" strokeWidth="16" fill="none" />
          <path d="M 250 0 L 250 280" stroke="#CBD5E1" strokeWidth="14" fill="none" />

          {/* Campus Landmarks */}
          {/* Main Dining Hall */}
          <rect x="50" y="30" width="100" height="50" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
          <text x="100" y="58" fontSize="10" textAnchor="middle" fill="#475569" fontWeight="bold">Main Dining Hall</text>

          {/* Clock Tower */}
          <circle cx="210" cy="55" r="18" fill="#FDE68A" stroke="#CA8A04" strokeWidth="2" />
          <text x="210" y="58" fontSize="9" textAnchor="middle" fill="#78350F" fontWeight="bold">Clock</text>

          {/* Central Library */}
          <rect x="140" y="145" width="100" height="60" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
          <text x="190" y="178" fontSize="10" textAnchor="middle" fill="#475569" fontWeight="bold">Central Library</text>

          {/* North Auditorium */}
          <rect x="320" y="60" width="120" height="65" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
          <text x="380" y="96" fontSize="10" textAnchor="middle" fill="#475569" fontWeight="bold">North Auditorium</text>

          {/* Pedestrian Gravel Path North */}
          <path d="M 250 140 Q 320 140 380 150" stroke="#A1A1AA" strokeWidth="6" strokeDasharray="4 3" fill="none" />
          <text x="310" y="132" fontSize="8" fill="#52525B" fontStyle="italic">Gravel Path (North)</text>

          {/* Compass Rose */}
          <g transform="translate(460, 35)">
            <circle cx="0" cy="0" r="14" fill="white" stroke="#64748B" strokeWidth="1" />
            <path d="M 0 -11 L 3 0 L 0 -3 L -3 0 Z" fill="#DC2626" />
            <path d="M 0 11 L 3 0 L 0 3 L -3 0 Z" fill="#64748B" />
            <text x="0" y="-13" fontSize="8" textAnchor="middle" fontWeight="bold" fill="#DC2626">N</text>
          </g>

          {/* Interactive Pins A, B, C, D, E */}
          {pins.map((pin) => {
            const isSelected = currentAnswer.toUpperCase() === pin.letter;
            return (
              <g
                key={pin.letter}
                transform={`translate(${pin.x}, ${pin.y})`}
                onClick={() => !disabled && onSelectPin(pin.letter)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                <circle
                  cx="0"
                  cy="0"
                  r="14"
                  fill={isSelected ? '#002F6C' : '#FFFFFF'}
                  stroke={isSelected ? '#001F4D' : '#DC2626'}
                  strokeWidth="3"
                />
                <text
                  x="0"
                  y="4"
                  fontSize="12"
                  textAnchor="middle"
                  fontWeight="black"
                  fill={isSelected ? '#FFFFFF' : '#DC2626'}
                  fontFamily="monospace"
                >
                  {pin.letter}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Pin Selection Buttons for accessibility & quick clicking */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
        {pins.map((pin) => {
          const isSelected = currentAnswer.toUpperCase() === pin.letter;
          return (
            <button
              key={pin.letter}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPin(pin.letter)}
              className={`p-1.5 border-2 text-[11px] font-bold flex items-center justify-between cursor-pointer rounded-none ${
                isSelected
                  ? 'bg-[#002F6C] text-white border-[#001F4D]'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
              }`}
            >
              <span>PIN [{pin.letter}]</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface MatchingHeadingsProps {
  currentAnswer: string;
  onSelectHeading: (roman: string) => void;
  disabled?: boolean;
}

export const CDIELTSMatchingHeadingsPicker: React.FC<MatchingHeadingsProps> = ({
  currentAnswer,
  onSelectHeading,
  disabled
}) => {
  const headings = [
    { roman: 'i', text: 'Cognitive reserve and resistance against neurodegeneration' },
    { roman: 'ii', text: 'Reversal of outdated deficit hypotheses through neuroimaging' },
    { roman: 'iii', text: 'Executive control network and bilingual mental gymnastics' },
    { roman: 'iv', text: 'Adult neuroplasticity and hippocampal structural expansions' },
    { roman: 'v', text: 'Monolingual educational interventions and early childhood policy' }
  ];

  return (
    <div className="border-2 border-slate-400 bg-white p-3 space-y-2 font-mono text-xs select-none">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#002F6C] border-b border-slate-300 pb-1.5">
        <Layers className="w-3.5 h-3.5 text-blue-700" />
        <span>SELECT MATCHING HEADING (LIST OF HEADINGS i–v):</span>
      </div>

      <div className="space-y-1.5">
        {headings.map((h) => {
          const isSelected = currentAnswer.toLowerCase() === h.roman.toLowerCase();
          return (
            <div
              key={h.roman}
              onClick={() => !disabled && onSelectHeading(h.roman)}
              className={`p-2.5 border-2 flex items-start gap-2.5 cursor-pointer rounded-none transition-none ${
                isSelected
                  ? 'bg-[#002F6C] text-white border-[#001F4D]'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              <span className={`px-1.5 py-0.5 font-bold font-mono text-xs border ${isSelected ? 'border-white bg-white/20' : 'border-slate-400 bg-white'} shrink-0`}>
                {h.roman}
              </span>
              <span className="text-xs font-sans leading-tight flex-1">
                {h.text}
              </span>
              {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
