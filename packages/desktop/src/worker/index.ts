// @hf/desktop/worker: runs inside the app's background worker thread.
// The app's worker entry file is just: runWorker(myFormatAdapter)
import { parentPort } from 'node:worker_threads'
import type { FormatAdapter } from '@hf/core'
import { handleRequest, type WorkerState } from './handler'
import type { WorkerRequest } from '../protocol'

export { handleRequest, type WorkerState } from './handler'

export function runWorker<Doc>(adapter: FormatAdapter<Doc>): void {
  const port = parentPort
  if (!port) throw new Error('runWorker() must be called inside a worker thread')
  const state: WorkerState<Doc> = { doc: null }
  port.on('message', (req: WorkerRequest) => {
    void handleRequest(adapter, req, state, (m) => port.postMessage(m))
  })
}
