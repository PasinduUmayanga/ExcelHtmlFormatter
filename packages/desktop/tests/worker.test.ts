import { describe, expect, it } from 'vitest'
import { Worker } from 'node:worker_threads'
import { once } from 'node:events'
import {
  CANCELLED_MESSAGE,
  defaultConfig,
  emptyReport,
  type DocumentSummary,
  type FormatAdapter,
  type JobProgress
} from '@hf/core'
import { handleRequest, type WorkerState } from '../src/worker/handler'
import { JobWorker } from '../src/main/workerClient'
import { friendlyWorkerError, type WorkerMessage } from '../src/protocol'

/** A tiny in-memory format: a "document" is a list of named sections holding text. */
type FakeDoc = { sections: Record<string, string>; written?: string }
const files: Record<string, FakeDoc> = {
  'a.fake': { sections: { One: '<b>x</b>', Two: 'plain' } }
}
const fakeAdapter: FormatAdapter<FakeDoc, string> = {
  async read(path) {
    const doc = files[path]
    if (!doc) throw new Error('The file could not be found.')
    return structuredClone(doc)
  },
  summarize(doc, file, onProgress): DocumentSummary {
    onProgress?.({ stage: 'scanning', done: 0, total: 1 })
    return {
      file,
      sections: Object.keys(doc.sections).map((name) => ({
        name,
        state: 'visible',
        sizeLabel: '1',
        scan: { htmlCells: 0, tags: {} }
      }))
    }
  },
  preview(doc, section) {
    if (!(section in doc.sections)) throw new Error('No such section.')
    return doc.sections[section]
  },
  convert(doc, sections, _options, onProgress) {
    onProgress?.({ stage: 'converting', done: 1, total: 1 })
    sections.forEach((s) => (doc.sections[s] = doc.sections[s].replace(/<[^>]+>/g, '')))
    return {
      sections: sections.map((name) => ({ name, converted: 1 })),
      converted: sections.length,
      withLineBreaks: 0,
      unknownTags: [],
      linksAdded: 0,
      linksSkipped: 0,
      highlighted: 0,
      check: emptyReport()
    }
  },
  async write(doc, path) {
    files[path] = { ...doc, written: path }
  },
  check(_doc, sections, _options, onProgress) {
    onProgress?.({ stage: 'checking', done: 1, total: 1 })
    return { ...emptyReport(), checked: sections.length, complete: sections.length }
  },
  snapshot: (doc) => structuredClone(doc.sections),
  verify(saved, snapshot, sections) {
    const before = snapshot as Record<string, string>
    const changed = Object.keys(before).filter((s) => !sections.includes(s) && saved.sections[s] !== before[s])
    return { compared: Object.keys(saved.sections).length, differences: changed.length, items: [], truncated: false }
  }
}

const run = async (req: Parameters<typeof handleRequest>[1], state: WorkerState<FakeDoc>) => {
  const sent: WorkerMessage[] = []
  await handleRequest(fakeAdapter, req, state, (m) => sent.push(m))
  return sent
}

