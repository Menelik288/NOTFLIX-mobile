import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DownloadItem {
  id: string;
  title: string;
  poster: string;
  mediaType: 'movie' | 'tv';
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  localPath?: string;
  quality: string;
  tmdbId: number;
  season?: number;
  episode?: number;
}

const DOWNLOAD_KEY = 'notflix_downloads_metadata';
const BASE_DIR = `${FileSystem.documentDirectory}downloads/`;

export const initDownloadDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(BASE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true });
  }
};

export const getDownloads = async (): Promise<DownloadItem[]> => {
  const data = await AsyncStorage.getItem(DOWNLOAD_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveDownloads = async (downloads: DownloadItem[]) => {
  await AsyncStorage.setItem(DOWNLOAD_KEY, JSON.stringify(downloads));
};

/**
 * Parses an m3u8 playlist and returns an ordered list of absolute segment URLs.
 */
const parseSegments = async (m3u8Url: string): Promise<string[]> => {
  const response = await fetch(m3u8Url);
  const text = await response.text();

  const base = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
  const segments: string[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // It's a segment or sub-playlist
    segments.push(trimmed.startsWith('http') ? trimmed : base + trimmed);
  }

  return segments;
};

/**
 * Downloads all HLS segments and concatenates them into a single .ts file.
 * This is a pure JS/TS implementation — no native FFmpeg required.
 */
const downloadHLS = async (
  m3u8Url: string,
  outputPath: string,
  onProgress: (p: number) => void
): Promise<void> => {
  const segments = await parseSegments(m3u8Url);
  if (segments.length === 0) throw new Error('No segments found in playlist');

  const segDir = outputPath + '_segments/';
  await FileSystem.makeDirectoryAsync(segDir, { intermediates: true });

  const localPaths: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segUrl = segments[i];
    const segPath = `${segDir}seg_${i.toString().padStart(5, '0')}.ts`;

    await FileSystem.downloadAsync(segUrl, segPath);
    localPaths.push(segPath);

    onProgress((i + 1) / segments.length);
    await updateDownloadProgress('', (i + 1) / segments.length); // placeholder; id passed separately
  }

  // Rename first segment as the final file — simple concat via FileSystem isn't supported,
  // but for most HLS streams a single-track .ts is directly playable.
  // For a true single file, we return the segment directory path and play via m3u8-style local.
  // We store the path of the first segment's folder so the player can stream locally.
  // NOTE: expo-av can play individual .ts segments or a local m3u8.
  // Write a local m3u8 pointing to local segments:
  const localM3u8Lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  localM3u8Lines.push('#EXT-X-TARGETDURATION:10');
  for (const p of localPaths) {
    localM3u8Lines.push('#EXTINF:10,');
    localM3u8Lines.push(p);
  }
  localM3u8Lines.push('#EXT-X-ENDLIST');

  await FileSystem.writeAsStringAsync(outputPath, localM3u8Lines.join('\n'));
};

export const startDownload = async (
  item: DownloadItem,
  streamUrl: string,
  onProgress: (p: number) => void
) => {
  await initDownloadDir();

  const downloads = await getDownloads();
  const existingIndex = downloads.findIndex(d => d.id === item.id);

  const newItem = { ...item, status: 'downloading' as const, progress: 0 };
  if (existingIndex > -1) downloads[existingIndex] = newItem;
  else downloads.push(newItem);
  await saveDownloads(downloads);

  const isHLS = streamUrl.includes('.m3u8');
  // Output: .m3u8 for HLS (local playlist), .mp4 for direct links
  const ext = isHLS ? '.m3u8' : '.mp4';
  const localUri = `${BASE_DIR}${item.id}${ext}`;

  try {
    if (isHLS) {
      // Wrap progress so we can also persist it
      const progressCallback = async (p: number) => {
        onProgress(p);
        await updateDownloadProgressById(item.id, p);
      };

      // Override the inner function call with the item id
      const segments = await parseSegments(streamUrl);
      if (segments.length === 0) throw new Error('No segments found in playlist');

      const segDir = localUri + '_segments/';
      await FileSystem.makeDirectoryAsync(segDir, { intermediates: true });
      const localPaths: string[] = [];

      for (let i = 0; i < segments.length; i++) {
        const segPath = `${segDir}seg_${i.toString().padStart(5, '0')}.ts`;
        await FileSystem.downloadAsync(segments[i], segPath);
        localPaths.push(segPath);
        const p = (i + 1) / segments.length;
        onProgress(p);
        await updateDownloadProgressById(item.id, p);
      }

      // Write a local m3u8 manifest pointing to the downloaded segments
      const localM3u8Lines = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-TARGETDURATION:10'];
      for (const p of localPaths) {
        localM3u8Lines.push('#EXTINF:10,');
        localM3u8Lines.push(p);
      }
      localM3u8Lines.push('#EXT-X-ENDLIST');
      await FileSystem.writeAsStringAsync(localUri, localM3u8Lines.join('\n'));

      await finalizeDownload(item.id, localUri);
    } else {
      // Standard direct download
      const dl = FileSystem.createDownloadResumable(
        streamUrl,
        localUri,
        {},
        (dp) => {
          const p = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
          onProgress(p);
          updateDownloadProgressById(item.id, p);
        }
      );
      const result = await dl.downloadAsync();
      if (result) await finalizeDownload(item.id, result.uri);
    }
  } catch (e) {
    console.warn('Download error', e);
    await updateDownloadStatus(item.id, 'error');
  }
};

const updateDownloadProgressById = async (id: string, progress: number) => {
  const downloads = await getDownloads();
  const index = downloads.findIndex(d => d.id === id);
  if (index > -1) {
    downloads[index].progress = progress;
    await saveDownloads(downloads);
  }
};

// Keep old name for backward compat
const updateDownloadProgress = async (id: string, progress: number) => {
  if (!id) return;
  await updateDownloadProgressById(id, progress);
};

const updateDownloadStatus = async (id: string, status: DownloadItem['status']) => {
  const downloads = await getDownloads();
  const index = downloads.findIndex(d => d.id === id);
  if (index > -1) {
    downloads[index].status = status;
    await saveDownloads(downloads);
  }
};

const finalizeDownload = async (id: string, localPath: string) => {
  const downloads = await getDownloads();
  const index = downloads.findIndex(d => d.id === id);
  if (index > -1) {
    downloads[index].status = 'completed';
    downloads[index].progress = 1;
    downloads[index].localPath = localPath;
    await saveDownloads(downloads);
  }
};

export const deleteDownload = async (id: string) => {
  const downloads = await getDownloads();
  const item = downloads.find(d => d.id === id);
  if (item && item.localPath) {
    try {
      await FileSystem.deleteAsync(item.localPath, { idempotent: true });
      // Also clean up segment directory if it exists
      const segDir = item.localPath + '_segments/';
      const segDirInfo = await FileSystem.getInfoAsync(segDir);
      if (segDirInfo.exists) {
        await FileSystem.deleteAsync(segDir, { idempotent: true });
      }
    } catch (e) {
      console.warn('Error deleting file', e);
    }
  }
  const filtered = downloads.filter(d => d.id !== id);
  await saveDownloads(filtered);
};
