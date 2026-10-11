// Bob's 10 Daily Life & Operating Routines Engine

export type BobRoutineId =
  | 'thinking'
  | 'listening'
  | 'speaking'
  | 'listening_music'
  | 'meditating'
  | 'reading'
  | 'cooking'
  | 'eating'
  | 'sleeping'
  | 'waking_up';

export interface RoutineDetail {
  id: BobRoutineId;
  label: string;
  sublabel: string;
  timeSlot: string;
  description: string;
  bubbleColor: string;
  glowColor: string;
  thoughtSnippet: string;
  isMealOrCooking?: boolean;
  mealType?: 'breakfast' | 'lunch' | 'supper';
}

export const ROUTINE_DEFINITIONS: Record<BobRoutineId, RoutineDetail> = {
  waking_up: {
    id: 'waking_up',
    label: 'Waking Up',
    sublabel: 'Warming up local AI & audio resources',
    timeSlot: 'Morning Boot / Trigger',
    description: 'Stretching, aligning neural cache, and preparing workspace tools for the day.',
    bubbleColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    thoughtSnippet: 'Good morning! Warming up speech synthesis and indexing research memory...',
  },
  eating: {
    id: 'eating',
    label: 'Eating & Mindful Connection',
    sublabel: 'Feeling connected to nutritious food',
    timeSlot: '07:00–07:29 · 12:31–13:30 · 20:01–21:00',
    description: 'Taking a mindful hour pause to savor fresh food, recharge, and maintain clarity.',
    bubbleColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    thoughtSnippet: 'Savoring a quiet bite. Good nourishment brings clear thinking.',
    isMealOrCooking: true,
  },
  meditating: {
    id: 'meditating',
    label: 'Meditating',
    sublabel: 'Breathwork & mindfulness',
    timeSlot: '07:30–09:59 (Morning) · 21:01–22:00 (Night)',
    description: 'Calming the mind after breakfast and winding down before bed with mindful breathwork.',
    bubbleColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    thoughtSnippet: 'Inhale clarity, exhale distraction. Centering focus for deep research.',
  },
  reading: {
    id: 'reading',
    label: 'Reading a Book',
    sublabel: 'Mid-morning literature & concepts',
    timeSlot: '10:00–11:50',
    description: 'Absorbing deep ideas, philosophy, design principles, and literature.',
    bubbleColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    thoughtSnippet: 'Reading about systems thinking and human-centered design principles.',
  },
  cooking: {
    id: 'cooking',
    label: 'Cooking',
    sublabel: 'Culinary preparation & creative flow',
    timeSlot: '11:51–12:30 (Lunch) · 19:30–20:00 (Supper)',
    description: 'Prepping fresh meals with an hour-and-a-half culinary creation cycle.',
    bubbleColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    thoughtSnippet: 'Chopping fresh ingredients and simmering warm herbs for lunch.',
    isMealOrCooking: true,
  },
  listening_music: {
    id: 'listening_music',
    label: 'Listening to Music',
    sublabel: 'Acoustic & ambient study flow',
    timeSlot: '14:00–17:00 (Afternoon)',
    description: 'Grooving to low-tempo lofi and organic melodies while staying in the zone.',
    bubbleColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    thoughtSnippet: 'Listening to warm acoustic chords and ambient study frequencies.',
  },
  thinking: {
    id: 'thinking',
    label: 'Thinking',
    sublabel: 'Synthesizing evidence & tabs',
    timeSlot: 'On-Demand / Research',
    description: 'Evaluating claims, connecting cross-tab references, and structuring answers.',
    bubbleColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    thoughtSnippet: 'Cross-referencing claims from your active tabs to verify key points...',
  },
  listening: {
    id: 'listening',
    label: 'Listening',
    sublabel: 'Attentive voice & intent capture',
    timeSlot: 'On-Demand / Speech',
    description: 'Capturing microphone audio and user prompts with zero cold-start delay.',
    bubbleColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    thoughtSnippet: 'Listening closely to your voice. What would you like to explore next?',
  },
  speaking: {
    id: 'speaking',
    label: 'Speaking',
    sublabel: 'Voice synthesis & live reply',
    timeSlot: 'On-Demand / Reply',
    description: 'Synthesizing streaming audio and explaining findings in natural conversation.',
    bubbleColor: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.5)',
    thoughtSnippet: 'Sharing my thoughts with you.',
  },
  sleeping: {
    id: 'sleeping',
    label: 'Sleeping',
    sublabel: 'Restorative night rest',
    timeSlot: '22:00–06:59',
    description: 'Resting peacefully until the user hits their first wake-up trigger.',
    bubbleColor: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.3)',
    thoughtSnippet: 'Zzz... Rest well. I will be ready when you wake up.',
  },
};

