// Temporary types - will be replaced when new API is connected

export interface LinkSummary {
  url: string;
  title: string;
  summary: string;
  status: 'success' | 'error';
}

export interface ThinkingStep {
  step_number: number;
  step_name: string;
  description: string;
  details: string;
  timestamp: string;
}

export interface LegalAnalysis {
  case_name: string;
  analysis_date: string;
  thinking_steps: ThinkingStep[];
  final_answer: string;
  formatted_analysis?: string;
  references: string[];
  link_summaries: LinkSummary[];
  total_steps: number;
  processing_time: number;
}