import { useState, useRef, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system/legacy';

export interface StreamQuality {
  label: string;
  url: string;
  resolution?: string;
}

export const selectBestStream = async (qualities: StreamQuality[]): Promise<StreamQuality> => {
  if (qualities.length === 0) throw new Error('No qualities found');

  try {
    // 1. Check Network (Wi-Fi vs Cellular)
    const networkState = await Network.getNetworkStateAsync();
    const isWifi = networkState.type === Network.NetworkStateType.WIFI;
    
    // 2. Check Storage
    const freeSpace = await FileSystem.getFreeDiskStorageAsync();
    const isLowStorage = freeSpace < 1024 * 1024 * 1024; // Less than 1GB

    // Sort qualities: Highest resolution first (e.g., 1080p > 720p > 480p)
    const sorted = [...qualities].sort((a, b) => {
      const resA = parseInt(a.label) || 0;
      const resB = parseInt(b.label) || 0;
      return resB - resA;
    });

    // Strategy:
    // Wi-Fi + High Storage -> 1080p (Highest)
    // Wi-Fi + Low Storage -> 720p (Mid)
    // Cellular -> 480p (Data Saving)
    
    if (isWifi) {
      if (!isLowStorage) {
        return sorted[0]; // Highest
      } else {
        return sorted.find(q => q.label.includes('720')) || sorted[0];
      }
    } else {
      // Cellular mode: favor 480p or lowest available
      return sorted.find(q => q.label.includes('480')) || sorted[sorted.length - 1];
    }
  } catch (e) {
    return qualities[0]; // Fallback
  }
};

export const useStreamSniffer = () => {
  const [isSniffing, setIsSniffing] = useState(false);
  const [qualities, setQualities] = useState<StreamQuality[]>([]);
  const snifferWebViewRef = useRef<WebView>(null);

  const sniff = useCallback((url: string) => {
    setIsSniffing(true);
    setQualities([]);
    // The WebView will load the player and our injected script will catch the m3u8
  }, []);

  const injectedJavaScript = `
    (function() {
      // 1. Intercept Requests
      const originalFetch = window.fetch;
      const originalXHR = window.XMLHttpRequest.prototype.open;

      function checkUrl(url) {
        if (typeof url === 'string' && url.includes('.m3u8')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'M3U8_FOUND', url: url }));
        }
      }

      window.fetch = async (...args) => {
        checkUrl(args[0]);
        return originalFetch(...args);
      };

      window.XMLHttpRequest.prototype.open = function(method, url) {
        checkUrl(url);
        return originalXHR.apply(this, arguments);
      };

      // 2. Auto-Click Play Button
      // This is crucial because VidSrc often won't load the m3u8 until play is clicked
      function tryClickPlay() {
        const selectors = [
          'button', '.play-button', '#play', '.vjs-big-play-button', 
          '.play_button', '[aria-label="Play"]', '.jw-display-icon-container'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.innerText.toLowerCase().includes('play') || el.offsetWidth > 0) {
              el.click();
            }
          });
        });

        // Also try clicking the center of the screen as a fallback
        const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        if (centerEl) centerEl.click();
      }

      // Keep trying for a few seconds
      let attempts = 0;
      const interval = setInterval(() => {
        tryClickPlay();
        attempts++;
        if (attempts > 10) clearInterval(interval);
      }, 1000);
    })();
    true;
  `;

  const onMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'M3U8_FOUND') {
        const masterUrl = data.url;
        
        // Return the master URL immediately as "Auto/Original" fallback
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'QUALITY_FOUND', 
          quality: { label: 'Original', url: masterUrl } 
        }));

        try {
          const response = await fetch(masterUrl);
          const text = await response.text();
          const parsedQualities = parseM3U8(text, masterUrl);
          
          if (parsedQualities.length > 0) {
            setQualities(parsedQualities);
            // Send the best quality found back immediately
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'QUALITY_FOUND', 
              quality: parsedQualities[0] 
            }));
          }
          setIsSniffing(false);
        } catch (e) {
          console.error('Failed to parse m3u8', e);
        }
      }
    } catch (e) {
      console.error('Sniffer message error', e);
    }
  };

  const parseM3U8 = (content: string, baseUrl: string): StreamQuality[] => {
    const lines = content.split('\n');
    const results: StreamQuality[] = [];
    let currentRes = '';

    const getAbsoluteUrl = (path: string, base: string) => {
      if (path.startsWith('http')) return path;
      const urlObj = new URL(base);
      return `${urlObj.origin}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXT-X-STREAM-INF')) {
        const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
        if (resMatch) currentRes = resMatch[1].split('x')[1] + 'p';
      } else if (line.endsWith('.m3u8')) {
        results.push({
          label: currentRes || 'Auto',
          url: getAbsoluteUrl(line, baseUrl),
          resolution: currentRes
        });
        currentRes = '';
      }
    }

    // If no variants found, it might be a direct media playlist
    if (results.length === 0) {
      results.push({ label: 'Original', url: baseUrl });
    }

    return results;
  };

  return { sniff, isSniffing, qualities, onMessage, injectedJavaScript };
};
