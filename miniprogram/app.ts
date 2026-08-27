/**
 * Bead Mini Program app entry.
 * Local-first: no server dependency, all processing on-device.
 */
App({
  globalData: {
    /** The last generated pattern result (in-memory only). */
    lastPatternResult: null as null | typeof import('./engine'),
  },
});
