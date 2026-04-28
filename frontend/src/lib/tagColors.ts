export interface TagColors {
  avatar: string;
  pill: string;
  pillActive: string;
  dot: string;
}

const BUILT_IN: Record<string, TagColors> = {
  favourite: {
    avatar:     'bg-amber-950/60 text-amber-300',
    pill:       'text-amber-500 border-amber-800/50 hover:border-amber-700/60 hover:text-amber-400',
    pillActive: 'bg-amber-950/60 text-amber-400 border-amber-700/50',
    dot:        'bg-amber-400',
  },
  special: {
    avatar:     'bg-violet-950/60 text-violet-300',
    pill:       'text-violet-500 border-violet-800/50 hover:border-violet-700/60 hover:text-violet-400',
    pillActive: 'bg-violet-950/60 text-violet-400 border-violet-700/50',
    dot:        'bg-violet-400',
  },
  other: {
    avatar:     'bg-zinc-800 text-zinc-400',
    pill:       'text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-400',
    pillActive: 'bg-zinc-700 text-zinc-200 border-zinc-600',
    dot:        'bg-zinc-600',
  },
};

// Palette entries appear as literal strings so Tailwind's purge includes them
const PALETTE: TagColors[] = [
  { avatar: 'bg-teal-950/60 text-teal-300',    pill: 'text-teal-500 border-teal-800/50 hover:border-teal-700/60 hover:text-teal-400',       pillActive: 'bg-teal-950/60 text-teal-400 border-teal-700/50',    dot: 'bg-teal-400'    },
  { avatar: 'bg-sky-950/60 text-sky-300',       pill: 'text-sky-500 border-sky-800/50 hover:border-sky-700/60 hover:text-sky-400',             pillActive: 'bg-sky-950/60 text-sky-400 border-sky-700/50',       dot: 'bg-sky-400'     },
  { avatar: 'bg-rose-950/60 text-rose-300',     pill: 'text-rose-500 border-rose-800/50 hover:border-rose-700/60 hover:text-rose-400',         pillActive: 'bg-rose-950/60 text-rose-400 border-rose-700/50',    dot: 'bg-rose-400'    },
  { avatar: 'bg-orange-950/60 text-orange-300', pill: 'text-orange-500 border-orange-800/50 hover:border-orange-700/60 hover:text-orange-400', pillActive: 'bg-orange-950/60 text-orange-400 border-orange-700/50', dot: 'bg-orange-400' },
  { avatar: 'bg-emerald-950/60 text-emerald-300', pill: 'text-emerald-500 border-emerald-800/50 hover:border-emerald-700/60 hover:text-emerald-400', pillActive: 'bg-emerald-950/60 text-emerald-400 border-emerald-700/50', dot: 'bg-emerald-400' },
  { avatar: 'bg-pink-950/60 text-pink-300',     pill: 'text-pink-500 border-pink-800/50 hover:border-pink-700/60 hover:text-pink-400',         pillActive: 'bg-pink-950/60 text-pink-400 border-pink-700/50',    dot: 'bg-pink-400'    },
  { avatar: 'bg-indigo-950/60 text-indigo-300', pill: 'text-indigo-500 border-indigo-800/50 hover:border-indigo-700/60 hover:text-indigo-400', pillActive: 'bg-indigo-950/60 text-indigo-400 border-indigo-700/50', dot: 'bg-indigo-400' },
  { avatar: 'bg-cyan-950/60 text-cyan-300',     pill: 'text-cyan-500 border-cyan-800/50 hover:border-cyan-700/60 hover:text-cyan-400',         pillActive: 'bg-cyan-950/60 text-cyan-400 border-cyan-700/50',    dot: 'bg-cyan-400'    },
  { avatar: 'bg-lime-950/60 text-lime-300',     pill: 'text-lime-500 border-lime-800/50 hover:border-lime-700/60 hover:text-lime-400',         pillActive: 'bg-lime-950/60 text-lime-400 border-lime-700/50',    dot: 'bg-lime-400'    },
];

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function tagColors(tag: string): TagColors {
  return BUILT_IN[tag] ?? PALETTE[hashStr(tag) % PALETTE.length];
}
