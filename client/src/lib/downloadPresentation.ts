export function formatDownloadFileType(filename: string) {
  const extension = filename.split(".").pop()?.trim().toUpperCase();
  return extension && extension !== filename.toUpperCase() ? `${extension} FILE` : "DIGITAL FILE";
}

export function downloadCountLabel(count: number) {
  return `${count} ${count === 1 ? "protected file" : "protected files"}`;
}
