// IndexedDB Cache for offline memory storage
// Pre-fetches next 3 memories for offline access

const DB_NAME = "echo-adaptive";
const DB_VERSION = 1;
const STORE_NAME = "memories";

interface CachedMemory {
  id: string;
  imageBlob: Blob;
  audioBlob?: Blob;
  date: string;
  location: string;
  script: string;
  cachedAt: number;
}

class MemoryCache {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  }

  async cacheMemory(memory: CachedMemory): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(memory);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getMemory(id: string): Promise<CachedMemory | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async getAllMemories(): Promise<CachedMemory[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? []);
    });
  }

  async prefetchMemories(
    urls: {
      id: string;
      imageUrl: string;
      audioUrl?: string;
      date: string;
      location: string;
      script: string;
    }[],
  ): Promise<void> {
    for (const memory of urls.slice(0, 3)) {
      // Pre-fetch next 3
      try {
        const imageResponse = await fetch(memory.imageUrl);
        const imageBlob = await imageResponse.blob();

        let audioBlob: Blob | undefined;
        if (memory.audioUrl) {
          const audioResponse = await fetch(memory.audioUrl);
          audioBlob = await audioResponse.blob();
        }

        await this.cacheMemory({
          id: memory.id,
          imageBlob,
          audioBlob,
          date: memory.date,
          location: memory.location,
          script: memory.script,
          cachedAt: Date.now(),
        });
      } catch (error) {
        console.error("Failed to cache memory:", memory.id, error);
      }
    }
  }

  async clearOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const memories = await this.getAllMemories();
    const cutoff = Date.now() - maxAge;

    for (const memory of memories) {
      if (memory.cachedAt < cutoff) {
        await this.deleteMemory(memory.id);
      }
    }
  }

  async deleteMemory(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const memoryCache = new MemoryCache();
export default memoryCache;
