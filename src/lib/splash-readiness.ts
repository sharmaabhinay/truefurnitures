/** Bound the entry overlay independently of slow fonts, media or store settings. */
export function releaseSplashWhenReady(ready: Promise<unknown>, release: () => void) {
  let active = true;
  const finish = () => {
    if (!active) return;
    active = false;
    clearTimeout(timer);
    release();
  };
  const timer = setTimeout(finish, 1800);
  void ready.then(finish, finish);
  return () => {
    active = false;
    clearTimeout(timer);
  };
}