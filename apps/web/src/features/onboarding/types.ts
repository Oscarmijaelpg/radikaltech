import type {
  Step1Company,
  Step2Socials,
  Step3Brand,
  Step4Objectives,
} from '@radikal/shared';

export type StepKey =
  | 'welcome'
  | 'company'
  | 'socials'
  | 'brand'
  | 'objectives'
  | 'complete';

export interface OnboardingState {
  currentStep: StepKey;
  company?: Partial<Step1Company>;
  socials?: Partial<Step2Socials>;
  brand?: Partial<Step3Brand>;
  objectives?: Partial<Step4Objectives>;
}

export interface StepDataMap {
  company: Step1Company;
  socials: Step2Socials;
  brand: Step3Brand;
  objectives: Step4Objectives;
}

export type PersistStepKey = keyof StepDataMap;
