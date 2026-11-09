import { useMemo } from 'react'
import { useFormatterApp } from '../router'
import { helpSections, helpTopic } from './search'

/** The running app's Help topics (parsed once) and their searchable sections. */
export function useHelp() {
  const { help } = useFormatterApp()
  return useMemo(() => {
    const topics = (help ?? []).map((source) => ({ ...helpTopic(source), appInfo: Boolean(source.appInfo) }))
    return { topics, sections: helpSections(topics) }
  }, [help])
}
