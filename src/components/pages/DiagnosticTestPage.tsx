import React from 'react';
import { DiagnosticTest } from '../diagnostic/DiagnosticTest';

interface DiagnosticTestPageProps {
  onBack: () => void;
  onNavigate: (path: string) => void;
  onShowToast: (msg: string) => void;
}

export const DiagnosticTestPage: React.FC<DiagnosticTestPageProps> = ({ onBack, onNavigate, onShowToast }) => {
  return (
    <DiagnosticTest
      onBack={onBack}
      onNavigateToPlan={() => onNavigate('/learn/study-plan')}
      onShowToast={onShowToast}
    />
  );
};
