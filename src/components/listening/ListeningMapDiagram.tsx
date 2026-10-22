import React from 'react';
import { MapPin } from 'lucide-react';

interface ListeningMapDiagramProps {
  topic?: string;
}

export const ListeningMapDiagram: React.FC<ListeningMapDiagramProps> = React.memo(({ topic = '' }) => {
  const topicLower = topic.toLowerCase();

  // 1. Highfield Zoological Park & Sanctuary Guide
  if (topicLower.includes('zoological') || topicLower.includes('highfield')) {
    return (
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-indigo-600" />
          <span>Reference Blueprint: Highfield Zoological Park & Sanctuary Layout</span>
        </div>
        <svg viewBox="0 0 500 240" className="w-full h-auto rounded-xl bg-slate-100 border border-slate-200">
          {/* Central Lake & Stream */}
          <ellipse cx="250" cy="125" rx="48" ry="30" fill="#93c5fd" stroke="#60a5fa" strokeWidth="2" />
          <text x="223" y="128" fill="#1e3a8a" fontSize="8" fontWeight="bold">CENTRAL LAKE</text>

          {/* Main Entrance Gates (South) */}
          <rect x="205" y="212" width="90" height="20" fill="#1e293b" rx="4" />
          <text x="216" y="225" fill="#ffffff" fontSize="8" fontWeight="bold">MAIN ENTRANCE</text>

          {/* Paths */}
          <path d="M 250,212 L 250,155" stroke="#cbd5e1" strokeWidth="14" fill="none" />
          <path d="M 250,95 L 250,35" stroke="#cbd5e1" strokeWidth="12" fill="none" />
          <path d="M 202,125 L 95,125" stroke="#cbd5e1" strokeWidth="12" fill="none" />
          <path d="M 298,125 L 400,125" stroke="#b45309" strokeWidth="10" strokeDasharray="4 2" fill="none" />
          <text x="310" y="115" fill="#78350f" fontSize="7" fontWeight="bold">SUSPENSION BRIDGE</text>

          {/* Gift Kiosk */}
          <rect x="265" y="172" width="52" height="22" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.2" rx="3" />
          <text x="272" y="186" fill="#334155" fontSize="7" fontWeight="bold">Gift Kiosk</text>

          {/* Observation Tower */}
          <rect x="224" y="62" width="52" height="22" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.2" rx="3" />
          <text x="229" y="76" fill="#334155" fontSize="7" fontWeight="bold">Obs. Tower</text>

          {/* Position A: Left of main entrance boulevard */}
          <rect x="125" y="158" width="56" height="32" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.5" rx="4" />
          <circle cx="153" cy="174" r="9" fill="#4338ca" />
          <text x="150" y="178" fill="#ffffff" fontSize="10" fontWeight="bold">A</text>
          <text x="122" y="202" fill="#475569" fontSize="8">West Boulevard</text>

          {/* Position B: East across suspension bridge */}
          <rect x="395" y="106" width="65" height="38" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" rx="4" />
          <circle cx="427" cy="125" r="9" fill="#b45309" />
          <text x="424" y="129" fill="#ffffff" fontSize="10" fontWeight="bold">B</text>
          <text x="398" y="156" fill="#475569" fontSize="8">Eastern Ridge</text>

          {/* Position C: North past observation tower */}
          <rect x="220" y="14" width="60" height="30" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" rx="4" />
          <circle cx="250" cy="29" r="9" fill="#15803d" />
          <text x="247" y="33" fill="#ffffff" fontSize="10" fontWeight="bold">C</text>
          <text x="290" y="32" fill="#475569" fontSize="8">North Ridge</text>

          {/* Position D: Far western woodland perimeter */}
          <rect x="35" y="106" width="60" height="38" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" rx="4" />
          <circle cx="65" cy="125" r="9" fill="#dc2626" />
          <text x="62" y="129" fill="#ffffff" fontSize="10" fontWeight="bold">D</text>
          <text x="35" y="156" fill="#475569" fontSize="8">West Woodland</text>
        </svg>
      </div>
    );
  }

  // 2. Bramble Hill Nature Reserve Trails
  if (topicLower.includes('bramble hill') || topicLower.includes('nature reserve')) {
    return (
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-indigo-600" />
          <span>Reference Blueprint: Bramble Hill Nature Reserve Visitor Trails</span>
        </div>
        <svg viewBox="0 0 500 240" className="w-full h-auto rounded-xl bg-slate-100 border border-slate-200">
          {/* Freshwater Wetland & Stream */}
          <ellipse cx="135" cy="48" rx="65" ry="26" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="92" y="51" fill="#1e3a8a" fontSize="8" fontWeight="bold">REEDBED WETLAND</text>
          <path d="M 200,52 Q 290,95 360,120" stroke="#60a5fa" strokeWidth="10" fill="none" />

          {/* Car Park (South-West) */}
          <rect x="95" y="195" width="80" height="26" fill="#334155" rx="4" />
          <text x="112" y="211" fill="#ffffff" fontSize="8" fontWeight="bold">CAR PARK</text>

          {/* Boardwalk & Trails */}
          <path d="M 135,195 L 135,74" stroke="#b45309" strokeWidth="10" strokeDasharray="4 2" fill="none" />
          <text x="58" y="135" fill="#78350f" fontSize="7" fontWeight="bold">BOARDWALK</text>
          <path d="M 135,145 L 255,180 L 355,120 L 435,55" stroke="#cbd5e1" strokeWidth="12" fill="none" />

          {/* Position A: North shore of wetland via boardwalk */}
          <circle cx="135" cy="82" r="10" fill="#4338ca" />
          <text x="132" y="86" fill="#ffffff" fontSize="10" fontWeight="bold">A</text>

          {/* Position B: Southeast branch from trail fork */}
          <rect x="225" y="162" width="60" height="34" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" rx="4" />
          <circle cx="255" cy="179" r="9" fill="#b45309" />
          <text x="252" y="183" fill="#ffffff" fontSize="10" fontWeight="bold">B</text>
          <text x="222" y="208" fill="#475569" fontSize="8">SE Trail Fork</text>

          {/* Position C: Eastern stream crossroads */}
          <rect x="328" y="102" width="56" height="34" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" rx="4" />
          <circle cx="356" cy="119" r="9" fill="#15803d" />
          <text x="353" y="123" fill="#ffffff" fontSize="10" fontWeight="bold">C</text>
          <text x="322" y="148" fill="#475569" fontSize="8">Stream Crossroads</text>

          {/* Position D: Steep chalk ridge summit */}
          <rect x="405" y="32" width="60" height="34" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" rx="4" />
          <circle cx="435" cy="49" r="9" fill="#dc2626" />
          <text x="432" y="53" fill="#ffffff" fontSize="10" fontWeight="bold">D</text>
          <text x="402" y="78" fill="#475569" fontSize="8">Chalk Ridge</text>
        </svg>
      </div>
    );
  }

  // 3. University Campus Orientation Plan
  if (topicLower.includes('campus') || topicLower.includes('university')) {
    return (
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-indigo-600" />
          <span>Reference Blueprint: University Campus Orientation Plan</span>
        </div>
        <svg viewBox="0 0 500 240" className="w-full h-auto rounded-xl bg-slate-100 border border-slate-200">
          {/* Central Pedestrian Square */}
          <rect x="195" y="95" width="110" height="55" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" rx="6" />
          <text x="212" y="125" fill="#334155" fontSize="8" fontWeight="bold">PEDESTRIAN SQUARE</text>

          {/* Chemistry Labs & Science Quadrangle */}
          <rect x="145" y="25" width="65" height="32" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1.2" rx="3" />
          <text x="152" y="44" fill="#1e3a8a" fontSize="7" fontWeight="bold">Chemistry Labs</text>

          <rect x="330" y="80" width="70" height="50" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1.2" rx="3" />
          <text x="340" y="108" fill="#1e3a8a" fontSize="7" fontWeight="bold">Science Quad</text>

          {/* Sports Pavilion (South) */}
          <rect x="295" y="190" width="80" height="28" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.2" rx="3" />
          <text x="306" y="207" fill="#14532d" fontSize="7" fontWeight="bold">Sports Pavilion</text>

          {/* Position A: Western Gate Entrance across from Bicycle Racks */}
          <rect x="42" y="96" width="58" height="36" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.5" rx="4" />
          <circle cx="71" cy="114" r="9" fill="#4338ca" />
          <text x="68" y="118" fill="#ffffff" fontSize="10" fontWeight="bold">A</text>
          <text x="38" y="145" fill="#475569" fontSize="8">West Gate / Bikes</text>

          {/* Position B: North of Pedestrian Square */}
          <rect x="222" y="25" width="56" height="34" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" rx="4" />
          <circle cx="250" cy="42" r="9" fill="#b45309" />
          <text x="247" y="46" fill="#ffffff" fontSize="10" fontWeight="bold">B</text>
          <text x="224" y="70" fill="#475569" fontSize="8">North Plaza</text>

          {/* Position C: Red-Brick Admin Wing facing Sports Pavilion */}
          <rect x="195" y="182" width="60" height="34" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" rx="4" />
          <circle cx="225" cy="199" r="9" fill="#15803d" />
          <text x="222" y="203" fill="#ffffff" fontSize="10" fontWeight="bold">C</text>
          <text x="196" y="228" fill="#475569" fontSize="8">Admin Wing</text>

          {/* Position D: Behind Science Quadrangle on Eastern Perimeter */}
          <rect x="420" y="88" width="55" height="36" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" rx="4" />
          <circle cx="447" cy="106" r="9" fill="#dc2626" />
          <text x="444" y="110" fill="#ffffff" fontSize="10" fontWeight="bold">D</text>
          <text x="418" y="136" fill="#475569" fontSize="8">East Perimeter</text>
        </svg>
      </div>
    );
  }

  // 4. Default / Historic Avonford Town Tour Map
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 overflow-hidden">
      <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
        <MapPin className="w-4 h-4 text-indigo-600" />
        <span>Reference Blueprint: {topic || 'Avonford Historic Town Center & Trail'}</span>
      </div>
      <svg viewBox="0 0 500 240" className="w-full h-auto rounded-xl bg-slate-100 border border-slate-200">
        {/* River */}
        <path d="M 50,0 Q 80,120 40,240" stroke="#93c5fd" strokeWidth="28" fill="none" />
        <text x="30" y="120" fill="#1e40af" fontSize="9" fontWeight="bold" transform="rotate(-75 30 120)">
          RIVER AVON
        </text>
        {/* Bridge */}
        <rect x="25" y="160" width="55" height="18" fill="#64748b" rx="3" />
        <text x="28" y="172" fill="#ffffff" fontSize="7" fontWeight="bold">STONE BRIDGE</text>
        {/* Roads */}
        <path d="M 80,169 L 200,169 L 200,120" stroke="#cbd5e1" strokeWidth="18" fill="none" />
        <path d="M 200,120 L 200,20" stroke="#cbd5e1" strokeWidth="18" fill="none" />
        <path d="M 200,120 L 380,120" stroke="#cbd5e1" strokeWidth="16" fill="none" />
        {/* Roundabout */}
        <circle cx="200" cy="120" r="20" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
        {/* Pins */}
        <rect x="120" y="30" width="45" height="25" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.5" rx="3" />
        <circle cx="142" cy="42" r="8" fill="#4338ca" />
        <text x="139" y="46" fill="#ffffff" fontSize="9" fontWeight="bold">A</text>
        <text x="110" y="70" fill="#475569" fontSize="8">Town Hall Rear</text>

        <rect x="230" y="30" width="45" height="25" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" rx="3" />
        <circle cx="252" cy="42" r="8" fill="#b45309" />
        <text x="249" y="46" fill="#ffffff" fontSize="9" fontWeight="bold">B</text>
        <text x="225" y="70" fill="#475569" fontSize="8">Opposite Fountain</text>

        <rect x="300" y="150" width="80" height="60" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" rx="6" />
        <text x="320" y="180" fill="#15803d" fontSize="9" fontWeight="bold">GREEN PARK</text>
        <circle cx="280" cy="180" r="8" fill="#16a34a" />
        <text x="277" y="184" fill="#ffffff" fontSize="9" fontWeight="bold">C</text>

        <rect x="220" y="150" width="40" height="25" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" rx="3" />
        <circle cx="240" cy="162" r="8" fill="#dc2626" />
        <text x="237" y="166" fill="#ffffff" fontSize="9" fontWeight="bold">D</text>
      </svg>
    </div>
  );
});