describe('handleRequest (worker logic, with any format adapter)', () => {
  it('loads a document, reports progress, then serves previews from memory', async () => {
    const state: WorkerState<FakeDoc> = { doc: null }
    const sent = await run({ id: 1, type: 'load', file: { path: 'a.fake', name: 'a.fake', sizeBytes: 1 } }, state)
    expect(sent.map((m) => m.kind)).toEqual(['progress', 'progress', 'result'])
    expect((sent[0] as { progress: JobProgress }).progress).toEqual({ stage: 'reading' })
    expect(sent[2]).toMatchObject({ id: 1, result: { sections: [{ name: 'One' }, { name: 'Two' }] } })
    expect(await run({ id: 2, type: 'preview', section: 'One' }, state)).toEqual([
      { id: 2, kind: 'result', result: '<b>x</b>' }
    ])
  })

  it('exports a converted fresh copy, leaving the open document untouched', async () => {
    const state: WorkerState<FakeDoc> = { doc: structuredClone(files['a.fake']) }
    const sent = await run(
      { id: 3, type: 'export', source: 'a.fake', target: 'out.fake', sections: ['One'], config: defaultConfig() },
      state
    )
    const stages = sent.filter((m) => m.kind === 'progress').map((m) => (m as { progress: JobProgress }).progress.stage)
    expect(stages).toEqual(['reading', 'converting', 'saving'])
    expect(sent[sent.length - 1]).toMatchObject({ id: 3, kind: 'result', result: { converted: 1 } })
    expect(files['out.fake']).toMatchObject({ sections: { One: 'x', Two: 'plain' }, written: 'out.fake' })
    expect(state.doc!.sections.One).toBe('<b>x</b>')
  })

  it('checks the open document, then verifies a saved file against the original', async () => {
    const state: WorkerState<FakeDoc> = { doc: structuredClone(files['a.fake']) }
    const config = defaultConfig()
    const checked = await run({ id: 6, type: 'check', sections: ['One'], config }, state)
    expect(checked[checked.length - 1]).toMatchObject({ kind: 'result', result: { checked: 1, complete: 1 } })
    expect(state.doc!.sections.One).toBe('<b>x</b>')

    await run({ id: 7, type: 'export', source: 'a.fake', target: 'v.fake', sections: ['One'], config }, state)
    files['v.fake'].sections.Two = 'tampered'
    const verified = await run({ id: 8, type: 'verify', target: 'v.fake', sections: ['One'], config }, state)
    expect((verified[0] as { progress: JobProgress }).progress.stage).toBe('verifying')
    expect(verified[verified.length - 1]).toMatchObject({ kind: 'result', result: { compared: 2, differences: 1 } })
    // The snapshot is used once: a second verify has nothing to compare with.
    const again = await run({ id: 9, type: 'verify', target: 'v.fake', sections: ['One'], config }, state)
    expect(again).toEqual([{ id: 9, kind: 'error', message: 'There is no saved file to check.' }])
    const noDoc = await run({ id: 10, type: 'check', sections: ['One'], config }, { doc: null })
    expect(noDoc).toEqual([{ id: 10, kind: 'error', message: 'Please open the file again.' }])
  })

  it('turns failures into an error for that request', async () => {
    expect(await run({ id: 4, type: 'preview', section: 'One' }, { doc: null })).toEqual([
      { id: 4, kind: 'error', message: 'Please open the file again.' }
    ])
    const missing = await run(
      { id: 5, type: 'load', file: { path: 'nope', name: 'nope', sizeBytes: 0 } },
      { doc: null }
    )
    expect(missing[missing.length - 1]).toEqual({ id: 5, kind: 'error', message: 'The file could not be found.' })
  })
})

/** A real worker thread that answers like ours: progress, then a result (or waits forever on "slow"). */
const echoWorker = () =>
  new Worker(
    `const { parentPort } = require('node:worker_threads')
     parentPort.on('message', (req) => {
       if (req.section === 'slow') return
       parentPort.postMessage({ id: req.id, kind: 'progress', progress: { stage: 'reading' } })
       parentPort.postMessage({ id: req.id, kind: 'result', result: 'preview of ' + req.section })
     })`,
    { eval: true }
  )

describe('JobWorker (main-process side of a worker thread)', () => {
  it('sends requests and receives progress and results', async () => {
    const worker = new JobWorker(echoWorker)
    const progress: JobProgress[] = []
    await expect(worker.request({ type: 'preview', section: 'A' }, (p) => progress.push(p))).resolves.toBe(
      'preview of A'
    )
    expect(progress).toEqual([{ stage: 'reading' }])
    worker.terminate('done')
  })

  it('Cancel stops the thread and rejects the running request', async () => {
    let thread!: Worker
    const worker = new JobWorker(() => (thread = echoWorker()))
    const exited = once(thread, 'exit')
    const pending = worker.request({ type: 'preview', section: 'slow' })
    worker.terminate()
    await expect(pending).rejects.toThrow(CANCELLED_MESSAGE)
    await expect(worker.request({ type: 'preview', section: 'A' })).rejects.toThrow(CANCELLED_MESSAGE)
    // Wait for the thread to really end, so its exit handling always runs before the test finishes
    // (otherwise coverage depends on timing and differs between machines).
    await exited
  })

  it('reports a thread that stops by itself', async () => {
    const worker = new JobWorker(() => new Worker(`process.exit(3)`, { eval: true }))
    await expect(worker.request({ type: 'preview', section: 'A' })).rejects.toThrow(
      'The background task stopped unexpectedly. Please try again.'
    )
  })

  it('reports a thread that crashes', async () => {
    const crashing = () =>
      new Worker(`require('node:worker_threads').parentPort.on('message', () => { throw new Error('boom') })`, {
        eval: true
      })
    const worker = new JobWorker(crashing)
    await expect(worker.request({ type: 'preview', section: 'A' })).rejects.toThrow(
      'Something went wrong while processing the file: boom'
    )
  })
})

describe('friendlyWorkerError', () => {
  it('explains running out of memory', () => {
    expect(friendlyWorkerError(Object.assign(new Error('x'), { code: 'ERR_WORKER_OUT_OF_MEMORY' }))).toMatch(
      /too large/
    )
    expect(friendlyWorkerError(new Error('boom'))).toBe('Something went wrong while processing the file: boom')
  })
})
