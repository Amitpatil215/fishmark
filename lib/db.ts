import { Bookmark } from '@/types/bookmark';

const DB_NAME = 'bookmarksDB';
const BOOKMARKS_STORE = 'bookmarks';
const PREFERENCES_STORE = 'preferences';
const DB_VERSION = 3;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Delete old stores if they exist
      if (db.objectStoreNames.contains(BOOKMARKS_STORE)) {
        db.deleteObjectStore(BOOKMARKS_STORE);
      }
      if (db.objectStoreNames.contains(PREFERENCES_STORE)) {
        db.deleteObjectStore(PREFERENCES_STORE);
      }

      // Create new stores
      db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id' });
      db.createObjectStore(PREFERENCES_STORE, { keyPath: 'key' });
    };
  });
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKMARKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKMARKS_STORE);

    // Clear existing bookmarks
    store.clear();

    // Store the entire bookmarks array as a single object
    store.put({ id: 'root', bookmarks });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadBookmarks(): Promise<Bookmark[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKMARKS_STORE, 'readonly');
    const store = transaction.objectStore(BOOKMARKS_STORE);
    const request = store.get('root');

    request.onsuccess = () => resolve(request.result?.bookmarks || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveThemePreference(theme: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PREFERENCES_STORE, 'readwrite');
    const store = transaction.objectStore(PREFERENCES_STORE);
    
    store.put({ key: 'theme', value: theme });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadThemePreference(): Promise<string | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PREFERENCES_STORE, 'readonly');
    const store = transaction.objectStore(PREFERENCES_STORE);
    const request = store.get('theme');

    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
} 