// Watchlist.mjs
// localStorage-backed watchlist of coin ids (e.g. "bitcoin", "ethereum").
// Other modules import a single Watchlist instance and use it to query/toggle.

import { getLocalStorage, setLocalStorage } from './utils.mjs';

const STORAGE_KEY = 'coinwatch-watchlist';

export default class Watchlist {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    // Use a Set internally for O(1) lookup, but persist as a plain array.
    const initial = getLocalStorage(this.storageKey, []);
    this.ids = new Set(Array.isArray(initial) ? initial : []);
  }

  /** Return true if the given coin id is on the watchlist. */
  isWatched(coinId) {
    return this.ids.has(coinId);
  }

  /** How many coins are currently watched. */
  count() {
    return this.ids.size;
  }

  /**
   * Toggle membership for a coin id. Persists to localStorage.
   * Returns the new "watched" state (true if now on the list).
   */
  toggle(coinId) {
    if (!coinId) return false;
    if (this.ids.has(coinId)) {
      this.ids.delete(coinId);
    } else {
      this.ids.add(coinId);
    }
    this.#save();
    return this.ids.has(coinId);
  }

  /** Return a fresh array copy — useful for rendering. */
  list() {
    return [...this.ids];
  }

  #save() {
    setLocalStorage(this.storageKey, this.list());
  }
}
