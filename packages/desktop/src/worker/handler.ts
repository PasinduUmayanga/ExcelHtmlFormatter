import { validateConfig, type FormatAdapter, type ProgressCallback } from '@hf/core'
import type { WorkerMessage, WorkerRequest } from '../protocol'

/** State kept inside one worker: the document opened by its 'load' request, reused for previews. */
export interface WorkerState<Doc> {
  doc: Doc | null
}

/**
 * Handles one request inside the worker thread, using the app's format adapter.
 * Kept separate from runWorker() so it can be unit-tested without starting a real thread.
 */
export async function handleRequest<Doc>(
  adapter: FormatAdapter<Doc>,
  req: WorkerRequest,
  state: WorkerState<Doc>,
  send: (m: WorkerMessage) => void
): Promise<void> {
  const progress: ProgressCallback = (p) => send({ id: req.id, kind: 'progress', progress: p })
  try {
    let result: unknown
    switch (req.type) {
      case 'load': {
        progress({ stage: 'reading' })
        state.doc = await adapter.read(req.file.path)
        result = adapter.summarize(state.doc, req.file, progress)
        break
      }
      case 'preview': {
        if (state.doc === null) throw new Error('Please open the file again.')
        result = adapter.preview(state.doc, req.section)
        break
      }
      case 'export': {
        // Always a fresh copy from disk, so the open document (used for previews) is never changed.
        progress({ stage: 'reading' })
        const doc = await adapter.read(req.source)
        const stats = adapter.convert(doc, req.sections, validateConfig(req.config), progress)
        progress({ stage: 'saving' })
        await adapter.write(doc, req.target)
        result = stats
        break
      }
    }
    send({ id: req.id, kind: 'result', result })
  } catch (e) {
    send({ id: req.id, kind: 'error', message: (e as Error).message || String(e) })
  }
}
