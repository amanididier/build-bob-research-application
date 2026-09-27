import { create } from 'zustand';
import { UserMemory } from '../lib/memory/types';
import { loadMemory, saveMemory, addImportantFact } from '../lib/memory/memoryManager';

interface MemoryStoreState {
  memory: UserMemory;
  refreshMemory: () => void;
  updateMemory: (updates: Partial<UserMemory>) => Promise<void>;
  addFact: (fact: string) => void;
}

export const useMemoryStore = create<MemoryStoreState>((set) => ({
  memory: loadMemory(),
  refreshMemory: () => {
    set({ memory: loadMemory() });
  },
  updateMemory: async (updates) => {
    const updated = await saveMemory(updates);
    set({ memory: updated });
  },
  addFact: (fact: string) => {
    addImportantFact(fact);
    set({ memory: loadMemory() });
  },
}));
