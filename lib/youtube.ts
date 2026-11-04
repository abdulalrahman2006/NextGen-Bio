/** Returns the 11-character video id from a YouTube link, or null if it is not one. */
export function youtubeId(url: string): string | null {
  const m = url.trim().match(
    /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/
  );
  return m ? m[1] : null;
}
