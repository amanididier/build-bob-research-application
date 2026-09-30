import bobLogo from '../assets/images/bob-logo.png';

export type OnboardingHeroStyle = 'plate' | 'float';

export interface OnboardingStepMeta {
  id: number;
  eyebrow: string;
  cta: string;
  // Swap a card's artwork by pointing `image` at another import
  // (drop the file in src/assets/onboarding/ and import it above).
  image?: string;
  hero?: OnboardingHeroStyle;
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  { id: 1, eyebrow: 'Welcome', cta: "Let's get started", image: bobLogo, hero: 'plate' },
  { id: 2, eyebrow: 'Step 02', cta: 'Nice to meet you', image: bobLogo, hero: 'plate' },
  { id: 3, eyebrow: 'Step 03', cta: 'Continue', image: bobLogo, hero: 'float' },
  { id: 4, eyebrow: 'Step 04', cta: 'Continue', image: bobLogo, hero: 'float' },
  { id: 5, eyebrow: 'Step 05', cta: 'Continue' },
  { id: 6, eyebrow: 'Step 06', cta: 'Continue', image: bobLogo, hero: 'float' },
  { id: 7, eyebrow: 'Step 07', cta: 'Continue', image: bobLogo, hero: 'float' },
  { id: 8, eyebrow: 'Setup complete', cta: 'Finish', image: bobLogo, hero: 'float' }
];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;
