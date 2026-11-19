/**
 * A safe, in-memory keyed asynchronous mutex for serializing concurrent operations per key.
 *
 * NOTE: This mutex protects concurrency within a single Node.js process.
 * If running across multiple horizontal server instances or worker clusters, a distributed lock
 * (e.g., via Redis Redlock, PostgreSQL advisory locks, or database transaction locks) would be required.
 */
export class KeyedAsyncLock {
  private locks = new Map<string, Promise<void>>();

  /**
   * Executes an asynchronous task exclusively for the given key.
   * Concurrent calls with the same key are queued and executed sequentially in FIFO order.
   * Calls with different keys run concurrently without blocking each other.
   * Guaranteed cleanup in finally ensures no memory leaks.
   */
  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prevPromise = this.locks.get(key) || Promise.resolve();

    let releaseLock!: () => void;
    const currentPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Synchronously update the tail for this key
    this.locks.set(key, currentPromise);

    try {
      // Wait for any previous holder to complete (swallowing its errors so we proceed cleanly)
      await prevPromise.catch(() => {});
      return await fn();
    } finally {
      // If no new request arrived while we ran, remove key from map to prevent memory leaks
      if (this.locks.get(key) === currentPromise) {
        this.locks.delete(key);
      }
      releaseLock();
    }
  }

  /**
   * Returns the number of currently active or queued locks.
   */
  getActiveLockCount(): number {
    return this.locks.size;
  }
}

export const orderLock = new KeyedAsyncLock();

