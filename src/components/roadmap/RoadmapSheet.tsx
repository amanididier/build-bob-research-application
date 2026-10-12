import React, { useEffect, useMemo, useState } from 'react';

type Step = {
  kicker: string;
  title: string;
  body: string;
  marks?: string[];
  field?: string;
};

function stepsFor(title: string): Step[] {
  const t = title.toLowerCase();
  if (/cook|recipe|meal|bake|kitchen/.test(t)) {
    return [
      { kicker: 'Why', title: 'What are you actually cooking?', body: 'Name the dish in plain words. A roadmap only helps if the finish line is a plate, not a mood.', marks: ['Chop', 'Heat', 'Taste', 'Plate'] },
      { kicker: 'Done', title: 'How will you know it worked?', body: 'Write the result you can see or taste. Skip adjectives.', field: 'Done looks like' },
      { kicker: 'Bench', title: 'What has to be on the counter?', body: 'List tools you already own. Do not add a gadget you will not use tonight.', marks: ['Knife', 'Pan', 'Board', 'Timer'], field: 'On the counter' },
      { kicker: 'Order', title: 'Do these in this order.', body: 'Prep before heat. Taste before you salt again. Serve while it is still the thing you meant to make.' },
      { kicker: 'First sitting', title: 'What happens in the next 20 minutes?', body: 'One action. Not the whole menu.', field: 'Next 20 minutes' },
    ];
  }
  if (/build|app|code|design|ship|make|desk/.test(t)) {
    return [
      { kicker: 'Why', title: 'What are you building, in one sentence?', body: 'If you cannot say who uses it, the later steps will wander.', marks: ['Sketch', 'Cut', 'Fit', 'Check'] },
      { kicker: 'Done', title: 'What can someone do when this is finished?', body: 'A finished thing has a use, not a feature list.', field: 'Someone can' },
      { kicker: 'Bench', title: 'Tools for this pass only.', body: 'Keep the set small. Extra tools are how a Saturday disappears.', marks: ['Notes', 'Browser', 'Editor', 'Timer'], field: 'I will use' },
      { kicker: 'Order', title: 'Sequence, not a pile of ideas.', body: 'Name it. Make the smallest piece that proves the idea. Only then widen it.' },
      { kicker: 'First sitting', title: 'The next block of work.', body: 'Write the block you can finish without opening a second project.', field: 'This sitting' },
    ];
  }
  return [
    { kicker: 'Why', title: 'What question are you actually answering?', body: 'A research thread without a question becomes a pile of tabs.', marks: ['Ask', 'Read', 'Compare', 'Decide'] },
    { kicker: 'Done', title: 'What would count as an answer?', body: 'A paragraph, a table, or a decision. Pick one.', field: 'An answer is' },
    { kicker: 'Bench', title: 'Sources you will trust this time.', body: 'Name two or three. More than that and you are collecting, not reading.', field: 'I will read' },
    { kicker: 'Order', title: 'Read, then compare, then decide.', body: 'Do not write the conclusion while the first source is still open.' },
    { kicker: 'First sitting', title: 'Open one source and take one note.', body: 'That is the whole first sitting.', field: 'First source' },
  ];
}

export const RoadmapSheet: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [named, setNamed] = useState(false);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setNamed(false);
      setPage(0);
      setTitle('');
      setAnswers({});
    };
    window.addEventListener('bob-open-roadmap', onOpen);
    return () => window.removeEventListener('bob-open-roadmap', onOpen);
  }, []);

  const steps = useMemo(() => stepsFor(title || 'research'), [title]);
  if (!open) return null;
  const step = steps[page];
  const last = page === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-[460px] max-h-[90vh] overflow-y-auto bg-white text-[#171717] rounded-[28px] shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => (page > 0 ? setPage(page - 1) : setOpen(false))} className="text-[13px] text-[#777] cursor-pointer">Back</button>
          <div className="flex-1 h-1 rounded-full bg-[#eee] overflow-hidden">
            <div className="h-full bg-[#171717]" style={{ width: named ? `${((page + 1) / steps.length) * 100}%` : '8%' }} />
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-[13px] text-[#777] cursor-pointer">Close</button>
        </div>

        {!named ? (
          <>
            <p className="text-[11px] tracking-[0.14em] uppercase text-[#8a8175] font-semibold m-0">Roadmap</p>
            <h2 className="text-[28px] leading-tight tracking-[-0.03em] font-extrabold mt-2 mb-2">Name the work before you plan it.</h2>
            <p className="text-[13.5px] text-[#5c564c] leading-relaxed">One line. This is the thing you are trying to finish, not a chat title.</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Sunday stew, or the station study" className="mt-4 w-full h-12 px-3 rounded-2xl border border-[#e6e1d6] bg-[#fafaf8] text-[14px] outline-none" />
            <button type="button" disabled={!title.trim()} onClick={() => setNamed(true)} className="mt-4 w-full h-12 rounded-full bg-[#171717] text-white font-bold text-[13px] disabled:opacity-40 cursor-pointer">Make the roadmap</button>
          </>
        ) : (
          <>
            <p className="text-[11px] tracking-[0.14em] uppercase text-[#8a8175] font-semibold m-0">{step.kicker} · {page + 1} of {steps.length}</p>
            <h2 className="text-[26px] leading-tight tracking-[-0.03em] font-extrabold mt-2 mb-2">{step.title}</h2>
            <p className="text-[13.5px] text-[#5c564c] leading-relaxed m-0">{step.body}</p>
            {step.marks && (
              <div className="mt-4 flex flex-wrap gap-2">
                {step.marks.map((m) => (
                  <span key={m} className="px-3 py-1.5 rounded-full border border-[#e6e1d6] text-[12px] font-semibold">{m}</span>
                ))}
              </div>
            )}
            {step.field && (
              <label className="block mt-4 text-[12px] font-bold text-[#555]">
                {step.field}
                <textarea value={answers[page] || ''} onChange={(e) => setAnswers({ ...answers, [page]: e.target.value })} rows={3} className="mt-1.5 w-full rounded-2xl border border-[#e6e1d6] bg-[#fafaf8] p-3 text-[13px] font-medium outline-none" />
              </label>
            )}
            <button
              type="button"
              onClick={() => {
                if (!last) setPage(page + 1);
                else {
                  const record = { title, answers, at: Date.now() };
                  try {
                    const prev = JSON.parse(localStorage.getItem('bob_roadmaps_v1') || '[]');
                    localStorage.setItem('bob_roadmaps_v1', JSON.stringify([record, ...prev].slice(0, 12)));
                  } catch {}
                  setOpen(false);
                }
              }}
              className="mt-5 w-full h-12 rounded-full bg-[#171717] text-white font-bold text-[13px] cursor-pointer"
            >{last ? 'Keep this plan' : 'Continue'}</button>
          </>
        )}
      </div>
    </div>
  );
};
