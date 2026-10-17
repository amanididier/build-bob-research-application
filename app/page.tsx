import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bob — your AI research friend',
  description:
    'Download Bob, the AI research companion that remembers your goals and thinks deeply with you. Free for early users.',
  openGraph: {
    title: 'Bob — your AI research friend',
    description: 'Download Bob for Windows or add the Chrome extension. Free for the first users.',
    type: 'website',
  },
}

const WINDOWS_DOWNLOAD =
  'https://github.com/amanididier/build-bob-research-application/releases/latest/download/Bob-Research-Companion-Setup.exe'
const EXTENSION_ZIP = '/bob-chrome-extension.zip'
const LOGO = '/bob-logo.png'
const GARDEN = '/sunflower-login.png'

function Btn({
  href,
  children,
  tone = 'green',
  download,
}: {
  href: string
  children: React.ReactNode
  tone?: 'green' | 'sun' | 'bow' | 'white'
  download?: string | boolean
}) {
  const tones: Record<string, string> = {
    green: 'bg-[#58cc02] text-white shadow-[0_5px_0_#46a302]',
    sun: 'bg-[#f5c842] text-[#171717] shadow-[0_5px_0_#c9a020]',
    bow: 'bg-[#3b7ddd] text-white shadow-[0_5px_0_#2a5fa8]',
    white: 'bg-white text-[#171717] border border-[#e5e5df] shadow-[0_5px_0_#e5e5df]',
  }
  return (
    <a
      href={href}
      download={download === true ? undefined : download || undefined}
      className={`garden-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3.5 text-base font-semibold no-underline ${tones[tone]}`}
    >
      {children}
    </a>
  )
}

const features = [
  {
    title: 'Remembers you',
    text: 'Bob keeps your goals, tone and past research, so every session picks up where you left off.',
    color: 'bg-[#f5c842] text-[#5c3d0a]',
    glyph: '✦',
  },
  {
    title: 'Deep research',
    text: 'Connects your sources and reasons over them for clear, cited answers.',
    color: 'bg-[#3b7ddd] text-white',
    glyph: '⌕',
  },
  {
    title: 'Lives in your browser',
    text: 'The Chrome extension sends tabs and highlights straight to Bob.',
    color: 'bg-[#58cc02] text-white',
    glyph: '⬚',
  },
]

const perks = [
  'Windows desktop app with auto-updates',
  'Chrome extension for tabs & highlights',
  'Sign in once — sync notes, projects, roadmap',
  'Gemini-powered research when you add your key',
]

export default function Page() {
  return (
    <div className="garden-site min-h-screen overflow-x-hidden bg-[#fafaf8] text-[#171717] antialiased">
      <header className="sticky top-0 z-30 border-b border-[#e5e5df] bg-[#fafaf8]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 no-underline text-[#171717]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Bob" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-lg font-bold tracking-tight">Bob</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <a href="#download" className="hidden rounded-full px-4 py-2 text-[#666] hover:text-[#171717] no-underline sm:inline-block">
              Download
            </a>
            <Link href="/sign-in" className="rounded-full px-4 py-2 text-[#666] hover:text-[#171717] no-underline">
              Log in
            </Link>
            <Link href="/sign-up" className="rounded-full bg-[#171717] px-4 py-2 text-white no-underline">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center md:pt-24">
        <div className="relative mx-auto w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO}
            alt="Bob"
            className="garden-bob-float mx-auto h-44 w-44 rounded-3xl object-cover md:h-56 md:w-56"
          />
          <div className="absolute -right-20 top-2 rotate-6 rounded-2xl rounded-bl-sm border-4 border-white bg-[#3b7ddd] px-4 py-2 text-left text-sm font-bold text-white shadow-lg md:-right-36 md:text-base">
            Hi there!
            <br />
            <span className="font-medium opacity-90">I&apos;m Bob.</span>
          </div>
        </div>
        <h1 className="mx-auto mt-10 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
          Your friendly <span className="text-[#3b7ddd]">AI research</span>{' '}
          <span className="relative inline-block">
            <span className="relative z-10">companion.</span>
            <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded bg-[#f5c842] md:h-4" />
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[#666] md:text-xl">
          Save sources, keep your goals in memory and get deep, thoughtful answers — all in one cheerful place.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Btn href={WINDOWS_DOWNLOAD}>
            <span aria-hidden>↓</span> Download for free
          </Btn>
          <Btn href="/sign-up" tone="white">
            Try on the web <span aria-hidden>→</span>
          </Btn>
        </div>
        <p className="mt-4 text-sm text-[#888]">Windows · Chrome extension · Web · v1.1.0+</p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-3xl bg-[#f3f3ef] p-8 transition-transform hover:-translate-y-1">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold ${f.color}`}>
                {f.glyph}
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight m-0">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-[#666] m-0">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sunflower garden */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[2rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={GARDEN}
            alt="Sunflower garden under a blue sky"
            className="h-[22rem] w-full object-cover md:h-[26rem]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/20 to-transparent" />
          <div className="absolute inset-x-0 top-0 p-8 text-center md:p-10">
            <h2 className="text-3xl font-bold tracking-tight text-[#171717] md:text-5xl m-0">
              A home that feels like sunshine.
            </h2>
            <p className="mx-auto mt-3 max-w-md font-medium text-[#171717]/70 m-0">
              Bob greets you in a calm sunflower garden, ready to dig in.
            </p>
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid items-center gap-10 rounded-[2rem] bg-[#f3f3ef] p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#58cc02] m-0">Early access</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl m-0">Get Bob on your machine</h2>
            <p className="mt-3 text-[#666] leading-relaxed m-0">
              The full desktop app with research, notes, tasks, roadmap, and the Chrome overlay — same features we shipped in v1.1.0.
            </p>
            <ul className="mt-6 space-y-3 list-none p-0 m-0">
              {perks.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-[#333]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#58cc02] text-white text-xs font-bold">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Btn href={WINDOWS_DOWNLOAD} tone="sun">
                <span aria-hidden>↓</span> Download for Windows
              </Btn>
              <Btn href={EXTENSION_ZIP} tone="bow" download="bob-chrome-extension.zip">
                <span aria-hidden>◎</span> Chrome extension
              </Btn>
            </div>
            <p className="mt-4 text-xs text-[#888] m-0">
              Installer: Bob-Research-Companion-Setup.exe · Always the latest release on GitHub
            </p>
          </div>
          <div className="relative mx-auto">
            <div className="absolute inset-4 rounded-full bg-[#f5c842]/30 blur-3xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="" className="garden-bob-float relative h-56 w-56 rounded-3xl object-cover md:h-72 md:w-72" />
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e5e5df] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-[#888] sm:flex-row">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="" className="h-5 w-5 rounded object-cover" /> © 2026 Bob Research Companion
          </div>
          <div className="flex gap-5">
            <Link href="/sign-in" className="hover:text-[#171717] no-underline text-[#888]">
              Log in
            </Link>
            <Link href="/sign-up" className="hover:text-[#171717] no-underline text-[#888]">
              Sign up
            </Link>
            <a
              href="https://github.com/amanididier/build-bob-research-application"
              className="hover:text-[#171717] no-underline text-[#888]"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
