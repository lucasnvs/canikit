import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { DownloadJob, Quality, Format } from './types'

const QUALITY_OPTIONS: { value: Quality; label: string }[] = [
  { value: 'best', label: 'Melhor disponível' },
  { value: '1080', label: '1080p' },
  { value: '720', label: '720p' },
  { value: '480', label: '480p' },
  { value: '360', label: '360p' },
  { value: 'audio', label: 'Apenas áudio' },
]

const FORMAT_OPTIONS: { value: Format; label: string }[] = [
  { value: 'mp4', label: 'MP4' },
  { value: 'mp3', label: 'MP3' },
  { value: 'webm', label: 'WebM' },
  { value: 'wav', label: 'WAV' },
]


export default function YoutubeDownloader() {
  const [urlsText, setUrlsText] = useState('')
  const [quality, setQuality] = useState<Quality>('best')
  const [format, setFormat] = useState<Format>('mp4')
  const [outputDir, setOutputDir] = useState('')
  const [jobs, setJobs] = useState<DownloadJob[]>([])
  const [ytdlpMissing, setYtdlpMissing] = useState(false)
  const jobsRef = useRef<DownloadJob[]>([])
  jobsRef.current = jobs


  // Listen to backend events
  useEffect(() => {
    const unlisten1 = listen<{ id: string; percent: number; eta: string; speed: string }>(
      'dl-progress',
      ({ payload }) => {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === payload.id
              ? { ...j, status: 'downloading', progress: payload.percent, eta: payload.eta, speed: payload.speed }
              : j,
          ),
        )
      },
    )

    const unlisten2 = listen<{ id: string }>('dl-done', ({ payload }) => {
      setJobs((prev) =>
        prev.map((j) => (j.id === payload.id ? { ...j, status: 'done', progress: 100 } : j)),
      )
    })

    const unlisten3 = listen<{ id: string; error: string }>('dl-error', ({ payload }) => {
      if (payload.error.includes('yt-dlp')) setYtdlpMissing(true)
      setJobs((prev) =>
        prev.map((j) =>
          j.id === payload.id ? { ...j, status: 'error', error: payload.error } : j,
        ),
      )
    })

    return () => {
      unlisten1.then((fn) => fn())
      unlisten2.then((fn) => fn())
      unlisten3.then((fn) => fn())
    }
  }, [])

  async function handlePickFolder() {
    try {
      const dir = await invoke<string | null>('pick_download_folder')
      if (dir) setOutputDir(dir)
    } catch {}
  }

  async function handleDownload() {
    const urls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0)

    if (urls.length === 0) return
    if (!outputDir) {
      alert('Escolha uma pasta de destino primeiro.')
      return
    }

    setYtdlpMissing(false)

    const newJobs: DownloadJob[] = urls.map((url) => ({
      id: crypto.randomUUID(),
      url,
      quality,
      format,
      status: 'queued',
      progress: 0,
      eta: '',
      speed: '',
    }))

    setJobs((prev) => [...newJobs, ...prev])

    for (const job of newJobs) {
      try {
        await invoke('start_download', {
          id: job.id,
          url: job.url,
          format: job.format,
          quality: job.quality,
          outputDir,
        })
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: 'downloading' } : j)),
        )
      } catch (err) {
        const errMsg = String(err)
        if (errMsg.includes('yt-dlp')) setYtdlpMissing(true)
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: 'error', error: errMsg } : j,
          ),
        )
      }
    }

    setUrlsText('')
  }

  const isAudio = quality === 'audio' || format === 'mp3' || format === 'wav'
  const activeCount = jobs.filter((j) => j.status === 'downloading').length

  return (
    <div className="yt-downloader">
      {ytdlpMissing && (
        <div className="yt-missing-bar">
          <strong>yt-dlp não encontrado.</strong> Instale com:{' '}
          <code>winget install yt-dlp</code> ou baixe em{' '}
          <span style={{ color: 'var(--accent)' }}>github.com/yt-dlp/yt-dlp</span>
        </div>
      )}

      <div className="yt-input-panel">
        <div className="yt-section-label">URLs (uma por linha)</div>
        <textarea
          className="yt-url-input"
          placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.youtube.com/watch?v=...'}
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          rows={4}
          spellCheck={false}
        />

        <div className="yt-controls-row">
          <div className="yt-control-group">
            <label className="yt-label">Qualidade</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as Quality)}
              className="yt-select"
            >
              {QUALITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="yt-control-group">
            <label className="yt-label">Formato</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
              className="yt-select"
            >
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {isAudio && (
            <div className="yt-tag">🎵 Modo áudio</div>
          )}
        </div>

        <div className="yt-folder-row">
          <div className="yt-label">Pasta de destino</div>
          <div className="yt-folder-selector">
            <span className="yt-folder-path">{outputDir || '(nenhuma selecionada)'}</span>
            <button onClick={handlePickFolder}>Alterar</button>
          </div>
        </div>

        <button
          className="btn-primary yt-download-btn"
          onClick={handleDownload}
          disabled={!urlsText.trim() || !outputDir}
        >
          ⬇ Baixar{urlsText.trim().split('\n').filter((l) => l.trim()).length > 1
            ? ` (${urlsText.trim().split('\n').filter((l) => l.trim()).length} vídeos)`
            : ''}
        </button>
      </div>

      {jobs.length > 0 && (
        <div className="yt-queue">
          <div className="yt-queue-header">
            Fila de downloads
            {activeCount > 0 && (
              <span className="yt-queue-badge">{activeCount} ativo{activeCount !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="yt-job-list">
            {jobs.map((job) => (
              <div key={job.id} className={`yt-job yt-job--${job.status}`}>
                <div className="yt-job-top">
                  <span className="yt-job-status-icon">
                    {job.status === 'queued' && '○'}
                    {job.status === 'downloading' && '●'}
                    {job.status === 'done' && '✓'}
                    {job.status === 'error' && '✕'}
                  </span>
                  <span className="yt-job-url">{job.url}</span>
                  <span className="yt-job-badge">
                    {job.quality === 'audio' ? 'áudio' : job.quality === 'best' ? 'best' : `${job.quality}p`}
                    {' · '}
                    {job.format.toUpperCase()}
                  </span>
                </div>

                {job.status === 'downloading' && (
                  <>
                    <div className="yt-progress-bar">
                      <div
                        className="yt-progress-fill"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <div className="yt-job-meta">
                      {job.progress.toFixed(1)}%
                      {job.eta && ` · ETA ${job.eta}`}
                      {job.speed && ` · ${job.speed}`}
                    </div>
                  </>
                )}

                {job.status === 'done' && (
                  <div className="yt-progress-bar">
                    <div className="yt-progress-fill" style={{ width: '100%' }} />
                  </div>
                )}

                {job.status === 'error' && (
                  <div className="yt-job-error">{job.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
