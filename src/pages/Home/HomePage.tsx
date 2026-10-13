import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import sunflowerMorning from '../../assets/images/sunflower_garden_morning_user.png';
import sunflowerNight from '../../assets/images/sunflower_garden_night_1791540711934.jpg';

export const HomePage: React.FC = () => {
  const { userName } = useApp();
  const hour = new Date().getHours();
  const isMorning = hour >= 6 && hour < 18;
  const heroImage = isMorning ? sunflowerMorning : sunflowerNight;
  const greeting = useMemo(() => {
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    if (hour >= 18 && hour < 22) return 'Good evening';
    return 'Still up';
  }, [hour]);

  return (
    <section
      aria-label="Welcome to Bob"
      className="relative isolate flex min-h-full w-full items-center justify-center overflow-hidden bg-[#17130d] text-white"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 ${isMorning
          ? 'bg-gradient-to-b from-black/25 via-black/20 to-black/65'
          : 'bg-gradient-to-b from-black/35 via-black/25 to-black/70'}`}
      />
      <div className="mx-auto w-full max-w-4xl px-6 py-20 text-center sm:px-10">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-white/75">
          Your companion, always here
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight drop-shadow-lg sm:text-6xl lg:text-7xl">
          {greeting}{userName?.trim() ? `, ${userName.trim()}` : ''}.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
          {isMorning
            ? 'Take a breath. Let’s see where your curiosity takes you today.'
            : 'The day can slow down now. I’m here whenever you want to talk.'}
        </p>
      </div>
      <div className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-[11px] tracking-wide text-white/65">
        A little space to think
      </div>
    </section>
  );
};
