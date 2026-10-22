import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  showCloseButton?: boolean;
  ariaLabel?: string;
  closeOnBackdrop?: boolean;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl'
};

/**
 * ResponsiveModal
 * 
 * Production-grade, mobile-viewport-safe modal container:
 * - Restrained translucent backdrop (no excessive dark tint, no heavy blur)
 * - Safe z-index layering (z-60) ensuring bottom navigation (z-30) cannot intercept touches
 * - Scroll locking on body with restored scroll position
 * - Dynamic viewport height boundary (max-h-[88vh] & max-h-[88dvh])
 * - Independent scrollable content container
 * - Pinned accessible header and sticky/pinned action footer
 * - Touch target compliant close button (>=44x44px)
 * - Escape key dismissal and click-outside handling
 */
export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'md',
  showCloseButton = true,
  ariaLabel,
  closeOnBackdrop = true
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Scroll lock & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-60 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in select-none"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : ariaLabel || 'Dialog'}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full ${maxWidthMap[maxWidth]} shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col max-h-[88vh] max-h-[88dvh] relative my-auto animate-fade-in text-slate-900 dark:text-slate-100 overflow-hidden`}
      >
        {/* Pinned Modal Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/95 dark:bg-slate-900/95 z-10">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="min-w-[44px] min-h-[44px] rounded-full hover:bg-slate-100 active:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 min-h-0 overscroll-contain">
          {children}
        </div>

        {/* Pinned Sticky Footer Actions */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/50 shrink-0 z-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
