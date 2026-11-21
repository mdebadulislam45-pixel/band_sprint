import React from 'react';
import {
  BarnabyReferenceExpression,
  resolveBarnabyExpression
} from '../../config/avatarReferenceRegistry';
import {
  BarnabyDragonAvatar,
  mapMascotMoodToAvatarState
} from './BarnabyDragonAvatar';

export type MascotMood =
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'surprise'
  | 'thinking'
  | 'motivating'
  | 'celebrating';

interface ChubbyMascotAvatarProps {
  mood?: MascotMood;
  expressionOverride?: BarnabyReferenceExpression;
  isSpeaking?: boolean;
  paused?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Barnaby — Unified 2.5D Animated Blue Dragon Companion Wrapper
 *
 * Preserves the ChubbyMascotAvatar export and MascotMood contract for existing callers
 * (ContextualAITutor, AIToolsPage, avatarReferenceRegistry) while delegating rendering
 * to the single unified BarnabyDragonAvatar component.
 */
export const ChubbyMascotAvatar: React.FC<ChubbyMascotAvatarProps> = ({
  mood = 'idle',
  expressionOverride,
  isSpeaking,
  paused = false,
  size = 'md',
  className = ''
}) => {
  const expression: BarnabyReferenceExpression = resolveBarnabyExpression(mood, expressionOverride);
  const speakingActive = typeof isSpeaking === 'boolean' ? isSpeaking : mood === 'speaking';

  const mappedState = (() => {
    if (speakingActive) return 'speaking';
    if (expressionOverride === 'thinking') return 'thinking';
    if (expressionOverride === 'listening') return 'listening';
    if (expressionOverride === 'encouraging') return 'encouraging';
    if (expressionOverride === 'cheerful') return 'celebrating';
    if (expressionOverride === 'excited') return 'greeting';
    return mapMascotMoodToAvatarState(mood, { isSpeaking: speakingActive });
  })();

  return (
    <div
      data-testid="barnaby-companion-avatar"
      data-expression={expression}
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
    >
      <BarnabyDragonAvatar
        state={mappedState}
        isSpeaking={speakingActive}
        paused={paused}
        size={size}
        framed="circle"
      />
    </div>
  );
};
