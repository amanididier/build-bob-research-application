import React, { useState, useEffect } from 'react';
import { X, Sparkles, Heart, Check, Plus, Trophy, Flame, Film, Newspaper, Cpu } from 'lucide-react';

interface UserInterestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (interests: string[]) => void;
}

const PRESET_TOPICS = [
  { id: 'football', label: 'Football / Soccer', category: 'sports', icon: Trophy },
  { id: 'basketball', label: 'NBA / Basketball', category: 'sports', icon: Trophy },
  { id: 'f1', label: 'Formula 1', category: 'sports', icon: Trophy },
  { id: 'arsenal', label: 'Arsenal FC', category: 'team', icon: Flame },
  { id: 'realmadrid', label: 'Real Madrid', category: 'team', icon: Flame },
  { id: 'lakers', label: 'LA Lakers', category: 'team', icon: Flame },
  { id: 'tech', label: 'AI & Machine Learning', category: 'news', icon: Cpu },
  { id: 'space', label: 'Space & Astronomy', category: 'news', icon: Sparkles },
  { id: 'cinema', label: 'Cinema & Directing', category: 'celebrity', icon: Film },
  { id: 'indie_music', label: 'Indie & Ambient Music', category: 'culture', icon: Heart },
  { id: 'breaking_news', label: 'World Tech News', category: 'news', icon: Newspaper },
];

export const UserInterestsModal: React.FC<UserInterestsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bob_user_interests');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return ['Football / Soccer', 'Arsenal FC', 'AI & Machine Learning'];
  });

  const [customInput, setCustomInput] = useState('');

  if (!isOpen) return null;

  const toggleInterest = (label: string) => {
    setSelectedInterests((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInput.trim();
    if (!clean) return;
    if (!selectedInterests.includes(clean)) {
      setSelectedInterests((prev) => [...prev, clean]);
    }
    setCustomInput('');
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bob_user_interests', JSON.stringify(selectedInterests));
    }
    if (onSave) onSave(selectedInterests);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[var(--s)] border border-[var(--line)] rounded-[24px] shadow-2xl p-6 overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--y)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--y)] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Get to Know You</span>
            </div>
            <h2 className="text-xl font-extrabold text-[var(--t)] tracking-tight">
              What inspires and energizes you?
            </h2>
            <p className="text-xs text-[var(--m)] mt-1">
              Pick your favorite sports, teams, news, and passions so Bob can share tailored banter and updates.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Topic Chips (Interactive Buttons) */}
        <div className="mb-4">
          <div className="text-[11px] font-medium text-[var(--m)] mb-2">Selected Passions ({selectedInterests.length}):</div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
            {selectedInterests.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className="px-2.5 py-1 text-xs rounded-lg font-medium bg-[var(--y)]/20 border border-[var(--y)]/50 text-[var(--t)] flex items-center gap-1.5 hover:bg-[var(--y)]/30 transition-colors"
              >
                <span>{interest}</span>
                <X className="w-3 h-3 text-[var(--m)]" />
              </button>
            ))}
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mb-4">
          <div className="text-[11px] font-medium text-[var(--m)] mb-2">Recommended Suggestions:</div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {PRESET_TOPICS.map((topic) => {
              const isSelected = selectedInterests.includes(topic.label);
              const Icon = topic.icon;
              return (
                <button
                  key={topic.id}
                  onClick={() => toggleInterest(topic.label)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-[var(--y)] bg-[var(--y)]/10 text-[var(--t)] font-semibold'
                      : 'border-[var(--line)] bg-[var(--s2)]/40 hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--y)]" />
                    <span className="truncate">{topic.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--y)] shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Input */}
        <form onSubmit={handleAddCustom} className="mb-6 flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type custom sport, team, or hobby (e.g., Chelsea FC, Formula E)..."
            className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[var(--t)] placeholder:text-[var(--m)] focus:outline-none focus:border-[var(--y)]"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-[var(--s2)] hover:bg-[var(--line)] text-[var(--t)] text-xs font-semibold flex items-center gap-1 border border-[var(--line)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[var(--m)] hover:text-[var(--t)] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] rounded-xl shadow-sm transition-all"
          >
            Save Interests & Socialize
          </button>
        </div>
      </div>
    </div>
  );
};
