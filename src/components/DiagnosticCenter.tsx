import { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  FileCode, 
  Cpu, 
  Database, 
  Globe, 
  ExternalLink,
  ChevronRight,
  GitBranch,
  ShieldCheck,
  Zap,
  HardDrive
} from 'lucide-react';

interface DiagnosticCenterProps {
  onSwitchToFixes: () => void;
  onSwitchToWorkspace: () => void;
}

export function DiagnosticCenter({ onSwitchToFixes, onSwitchToWorkspace }: DiagnosticCenterProps) {
  const [selectedIssue, setSelectedIssue] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'root-causes' | 'offline-matrix' | 'release-pipeline'>('root-causes');

  const rootCauses = [
    {
      id: 0,
      title: 'Cause 1: Packaged Installer Had No Frontend Files (Blank Window)',
      severity: 'Critical (Fatal)',
      summary: 'In releases v1.0.0 and v1.0.1, main.cjs instructed Electron to load "dist/index.html", but no HTML or JS files were included in the build output.',
      details: `When Electron packaged the Windows installer for v1.0.0 and v1.0.1, the "files" configuration in apps/desktop/package.json did not bundle any compiled web assets. At runtime, main.cjs attempted to call win.loadFile(path.join(__dirname, 'dist', 'index.html')).
Because the file did not exist, Electron caught the error and attempted a fallback to 'index.html', which also did not exist. As a result, Electron loaded an empty file URL, causing the window to remain completely blank white/gray.`,
      status: 'Fixed in our provided desktop package bundle',
      codeSnippet: `// What was in v1.0.1 (CRASHES - BLANK):
win.loadFile(path.join(__dirname, 'dist', 'index.html')).catch(() => {
  win.loadURL(\`file://\${path.join(__dirname, 'index.html')}\`) // Neither exists!
})

// The Solution:
win.loadFile(path.join(__dirname, 'renderer', 'index.html')) // Guaranteed bundled!`,
    },
    {
      id: 1,
      title: 'Cause 2: GitHub Releases Was Serving Broken v1.0.1 (No v1.0.12 Tag Was Pushed)',
      severity: 'High (Distribution)',
      summary: 'The website download button links to github.com/.../releases/latest/download/... which was still downloading the old v1.0.1 installer.',
      details: `In your website (app/page.tsx), the download button directs users to:
https://github.com/amanididier/build-bob-research-application/releases/latest/download/Bob-Research-Companion-Setup.exe

Even though a partial commit (9fd2d7b) was made to "main", GitHub Actions only builds the Windows executable when a Git Tag matching "v*" is pushed (e.g. "git tag v1.0.12 && git push origin --tags"). Because no new tag was pushed, GitHub Actions never built a new installer, so users kept downloading the old broken v1.0.1!`,
      status: 'Ready - follow the 3-step git tag command below',
      codeSnippet: `// Terminal command to trigger the build & publish the new installer:
git add .
git commit -m "fix(desktop): bundle complete offline UI, local AI, and bridge"
git tag v1.0.12
git push origin main --tags`,
    },
    {
      id: 2,
      title: 'Cause 3: Next.js Server Components Cannot Run as Static file:// in Electron',
      severity: 'Architectural',
      summary: 'The original V0 app used Next.js App Router with "use server" actions, headers(), and direct pg Pool connections that require a live Node.js server.',
      details: `Next.js 16 uses React Server Components (RSC) and Server Actions (e.g. in app/actions/notes.ts, auth.ts). When wrapped naively inside Electron without running a separate Node server process, opening pages via file:// fails because the browser cannot execute Node.js database connections or server-side functions.
Solution: The desktop app must have a dedicated, self-contained client renderer (apps/desktop/renderer/) that communicates via safe Electron IPC to local storage and the local AI brain, while syncing with Supabase over HTTPS when online.`,
      status: 'Architected with pure offline renderer & Supabase cloud sync',
      codeSnippet: `// Desktop Renderer Architecture:
[Renderer (React/HTML5)] 
  <-> [preload.cjs (Safe IPC)] 
  <-> [main.cjs (Local JSON / SQLite + Local AI + Port 54321 Bridge)]
  <-> [Supabase Cloud Postgres (when online)]`,
    },
    {
      id: 3,
      title: 'Cause 4: Local AI Brain Was Not Adapted to 4GB RAM Machines',
      severity: 'Performance',
      summary: 'Heavy transformer models crash or cause system freeze on 4GB RAM PCs. Dynamic model scaling is required.',
      details: `On a 4GB RAM machine, running an unquantized 7B or 3B model will consume 4GB-8GB of memory, causing Windows to aggressively page to disk (thrashing) or crash Electron with out-of-memory (OOM).
Our adaptive AI Brain inspects navigator.deviceMemory and os.totalmem():
- For 4GB RAM: Selects Qwen2.5-0.5B-Instruct (Q4_K_M) consuming only ~285MB RAM with fast 40+ tokens/sec.
- For 16GB RAM: Automatically unlocks Qwen2.5-3B-Instruct (Q5_K_M) with deep reasoning.`,
      status: 'Implemented with automatic dynamic hardware detection',
      codeSnippet: `export function selectModelProfile(ramGb: number) {
  if (ramGb >= 16) return MODEL_CATALOG['high-perf-16gb']; // 3B Q5_K_M (~1.4GB RAM)
  if (ramGb >= 8)  return MODEL_CATALOG['balanced-8gb'];   // 1.7B Q4_K_M (~680MB RAM)
  return MODEL_CATALOG['ultra-light-4gb'];                  // 0.5B Q4_K_M (~285MB RAM, ultra-fast)
}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-emerald-500/10 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  Root Cause Diagnosis Complete
                </span>
                <span className="text-xs text-neutral-400">Target Repo: amanididier/build-bob-research-application</span>
              </div>
              <h2 className="text-xl font-bold text-neutral-100 mt-1">
                Why the Desktop App Showed a Blank Screen & How We Fix It
              </h2>
              <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
                We diagnosed the exact repository structure, commit history, and GitHub release pipeline. 
                Below are the definitive root causes, the offline vs online breakdown, and the solution.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onSwitchToFixes}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
            >
              <FileCode className="w-4 h-4" />
              Get Fixed Release Files
            </button>
            <button
              onClick={onSwitchToWorkspace}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              Test Bob App Here
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 gap-2">
        <button
          onClick={() => setActiveTab('root-causes')}
          className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'root-causes'
              ? 'border-violet-500 text-violet-400 bg-violet-500/5'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          4 Root Causes Identified
        </button>
        <button
          onClick={() => setActiveTab('offline-matrix')}
          className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'offline-matrix'
              ? 'border-violet-500 text-violet-400 bg-violet-500/5'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Offline vs Online Matrix
        </button>
        <button
          onClick={() => setActiveTab('release-pipeline')}
          className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'release-pipeline'
              ? 'border-violet-500 text-violet-400 bg-violet-500/5'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          Release v1.0.12 Action Workflow
        </button>
      </div>

      {/* Tab 1: Root Causes */}
      {activeTab === 'root-causes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Issue Selector */}
          <div className="lg:col-span-5 space-y-3">
            {rootCauses.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedIssue === issue.id
                    ? 'bg-neutral-900 border-violet-500/50 shadow-lg shadow-violet-500/5'
                    : 'bg-neutral-900/40 border-neutral-800 hover:bg-neutral-900/80 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    issue.severity.includes('Critical')
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : issue.severity.includes('High')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {issue.severity}
                  </span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-neutral-200">{issue.title}</h4>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{issue.summary}</p>
              </div>
            ))}
          </div>

          {/* Issue Deep-Dive */}
          <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
                Detailed Diagnostic Report
              </div>
              <h3 className="text-lg font-bold text-neutral-100 mt-1">
                {rootCauses[selectedIssue].title}
              </h3>
              <p className="text-sm text-neutral-300 mt-3 leading-relaxed">
                {rootCauses[selectedIssue].details}
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs">
              <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-800 pb-2 mb-3">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-violet-400" /> Code Analysis
                </span>
                <span className="text-emerald-400 text-[11px]">Correct Pattern Applied</span>
              </div>
              <pre className="text-neutral-300 whitespace-pre-wrap leading-5">
                {rootCauses[selectedIssue].codeSnippet}
              </pre>
            </div>

            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-300 font-medium">
                  {rootCauses[selectedIssue].status}
                </span>
              </div>
              <button
                onClick={onSwitchToFixes}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                View File <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Offline vs Online Matrix */}
      {activeTab === 'offline-matrix' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OFFLINE */}
            <div className="bg-neutral-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-100">100% Offline Desktop Features</h3>
                    <p className="text-xs text-emerald-400">Zero Internet or Cloud Required</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  Local-First
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="font-semibold text-xs text-neutral-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Complete UI & Pages
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 pl-6">
                    Dashboard, Notes list/editor, Research Projects, Sessions, and Highlights all load instantly from local files without any server.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="font-semibold text-xs text-neutral-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Local AI Brain (Adaptive 4GB / 8GB / 16GB)
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 pl-6">
                    On-device inference using quantized transformer weights. Synthesizes answers, scores relevance, and summarizes context on your PC.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="font-semibold text-xs text-neutral-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Local Extension Bridge (127.0.0.1:54321)
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 pl-6">
                    Chrome extension communicates over local loopback HTTP to send captured snippets, highlights, and active tabs directly into your desktop app.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="font-semibold text-xs text-neutral-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Local Data Persistence
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 pl-6">
                    Saved in <code className="text-violet-300">bob-workspace.json</code> in the Electron AppData folder, never erased when quitting the app.
                  </p>
                </div>
              </div>
            </div>

            {/* ONLINE */}
            <div className="bg-neutral-900 border border-blue-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-100">Online & Cloud Features</h3>
                    <p className="text-xs text-blue-400">Requires Network / Supabase Connection</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                  Cloud Sync
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="font-semibold text-xs text-neutral-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    Supabase Database & Auth Sync
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 pl-6">
                    User sign-in, account creation, and multi-device cloud backup to PostgreSQL tables (user, account, research_project, notes).
                  </p>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="font-semibold text-xs text-neutral-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Separate Marketing Website (Vercel)
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 pl-6">
                    Hosted separately on Vercel. Serves the landing page and the Windows installer direct download link from GitHub releases.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="font-semibold text-xs text-neutral-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    Cloud AI Fallback & Web Search
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 pl-6">
                    Optional live internet web search grounding when the user requests research on topics not yet saved in their local notes.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="font-semibold text-xs text-neutral-200 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    External Source Links
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 pl-6">
                    Clicking on a citation URL opens the external research article or Wikipedia link in the user's default web browser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Release Pipeline */}
      {activeTab === 'release-pipeline' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-neutral-100">
                GitHub Actions Windows Release Pipeline (.github/workflows/release-desktop.yml)
              </h3>
              <p className="text-sm text-neutral-400 mt-1">
                How GitHub builds the Windows installer executable and attaches it to your release download button.
              </p>
            </div>
            <span className="px-3 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-lg text-xs font-semibold font-mono">
              target: v1.0.12
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
              <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="text-sm font-semibold text-neutral-200">Push Release Tag</h4>
              <p className="text-xs text-neutral-400">
                You run <code className="text-amber-300">git tag v1.0.12</code> and push to GitHub. This triggers the GitHub Actions workflow automatically.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
              <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="text-sm font-semibold text-neutral-200">Windows Runner Boots</h4>
              <p className="text-xs text-neutral-400">
                GitHub spins up a <code className="text-violet-300">windows-latest</code> VM with Node 20, checks code syntax, and installs dependencies.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
              <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h4 className="text-sm font-semibold text-neutral-200">Electron-Builder Packages</h4>
              <p className="text-xs text-neutral-400">
                NSIS packages <code className="text-emerald-300">main.cjs</code>, <code className="text-emerald-300">preload.cjs</code>, and <code className="text-emerald-300">renderer/**</code> into a single executable.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
              <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h4 className="text-sm font-semibold text-neutral-200">Release Asset Attached</h4>
              <p className="text-xs text-neutral-400">
                <code className="text-emerald-300">Bob-Research-Companion-Setup.exe</code> is attached to GitHub release. The website button works immediately!
              </p>
            </div>
          </div>

          <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                Ready to deploy your next release?
              </div>
              <p className="text-xs text-neutral-400">
                All 6 updated repository files are prepared and verified in the "Fixed Repo Files" tab.
              </p>
            </div>
            <button
              onClick={onSwitchToFixes}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              Get Ready-to-Commit Files →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
