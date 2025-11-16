

export type User = 'Wissam' | 'Sylvie';

export interface ActionPlan {
  id: string;
  text: string;
  author: User;
  isCompleted: boolean;
  reminderDate?: string;
}

export type NeedStatus = 'shared' | 'discussed';

export interface NeedCard {
  id: string;
  author: User;
  title: string;
  originalAnnoyance: string;
  translatedNeed: string;
  actionPlans: ActionPlan[];
  validation: string;
  timestamp: string;
  status: NeedStatus;
  seenByPartner: boolean;
  authorHasSeenUpdate: boolean;
}

export interface AITranslation {
    validation: string;
    need: string;
}

export interface AnnoyanceDepthAnalysis {
  depth_score: number;
  feedback: string;
  completed_points: string[];
}

export interface AnalysisSection {
  title: string;
  content?: string;
  explanation: string;
  questions?: string[];
}

export interface DeepIntrospectionAnalysis {
  story: AnalysisSection;
  underlyingEmotion: AnalysisSection;
  unmetNeed: AnalysisSection;
  mentalMechanism: AnalysisSection;
  childhoodEcho: AnalysisSection;
  personalPower: AnalysisSection;
}

// FIX: Added the missing ScoreHistoryEntry interface.
export interface ScoreHistoryEntry {
  date: string;
  score: number;
}