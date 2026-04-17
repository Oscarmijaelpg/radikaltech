/**
 * Public surface of the First-time Experience module.
 *
 * - FirstDayCard: gamified checklist card for the Dashboard.
 * - WelcomeModal: one-off welcome dialog after onboarding.
 * - FeatureHint: first-visit tooltip wrapper for a feature.
 * - LevelBadge: tiny emoji badge for the sidebar avatar.
 * - useFirstTimeProgress: TanStack hook backed by /stats/onboarding-progress.
 */
export { FirstDayCard, FTE_HIDDEN_KEY } from './FirstDayCard';
export { WelcomeModal, WELCOME_SEEN_KEY } from './WelcomeModal';
export { FeatureHint } from './FeatureHint';
export { LevelBadge } from './LevelBadge';
export { Confetti } from './Confetti';
export { useFirstTimeProgress } from './useFirstTimeProgress';
export { SetupWizard } from './SetupWizard';
export { FIRST_DAY_TASKS, LEVELS, levelForPoints, MAX_POINTS, TOTAL_TASKS } from './tasks';
