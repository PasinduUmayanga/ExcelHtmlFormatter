import type { AppConfig, JobProgress, PickedFile } from '@hf/core'

/** Requests the main process sends to the background worker. */
export type WorkerRequest =
  | { id: number; type: 'load'; file: PickedFile }
  | { id: number; type: 'preview'; section: string }
  | { id: number; type: 'export'; source: string; target: string; sections: string[]; config: AppConfig }

/** Messages the worker sends back. Every request ends with exactly one 'result' or 'error'. */
export type WorkerMessage =
  | { id: number; kind: 'progress'; progress: JobProgress }
  | { id: number; kind: 'result'; result: unknown }
  | { id: number; kind: 'error'; message: string }

/** Turns a worker crash into a message the user can act on. */
export function friendlyWorkerError(err: NodeJS.ErrnoException): string {
  if (err?.code === 'ERR_WORKER_OUT_OF_MEMORY') {
    return 'This file is too large to process in one go. Try splitting it into smaller files, or close other programs and try again.'
  }
  return 'Something went wrong while processing the file: ' + (err?.message ?? String(err))
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type WorkerRequestBody = DistributiveOmit<WorkerRequest, 'id'>