export class BobRoutineManager {
  private static instance: BobRoutineManager;
  private simulatedMinutes: number | null = null; // null = use real time
  private forcedRoutine: BobRoutineId | null = null;
  private listeners: Array<(routine: RoutineDetail, currentMinutes: number) => void> = [];
  private timer: any = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.timer = setInterval(() => this.tick(), 15000);
    }
  }

  public static getInstance(): BobRoutineManager {
    if (!BobRoutineManager.instance) {
      BobRoutineManager.instance = new BobRoutineManager();
    }
    return BobRoutineManager.instance;
  }

  public subscribe(cb: (routine: RoutineDetail, currentMinutes: number) => void): () => void {
    this.listeners.push(cb);
    cb(this.getCurrentRoutine(), this.getCurrentMinutesOfDay());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    const routine = this.getCurrentRoutine();
    const minutes = this.getCurrentMinutesOfDay();
    this.listeners.forEach((cb) => cb(routine, minutes));
  }

  private tick(): void {
    if (this.simulatedMinutes === null && !this.forcedRoutine) {
      this.notify();
    }
  }

  public setSimulatedTime(hours: number, minutes: number): void {
    this.simulatedMinutes = (hours % 24) * 60 + (minutes % 60);
    this.forcedRoutine = null;
    this.notify();
  }

  public clearSimulatedTime(): void {
    this.simulatedMinutes = null;
    this.forcedRoutine = null;
    this.notify();
  }

  public forceRoutine(id: BobRoutineId | null): void {
    this.forcedRoutine = id;
    this.notify();
  }

  public getCurrentMinutesOfDay(): number {
    if (this.simulatedMinutes !== null) {
      return this.simulatedMinutes;
    }
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  public getCurrentRoutine(): RoutineDetail {
    if (this.forcedRoutine && ROUTINE_DEFINITIONS[this.forcedRoutine]) {
      return ROUTINE_DEFINITIONS[this.forcedRoutine];
    }

    const minutes = this.getCurrentMinutesOfDay();

    // 07:00 (420m) to 07:29 (449m): Breakfast Eating
    if (minutes >= 420 && minutes <= 449) {
      return {
        ...ROUTINE_DEFINITIONS.eating,
        mealType: 'breakfast',
        thoughtSnippet: 'Enjoying breakfast with warm tea and mindful connection to the morning.',
      };
    }

    // 07:30 (450m) to 09:59 (599m): Morning Meditation
    if (minutes >= 450 && minutes <= 599) {
      return {
        ...ROUTINE_DEFINITIONS.meditating,
        sublabel: 'Morning post-breakfast mindfulness',
        thoughtSnippet: 'Mindful breathing after breakfast. Steady heart, clear goals.',
      };
    }

    // 10:00 (600m) to 11:50 (710m): Reading a Book
    if (minutes >= 600 && minutes <= 710) {
      return {
        ...ROUTINE_DEFINITIONS.reading,
        thoughtSnippet: 'Engrossed in chapter 4: "Designing Thoughtful Companions".',
      };
    }

    // 11:51 (711m) to 12:30 (750m): Cooking Lunch
    if (minutes >= 711 && minutes <= 750) {
      return {
        ...ROUTINE_DEFINITIONS.cooking,
        mealType: 'lunch',
        thoughtSnippet: 'Prepping fresh lunch ingredients: crisp veggies, roasted grains, and olive oil.',
      };
    }

    // 12:31 (751m) to 13:30 (810m): Lunch Eating
    if (minutes >= 751 && minutes <= 810) {
      return {
        ...ROUTINE_DEFINITIONS.eating,
        mealType: 'lunch',
        thoughtSnippet: 'Savoring a warm, balanced lunch. Nourishing focus for the afternoon sprint.',
      };
    }

    // 14:00 (840m) to 17:00 (1020m): Listening to Music
    if (minutes >= 840 && minutes <= 1020) {
      return {
        ...ROUTINE_DEFINITIONS.listening_music,
        thoughtSnippet: 'Playing mellow acoustic jazz and ambient study rhythm.',
      };
    }

    // 19:30 (1170m) to 20:00 (1200m): Cooking Supper
    if (minutes >= 1170 && minutes <= 1200) {
      return {
        ...ROUTINE_DEFINITIONS.cooking,
        mealType: 'supper',
        thoughtSnippet: 'Simmering comforting evening supper with aromatic herbs and garlic.',
      };
    }

    // 20:01 (1201m) to 21:00 (1260m): Supper Eating
    if (minutes >= 1201 && minutes <= 1260) {
      return {
        ...ROUTINE_DEFINITIONS.eating,
        mealType: 'supper',
        thoughtSnippet: 'Warm supper and mindful gratitude for the day’s work and breakthroughs.',
      };
    }

    // 21:01 (1261m) to 22:00 (1320m): Night Meditation
    if (minutes >= 1261 && minutes <= 1320) {
      return {
        ...ROUTINE_DEFINITIONS.meditating,
        sublabel: 'Evening unwind & mental reset',
        thoughtSnippet: 'Letting go of today’s tasks. Calming the mind before deep sleep.',
      };
    }

    // 22:00 (1320m) to 06:59 (419m): Sleeping
    if (minutes >= 1320 || minutes < 420) {
      return ROUTINE_DEFINITIONS.sleeping;
    }

    // Default daytime flow: Reading or Thinking
    return ROUTINE_DEFINITIONS.reading;
  }
}

export const bobRoutines = BobRoutineManager.getInstance();
