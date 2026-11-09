import { mountFormatterApp } from '@hf/ui'
import { excelFormat } from '@hf/adapter-excel/format'
import { SheetGrid } from './SheetGrid'
import { help } from './help'
import './grid.css'

mountFormatterApp(document.getElementById('root')!, { format: excelFormat, Preview: SheetGrid, help })
