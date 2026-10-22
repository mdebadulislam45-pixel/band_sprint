import React from 'react';
import { StudyPlanPage } from './pages/StudyPlanPage';

interface StudyPlanProps {
  onShowToast: (msg: string) => void;
  onBack?: () => void;
  onNavigateToModule?: (module: string) => void;
}

export const StudyPlan: React.FC<StudyPlanProps> = ({
  onShowToast,
  onBack = () => {},
  onNavigateToModule = () => {}
}) => {
  return (
    <StudyPlanPage
      onBack={onBack}
      onNavigateToModule={onNavigateToModule}
      onShowToast={onShowToast}
    />
  );
};
