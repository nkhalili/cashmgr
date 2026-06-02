import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';

const REPO = 'nkhalili/cashmgr';
const STORE_URL_IOS = 'itms-apps://itunes.apple.com/app/6766718825';
const STORE_URL_ANDROID = `https://play.google.com/store/apps/details?id=app.cashmgr`;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

function isNewer(remote: string, local: string): boolean {
  const parse = (v: string) =>
    v.replace(/^v/, '').split('-')[0].split('.').map(Number);
  const r = parse(remote);
  const l = parse(local);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    if ((r[i] ?? 0) > (l[i] ?? 0)) return true;
    if ((r[i] ?? 0) < (l[i] ?? 0)) return false;
  }
  return false;
}

export function useStoreUpdateCheck() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const lastChecked = useRef(0);

  async function check() {
    if (__DEV__) return;
    const now = Date.now();
    if (now - lastChecked.current < CHECK_INTERVAL_MS) return;
    lastChecked.current = now;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${REPO}/releases/latest`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      const { tag_name } = await res.json();
      const current = Constants.expoConfig?.version ?? '0.0.0';
      if (isNewer(tag_name, current)) {
        setUpdateVersion(tag_name.replace(/^v/, ''));
      }
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, []);

  function simulateUpdate() {
    setUpdateVersion('99.0.0');
    setDismissed(false);
  }

  const storeUrl = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;
  return {
    updateVersion: dismissed ? null : updateVersion,
    storeUrl,
    dismiss: () => setDismissed(true),
    simulateUpdate,
  };
}
