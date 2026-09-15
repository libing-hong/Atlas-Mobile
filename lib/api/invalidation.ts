const versions = new Map<string, number>();
const listeners = new Set<() => void>();
export function resourceVersion(path: string) { return versions.get(path) ?? 0; }
export function subscribeResources(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function invalidateProfileDependents() {
  for (const name of ['me', 'current-matters', 'journey', 'applications']) {
    const path = '/api/mobile/v1/' + name;
    versions.set(path, resourceVersion(path) + 1);
  }
  for (const listener of listeners) listener();
}
