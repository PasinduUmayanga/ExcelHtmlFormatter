import type { Worker, WorkerOptions } from 'node:worker_threads'
import { CANCELLED_MESSAGE, type JobProgress } from '@hf/core'
import { friendlyWorkerError, type WorkerMessage, type WorkerRequestBody } from '../protocol'

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  onProgress?: (progress: JobProgress) => void
}

/** Up to 4 GB for very large documents (format libraries usually keep the whole file in memory). */
const MAX_MEMORY_MB = 4096

/**
 * One background worker thread. Requests return promises; `terminate()` stops the thread
 * at once (that is how Cancel works) and rejects anything still running.
 */
export class JobWorker {
  private readonly worker: Worker
  private readonly pending = new Map<number, Pending>()
  private nextId = 1
  private stopped = false

  constructor(createWorker: (options: WorkerOptions) => Worker) {
    this.worker = createWorker({ resourceLimits: { maxOldGenerationSizeMb: MAX_MEMORY_MB } })
    this.worker.on('message', (m: WorkerMessage) => {
      const job = this.pending.get(m.id)
      if (!job) return
      if (m.kind === 'progress') return job.onProgress?.(m.progress)
      this.pending.delete(m.id)
      if (m.kind === 'result') job.resolve(m.result)
      else job.reject(new Error(m.message))
    })
    this.worker.on('error', (err: NodeJS.ErrnoException) => this.failAll(friendlyWorkerError(err)))
    this.worker.on('exit', () => {
      if (!this.stopped) this.failAll('The background task stopped unexpectedly. Please try again.')
    })
  }

  request<T>(body: WorkerRequestBody, onProgress?: (progress: JobProgress) => void): Promise<T> {
    if (this.stopped) return Promise.reject(new Error(CANCELLED_MESSAGE))
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress })
      this.worker.postMessage({ ...body, id })
    })
  }

  /** Stops the thread immediately. Running requests reject with `reason`. */
  terminate(reason = CANCELLED_MESSAGE): void {
    if (this.stopped) return
    this.stopped = true
    this.failAll(reason)
    void this.worker.terminate()
  }

  private failAll(message: string): void {
    for (const job of this.pending.values()) job.reject(new Error(message))
    this.pending.clear()
  }
}
