import { mountFormatterApp } from '@hf/ui'
import { excelFormat } from '@hf/adapter-excel/format'
import { SheetGrid } from './SheetGrid'
import './grid.css'

mountFormatterApp(document.getElementById('root')!, { format: excelFormat, Preview: SheetGrid })
