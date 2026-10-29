import React, { useCallback, useEffect, useState } from 'react'
import { FolderOpen, RefreshCw, Search, FileText, ShieldCheck, Unplug } from 'lucide-react'

type LocalProjectStatus = {
  connected: boolean
  rootName?: string
  connectedAt?: string | null
  readOnly?: boolean
}

type ProjectFile = {
  path: string
  sizeBytes: number
  extension?: string
  modifiedAt?: string
}

type ReadResult = {
  path: string
  totalLines: number
  startLine: number
  endLine: number
  content: string
  truncated: boolean
}

export const LocalProjectPanel: React.FC = () => {
  const [status, setStatus] = useState<LocalProjectStatus>({ connected: false })
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Array<{ path: string; line: number; excerpt: string }>>([])
  const [preview, setPreview] = useState<ReadResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const api = () => (window as any).bob

  const refresh = useCallback(async () => {
    const bridge = api()
    if (!bridge?.localProjectStatus) {
      setStatus({ connected: false })
      setError('Local folder access is available in the installed Bob desktop app. Open this page there to connect a folder.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const nextStatus = await bridge.localProjectStatus()
      setStatus(nextStatus || { connected: false })
      if (nextStatus?.connected) {
        const result = await bridge.listLocalProjectFiles({})
        if (!result?.ok) throw new Error(result?.error || 'Could not list project files.')
        setFiles(result.files || [])
      } else {
        setFiles([])
        setMatches([])
        setPreview(null)
      }
    } catch (e: any) {
      setError(e?.message || 'Could not read the selected project folder.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const chooseFolder = async () => {
    const bridge = api()
    if (!bridge?.selectLocalProjectFolder) {
      setError('Folder selection is available in the installed Bob desktop app.')
      return
    }
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const result = await bridge.selectLocalProjectFolder()
      if (result?.canceled) return
      if (!result?.ok) throw new Error(result?.error || 'The folder could not be connected.')
      setNotice('Folder connected. Bob can read supported source and text files; it cannot edit your project.')
      await refresh()
    } catch (e: any) {
      setError(e?.message || 'Could not connect the folder.')
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async () => {
    const bridge = api()
    if (!bridge?.disconnectLocalProject) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      await bridge.disconnectLocalProject()
      setStatus({ connected: false })
      setFiles([])
      setMatches([])
      setPreview(null)
      setNotice('Local project disconnected.')
    } catch (e: any) {
      setError(e?.message || 'Could not disconnect the project.')
    } finally {
      setLoading(false)
    }
  }

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    const bridge = api()
    if (!bridge?.searchLocalProject || !query.trim()) return
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const result = await bridge.searchLocalProject(query.trim())
      if (!result?.ok) throw new Error(result?.error || 'Search failed.')
      setMatches(result.matches || [])
      if (!result.matches?.length) setNotice('No matching lines found in the files Bob can safely read.')
      else setNotice('Search results include source paths and line numbers.')
    } catch (e: any) {
      setError(e?.message || 'Could not search this project.')
    } finally {
      setLoading(false)
    }
  }

  const openFile = async (filePath: string, line?: number) => {
    const bridge = api()
    if (!bridge?.readLocalProjectFile) return
    setLoading(true)
    setError('')
    try {
      const startLine = Math.max(1, line || 1)
      const result = await bridge.readLocalProjectFile(filePath, { startLine, endLine: startLine + 119 })
      if (!result?.ok) throw new Error(result?.error || 'Could not read this file.')
      setPreview(result)
    } catch (e: any) {
      setError(e?.message || 'Could not read this file.')
    } finally {
      setLoading(false)
    }
  }

  const formatSize = (bytes: number) => bytes < 1024 ? bytes + ' B' : Math.round(bytes / 1024) + ' KB'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-white m-0">Local project</h2>
        <p className="text-[13px] text-neutral-500 dark:text-[var(--m)] mt-1 m-0">
          Connect a folder so Bob can understand your work from actual files. This is read-only: Bob cannot edit files or run commands.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-[var(--line)] p-4 md:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fff4cc] dark:bg-[#453817] text-[#7c5b00] grid place-items-center shrink-0">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-neutral-900 dark:text-white m-0">
              {status.connected ? status.rootName || 'Connected folder' : 'No folder connected'}
            </p>
            <p className="text-[12px] text-neutral-500 dark:text-[var(--m)] mt-1 m-0">
              {status.connected
                ? 'Bob can read supported text/source files inside this folder only.'
                : 'Choose the project folder you want Bob to understand.'}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Read-only · no shell commands · no file edits
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={chooseFolder} disabled={loading}
            className="h-10 px-4 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[12px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            <FolderOpen className="w-4 h-4" /> {status.connected ? 'Choose another folder' : 'Choose project folder'}
          </button>
          <button type="button" onClick={() => void refresh()} disabled={loading}
            className="h-10 px-4 rounded-full border border-neutral-200 dark:border-[var(--line)] text-[12px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} /> Refresh
          </button>
          {status.connected && <button type="button" onClick={disconnect} disabled={loading}
            className="h-10 px-4 rounded-full border border-neutral-200 dark:border-[var(--line)] text-[12px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            <Unplug className="w-4 h-4" /> Disconnect
          </button>}
        </div>
      </div>

      {error && <p role="alert" className="text-[12px] text-red-600 dark:text-red-400 m-0">{error}</p>}
      {notice && !error && <p role="status" className="text-[12px] text-neutral-500 dark:text-[var(--m)] m-0">{notice}</p>}

      {status.connected && <>
        <form onSubmit={runSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a function, symbol, phrase, or error"
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-neutral-200 dark:border-[var(--line)] bg-neutral-50 dark:bg-[var(--s2)] text-[13px] outline-none focus:ring-2 focus:ring-[#f5c842]/40" />
          </div>
          <button type="submit" disabled={loading || query.trim().length < 2}
            className="h-11 px-4 rounded-xl bg-[#f5c842] text-neutral-900 text-[12px] font-semibold disabled:opacity-50">Search</button>
        </form>

        {matches.length > 0 && <div className="rounded-xl border border-neutral-200 dark:border-[var(--line)] overflow-hidden">
          <div className="px-3 py-2 bg-neutral-50 dark:bg-[var(--s2)] text-[11px] font-semibold text-neutral-500">{matches.length} matching lines</div>
          <div className="divide-y divide-neutral-100 dark:divide-[var(--line)] max-h-64 overflow-auto">
            {matches.map((match, index) => <button key={match.path + ':' + match.line + ':' + index}
              type="button" onClick={() => void openFile(match.path, match.line)}
              className="w-full text-left p-3 hover:bg-neutral-50 dark:hover:bg-[var(--s2)]">
              <span className="block text-[11px] font-semibold text-blue-700 dark:text-blue-300">{match.path}:{match.line}</span>
              <span className="block mt-1 text-[12px] text-neutral-600 dark:text-[var(--m)] break-words">{match.excerpt}</span>
            </button>)}
          </div>
        </div>}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white m-0">Readable files</h3>
            <span className="text-[11px] text-neutral-500">{files.length} shown</span>
          </div>
          <div className="rounded-xl border border-neutral-200 dark:border-[var(--line)] divide-y divide-neutral-100 dark:divide-[var(--line)] max-h-72 overflow-auto">
            {files.map((file) => <div key={file.path} className="px-3 py-2.5 flex items-center gap-3">
              <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-neutral-800 dark:text-white m-0 break-all">{file.path}</p>
                <p className="text-[10px] text-neutral-500 m-0 mt-0.5">{formatSize(file.sizeBytes)}</p>
              </div>
              <button type="button" onClick={() => void openFile(file.path)}
                className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 shrink-0">Read</button>
            </div>)}
            {files.length === 0 && <p className="text-[12px] text-neutral-500 p-4 m-0">No readable files were found within the scan limits.</p>}
          </div>
        </div>
      </>}

      {preview && <div className="rounded-xl border border-neutral-200 dark:border-[var(--line)] overflow-hidden">
        <div className="px-3 py-2.5 flex items-center justify-between gap-3 bg-neutral-50 dark:bg-[var(--s2)]">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold m-0 break-all">{preview.path}</p>
            <p className="text-[10px] text-neutral-500 m-0 mt-0.5">Lines {preview.startLine}–{preview.endLine} of {preview.totalLines}</p>
          </div>
          <button type="button" onClick={() => setPreview(null)} className="text-[11px] text-neutral-500 shrink-0">Close</button>
        </div>
        <pre className="p-3 m-0 max-h-[360px] overflow-auto text-[11px] leading-5 font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre">{preview.content}</pre>
      </div>}

      <p className="text-[11px] text-neutral-500 dark:text-[var(--m)] m-0">
        Safety limits: common build/dependency folders, binary files, environment secrets and credential files are excluded. Individual files are limited to 256 KB; search is bounded and returns line-numbered matches.
      </p>
    </div>
  )
}
