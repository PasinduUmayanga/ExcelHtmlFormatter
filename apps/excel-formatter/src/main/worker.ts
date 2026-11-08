// Background thread that does all the heavy Excel work, so the window never freezes.
import { runWorker } from '@hf/desktop/worker'
import { excelAdapter } from '@hf/adapter-excel'

runWorker(excelAdapter)
