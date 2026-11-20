import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CDIELTSColorScheme = 'standard' | 'black-on-yellow' | 'yellow-on-black' | 'white-on-black';
export type CDIELTSZoomLevel = '100%' | '125%' | '150%';

export interface CDIELTSThemeClasses {
  bg: string;
  headerBg: string;
  border: string;
  cardBg: string;
  inputBg: string;
  accentBtn: string;
  contrastBadge: string;
  text: string;
  subtext: string;
}

export interface CDIELTSThemeContextType {
  colorScheme: CDIELTSColorScheme;
  setColorScheme: (scheme: CDIELTSColorScheme) => void;
  zoomLevel: CDIELTSZoomLevel;
  setZoomLevel: (zoom: CDIELTSZoomLevel) => void;
  theme: CDIELTSThemeClasses;
  fontSizeClass: string;
}

const CDIELTSThemeContext = createContext<CDIELTSThemeContextType | undefined>(undefined);

export function getCDIELTSThemeClasses(scheme: CDIELTSColorScheme): CDIELTSThemeClasses {
  switch (scheme) {
    case 'black-on-yellow':
      return {
        bg: 'bg-[#FFF100] text-black',
        headerBg: 'bg-black text-[#FFF100]',
        border: 'border-black',
        cardBg: 'bg-[#FFF888]',
        inputBg: 'bg-white text-black',
        accentBtn: 'bg-black text-[#FFF100] hover:bg-neutral-900',
        contrastBadge: 'bg-black text-[#FFF100] border-black',
        text: 'text-black',
        subtext: 'text-neutral-800'
      };
    case 'yellow-on-black':
      return {
        bg: 'bg-black text-[#FFF100]',
        headerBg: 'bg-[#181818] text-[#FFF100]',
        border: 'border-[#FFF100]',
        cardBg: 'bg-[#111111]',
        inputBg: 'bg-[#222222] text-[#FFF100]',
        accentBtn: 'bg-[#FFF100] text-black hover:bg-yellow-400',
        contrastBadge: 'bg-[#FFF100] text-black border-[#FFF100]',
        text: 'text-[#FFF100]',
        subtext: 'text-yellow-200/80'
      };
    case 'white-on-black':
      return {
        bg: 'bg-black text-white',
        headerBg: 'bg-[#181818] text-white',
        border: 'border-white',
        cardBg: 'bg-[#181818]',
        inputBg: 'bg-[#262626] text-white',
        accentBtn: 'bg-white text-black hover:bg-gray-200',
        contrastBadge: 'bg-white text-black border-white',
        text: 'text-white',
        subtext: 'text-gray-300'
      };
    case 'standard':
    default:
      return {
        bg: 'bg-[#EEF2F6] text-[#0F172A]',
        headerBg: 'bg-[#002F6C] text-white',
        border: 'border-[#CBD5E1]',
        cardBg: 'bg-white',
        inputBg: 'bg-white text-[#0F172A]',
        accentBtn: 'bg-[#002F6C] text-white hover:bg-[#001F4D]',
        contrastBadge: 'bg-[#002F6C] text-white border-[#001F4D]',
        text: 'text-[#0F172A]',
        subtext: 'text-slate-600'
      };
  }
}

export function getCDIELTSFontSizeClass(zoom: CDIELTSZoomLevel): string {
  switch (zoom) {
    case '125%':
      return 'text-lg';
    case '150%':
      return 'text-xl';
    case '100%':
    default:
      return 'text-base';
  }
}

export interface CDIELTSThemeContainerProps {
  children: ReactNode;
  initialColorScheme?: CDIELTSColorScheme;
  initialZoomLevel?: CDIELTSZoomLevel;
  showTopBarControls?: boolean;
  className?: string;
  onThemeChange?: (scheme: CDIELTSColorScheme) => void;
  onZoomChange?: (zoom: CDIELTSZoomLevel) => void;
}

