export type Quality = 'best' | '1080' | '720' | '480' | '360' | 'audio'
export type Format = 'mp4' | 'mp3' | 'webm' | 'wav'
export type JobStatus = 'queued' | 'downloading' | 'done' | 'error'

export interface DownloadJob {
  id: string
  url: string
  quality: Quality
  format: Format
  status: JobStatus
  progress: number
  eta: string
  speed: string
  error?: string
}
