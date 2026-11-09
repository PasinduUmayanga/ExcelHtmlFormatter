/** Joins class names, skipping empty ones: cx('btn', small && 'small') → 'btn small'. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}
