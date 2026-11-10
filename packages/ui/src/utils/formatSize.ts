/** A file size for people: KB below a megabyte, MB above, one decimal. */
export const formatSize = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