export const CDIELTSThemeContainer: React.FC<CDIELTSThemeContainerProps> = ({
  children,
  initialColorScheme = 'standard',
  initialZoomLevel = '100%',
  showTopBarControls = false,
  className = '',
  onThemeChange,
  onZoomChange
}) => {
  const [colorScheme, setColorSchemeState] = useState<CDIELTSColorScheme>(() => {
    try {
      const saved = localStorage.getItem('cdielts_theme_color');
      if (saved && ['standard', 'black-on-yellow', 'yellow-on-black', 'white-on-black'].includes(saved)) {
        return saved as CDIELTSColorScheme;
      }
    } catch {}
    return initialColorScheme;
  });

  const [zoomLevel, setZoomLevelState] = useState<CDIELTSZoomLevel>(() => {
    try {
      const saved = localStorage.getItem('cdielts_theme_zoom');
      if (saved && ['100%', '125%', '150%'].includes(saved)) {
        return saved as CDIELTSZoomLevel;
      }
    } catch {}
    return initialZoomLevel;
  });

  const setColorScheme = (scheme: CDIELTSColorScheme) => {
    setColorSchemeState(scheme);
    try {
      localStorage.setItem('cdielts_theme_color', scheme);
    } catch {}
    if (onThemeChange) onThemeChange(scheme);
  };

  const setZoomLevel = (zoom: CDIELTSZoomLevel) => {
    setZoomLevelState(zoom);
    try {
      localStorage.setItem('cdielts_theme_zoom', zoom);
    } catch {}
    if (onZoomChange) onZoomChange(zoom);
  };

  const theme = getCDIELTSThemeClasses(colorScheme);
  const fontSizeClass = getCDIELTSFontSizeClass(zoomLevel);

  return (
    <CDIELTSThemeContext.Provider
      value={{
        colorScheme,
        setColorScheme,
        zoomLevel,
        setZoomLevel,
        theme,
        fontSizeClass
      }}
    >
      <div
        className={`w-full min-h-screen ${theme.bg} ${fontSizeClass} font-sans transition-colors duration-150 ${className}`}
      >
        {showTopBarControls && (
          <div className={`w-full px-4 py-2 border-b ${theme.border} ${theme.headerBg} flex items-center justify-between text-xs font-mono`}>
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider">Official CD-IELTS Display Setup</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Font Size Selector */}
              <div className="flex items-center border border-current">
                {(['100%', '125%', '150%'] as CDIELTSZoomLevel[]).map((z) => (
                  <button
                    key={z}
                    onClick={() => setZoomLevel(z)}
                    className={`px-2 py-0.5 font-bold ${
                      zoomLevel === z ? 'bg-sky-600 text-white' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {z === '100%' ? 'Standard (16px)' : z === '125%' ? 'Large (18px)' : 'XL (20px)'}
                  </button>
                ))}
              </div>

              {/* Color Scheme Dropdown */}
              <select
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value as CDIELTSColorScheme)}
                className="bg-black text-white px-2 py-1 border border-gray-600 font-mono font-bold cursor-pointer"
              >
                <option value="standard">Standard Contrast (Off-White)</option>
                <option value="black-on-yellow">High Contrast (Black on Yellow)</option>
                <option value="yellow-on-black">High Contrast (Yellow on Black)</option>
                <option value="white-on-black">High Contrast (White on Black)</option>
              </select>
            </div>
          </div>
        )}
        {children}
      </div>
    </CDIELTSThemeContext.Provider>
  );
};

export function useCDIELTSTheme(): CDIELTSThemeContextType {
  const context = useContext(CDIELTSThemeContext);
  if (!context) {
    // Fallback if rendered outside CDIELTSThemeContainer
    const fallbackTheme = getCDIELTSThemeClasses('standard');
    return {
      colorScheme: 'standard',
      setColorScheme: () => {},
      zoomLevel: '100%',
      setZoomLevel: () => {},
      theme: fallbackTheme,
      fontSizeClass: 'text-base'
    };
  }
  return context;
}
