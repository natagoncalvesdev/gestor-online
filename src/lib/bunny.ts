export function bunnyLibraryId(): string {
  return process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID?.trim() || "494330";
}

export function bunnyEmbedUrl(videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${bunnyLibraryId()}/${videoId}`;
}
