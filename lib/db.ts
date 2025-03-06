import { Bookmark } from '@/types/bookmark';

const DB_NAME = 'bookmarksDB';
const BOOKMARKS_STORE = 'bookmarks';
const PREFERENCES_STORE = 'preferences';
const HISTORY_STORE = 'history';
const DB_VERSION = 6;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      
      // Ensure history store exists even if we didn't upgrade the database
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        // Close the database and reopen with a higher version to create the store
        db.close();
        const upgradeRequest = indexedDB.open(DB_NAME, DB_VERSION + 1);
        
        upgradeRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(HISTORY_STORE)) {
            db.createObjectStore(HISTORY_STORE, { keyPath: 'timestamp' });
          }
        };
        
        upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);
        upgradeRequest.onerror = () => reject(upgradeRequest.error);
      } else {
        resolve(db);
      }
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Delete old stores if they exist
      if (db.objectStoreNames.contains(BOOKMARKS_STORE)) {
        db.deleteObjectStore(BOOKMARKS_STORE);
      }
      if (db.objectStoreNames.contains(PREFERENCES_STORE)) {
        db.deleteObjectStore(PREFERENCES_STORE);
      }
      if (db.objectStoreNames.contains(HISTORY_STORE)) {
        db.deleteObjectStore(HISTORY_STORE);
      }

      // Create new stores
      const bookmarkStore = db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id' });
      // Add indexes for efficient querying
      bookmarkStore.createIndex('parentId', 'parentId', { unique: false });
      
      db.createObjectStore(PREFERENCES_STORE, { keyPath: 'key' });
      
      // Create history store for undo/redo support
      db.createObjectStore(HISTORY_STORE, { keyPath: 'timestamp' });
    };
  });
}

// Helper function to flatten bookmark tree into array
function flattenBookmarks(bookmarks: Bookmark[], parentId: string | null = null): any[] {
  return bookmarks.flatMap((bookmark, index) => {
    const children = bookmark.children || [];
    const flatBookmark = {
      ...bookmark,
      parentId,
      order: index, // Add order property to track position within parent
      children: undefined // Remove children array as we'll store parent-child relationships via parentId
    };
    
    return [flatBookmark, ...flattenBookmarks(children, bookmark.id)];
  });
}

// Helper function to reconstruct bookmark tree from flat array
function reconstructBookmarkTree(flatBookmarks: any[]): Bookmark[] {
  const bookmarkMap = new Map();
  const rootBookmarks: Bookmark[] = [];
  const childrenMap = new Map<string | null, any[]>();
  
  // Group bookmarks by parentId
  flatBookmarks.forEach(bookmark => {
    const { parentId } = bookmark;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    // Use non-null assertion since we just ensured the array exists
    childrenMap.get(parentId)!.push(bookmark);
  });
  
  // Sort children by order property
  childrenMap.forEach((children, parentId) => {
    children.sort((a, b) => a.order - b.order);
  });
  
  // First pass: create all bookmark objects without children
  flatBookmarks.forEach(bookmark => {
    const { parentId, order, ...bookmarkData } = bookmark;
    bookmarkMap.set(bookmark.id, { ...bookmarkData, children: [] });
  });
  
  // Second pass: build the tree structure
  const rootChildren = childrenMap.get(null) || [];
  rootChildren.forEach(bookmark => {
    const bookmarkObj = bookmarkMap.get(bookmark.id);
    if (bookmarkObj) {
      rootBookmarks.push(bookmarkObj);
      
      // Add children recursively
      const addChildren = (parentId: string) => {
        const children = childrenMap.get(parentId) || [];
        children.forEach(child => {
          const childObj = bookmarkMap.get(child.id);
          const parent = bookmarkMap.get(parentId);
          if (parent && childObj) {
            parent.children.push(childObj);
            addChildren(child.id);
          }
        });
      };
      
      addChildren(bookmark.id);
    }
  });
  
  return rootBookmarks;
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKMARKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKMARKS_STORE);

    // Clear existing bookmarks
    store.clear();

    // Flatten the bookmark tree and store each bookmark individually
    const flatBookmarks = flattenBookmarks(bookmarks);
    
    // Add each bookmark to the store
    flatBookmarks.forEach(bookmark => {
      store.add(bookmark);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadBookmarks(): Promise<Bookmark[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKMARKS_STORE, 'readonly');
    const store = transaction.objectStore(BOOKMARKS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const flatBookmarks = request.result || [];
      const bookmarkTree = reconstructBookmarkTree(flatBookmarks);
      resolve(bookmarkTree);
    };
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

export async function reorderBookmark(bookmarkId: string, newIndex: number, parentId: string | null = null): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKMARKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKMARKS_STORE);
    const index = store.index('parentId');
    
    // First, verify that the bookmark exists
    const bookmarkRequest = store.get(bookmarkId);
    
    bookmarkRequest.onsuccess = () => {
      const bookmark = bookmarkRequest.result;
      if (!bookmark) {
        reject(new Error(`Bookmark with ID ${bookmarkId} not found`));
        return;
      }
      
      // Get all siblings with the same parent
      if (parentId === null) {
        // For null parentId, we need to use a cursor to find items with null parentId
        // since IDBKeyRange.only(null) is not valid
        const siblings: any[] = [];
        const cursorRequest = index.openCursor();
        
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            // Check if parentId is null
            if (cursor.value.parentId === null) {
              siblings.push(cursor.value);
            }
            cursor.continue();
          } else {
            // Cursor is done, now process the siblings
            processSiblings(siblings);
          }
        };
        
        cursorRequest.onerror = () => reject(cursorRequest.error);
      } else {
        // For non-null parentId, we can use getAll with the parentId
        const siblingsRequest = index.getAll(parentId);
        
        siblingsRequest.onsuccess = () => {
          const siblings = siblingsRequest.result;
          processSiblings(siblings);
        };
        
        siblingsRequest.onerror = () => reject(siblingsRequest.error);
      }
    };
    
    bookmarkRequest.onerror = () => reject(bookmarkRequest.error);
    
    // Process the siblings once we have them
    function processSiblings(siblings: any[]) {
      // Sort siblings by current order
      siblings.sort((a, b) => a.order - b.order);
      
      // Find the bookmark to move
      const bookmarkIndex = siblings.findIndex(b => b.id === bookmarkId);
      
      // If the bookmark is not found among siblings, it might be because
      // the bookmark is a parent item and not directly in the siblings list
      if (bookmarkIndex === -1) {
        // Get the bookmark directly and update its order
        const directUpdateRequest = store.get(bookmarkId);
        
        directUpdateRequest.onsuccess = () => {
          const bookmarkToUpdate = directUpdateRequest.result;
          if (!bookmarkToUpdate) {
            reject(new Error(`Bookmark with ID ${bookmarkId} not found`));
            return;
          }
          
          // Ensure the bookmark has the correct parentId
          if (bookmarkToUpdate.parentId !== parentId) {
            // If the parentId doesn't match, update it
            bookmarkToUpdate.parentId = parentId;
          }
          
          // Set the order based on the new index
          bookmarkToUpdate.order = newIndex;
          
          // Update the bookmark
          const putRequest = store.put(bookmarkToUpdate);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };
        
        directUpdateRequest.onerror = () => reject(directUpdateRequest.error);
        return;
      }
      
      // Remove the bookmark from its current position
      const [bookmark] = siblings.splice(bookmarkIndex, 1);
      
      // Insert it at the new position
      siblings.splice(newIndex, 0, bookmark);
      
      // Update order for all siblings
      const updatePromises = siblings.map((sibling, idx) => {
        return new Promise<void>((resolveUpdate, rejectUpdate) => {
          const updateRequest = store.get(sibling.id);
          
          updateRequest.onsuccess = () => {
            const bookmarkToUpdate = updateRequest.result;
            bookmarkToUpdate.order = idx;
            
            const putRequest = store.put(bookmarkToUpdate);
            putRequest.onsuccess = () => resolveUpdate();
            putRequest.onerror = () => rejectUpdate(putRequest.error);
          };
          
          updateRequest.onerror = () => rejectUpdate(updateRequest.error);
        });
      });
      
      Promise.all(updatePromises)
        .then(() => resolve())
        .catch(error => reject(error));
    }
  });
}

/**
 * Move a bookmark to a different parent
 * @param bookmarkId ID of the bookmark to move
 * @param newParentId ID of the new parent, or null for root level
 * @param newIndex Position within the new parent's children
 */
export async function moveBookmarkToParent(
  bookmarkId: string, 
  newParentId: string | null, 
  newIndex: number = -1
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKMARKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKMARKS_STORE);
    
    // Get the bookmark to move
    const bookmarkRequest = store.get(bookmarkId);
    
    bookmarkRequest.onsuccess = () => {
      const bookmark = bookmarkRequest.result;
      if (!bookmark) {
        reject(new Error('Bookmark not found'));
        return;
      }
      
      const oldParentId = bookmark.parentId;
      
      // Get siblings at the new parent
      const index = store.index('parentId');
      
      // Function to process new siblings once we have them
      const processNewSiblings = (newSiblings: any[]) => {
        // Sort siblings by current order
        newSiblings.sort((a, b) => a.order - b.order);
        
        // Update the bookmark's parent
        bookmark.parentId = newParentId;
        
        // Determine the new index
        const insertIndex = newIndex >= 0 && newIndex <= newSiblings.length 
          ? newIndex 
          : newSiblings.length;
        
        // Insert the bookmark at the new position
        newSiblings.splice(insertIndex, 0, bookmark);
        
        // Update orders for all siblings in the new parent
        const updateNewSiblingsPromises = newSiblings.map((sibling, idx) => {
          return new Promise<void>((resolveUpdate, rejectUpdate) => {
            // If it's the moved bookmark, update it directly
            if (sibling.id === bookmarkId) {
              sibling.order = idx;
              const putRequest = store.put(sibling);
              putRequest.onsuccess = () => resolveUpdate();
              putRequest.onerror = () => rejectUpdate(putRequest.error);
              return;
            }
            
            // Otherwise, get the latest version and update it
            const updateRequest = store.get(sibling.id);
            updateRequest.onsuccess = () => {
              const bookmarkToUpdate = updateRequest.result;
              bookmarkToUpdate.order = idx;
              
              const putRequest = store.put(bookmarkToUpdate);
              putRequest.onsuccess = () => resolveUpdate();
              putRequest.onerror = () => rejectUpdate(putRequest.error);
            };
            updateRequest.onerror = () => rejectUpdate(updateRequest.error);
          });
        });
        
        // Function to process old siblings
        const processOldSiblings = (oldSiblings: any[]) => {
          // Sort siblings by current order
          oldSiblings.sort((a, b) => a.order - b.order);
          
          // Filter out the moved bookmark
          const filteredOldSiblings = oldSiblings.filter(b => b.id !== bookmarkId);
          
          // Update orders for all siblings in the old parent
          const updateOldSiblingsPromises = filteredOldSiblings.map((sibling, idx) => {
            return new Promise<void>((resolveUpdate, rejectUpdate) => {
              const updateRequest = store.get(sibling.id);
              updateRequest.onsuccess = () => {
                const bookmarkToUpdate = updateRequest.result;
                bookmarkToUpdate.order = idx;
                
                const putRequest = store.put(bookmarkToUpdate);
                putRequest.onsuccess = () => resolveUpdate();
                putRequest.onerror = () => rejectUpdate(putRequest.error);
              };
              updateRequest.onerror = () => rejectUpdate(updateRequest.error);
            });
          });
          
          // Wait for all updates to complete
          Promise.all([
            ...updateNewSiblingsPromises,
            ...updateOldSiblingsPromises
          ])
            .then(() => resolve())
            .catch(error => reject(error));
        };
        
        // If the bookmark was moved from another parent, update the old siblings too
        if (oldParentId !== newParentId) {
          if (oldParentId === null) {
            // For null oldParentId, use cursor
            const oldSiblings: any[] = [];
            const oldCursorRequest = index.openCursor();
            
            oldCursorRequest.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result;
              
              if (cursor) {
                // Check if parentId is null
                if (cursor.value.parentId === null) {
                  oldSiblings.push(cursor.value);
                }
                cursor.continue();
              } else {
                // Cursor is done, process the old siblings
                processOldSiblings(oldSiblings);
              }
            };
            
            oldCursorRequest.onerror = () => reject(oldCursorRequest.error);
          } else {
            // For non-null oldParentId, use getAll
            const oldSiblingsRequest = index.getAll(oldParentId);
            
            oldSiblingsRequest.onsuccess = () => {
              processOldSiblings(oldSiblingsRequest.result);
            };
            
            oldSiblingsRequest.onerror = () => reject(oldSiblingsRequest.error);
          }
        } else {
          // If the bookmark was moved within the same parent, just update the new siblings
          Promise.all(updateNewSiblingsPromises)
            .then(() => resolve())
            .catch(error => reject(error));
        }
      };
      
      // Get new siblings
      if (newParentId === null) {
        // For null newParentId, use cursor
        const newSiblings: any[] = [];
        const newCursorRequest = index.openCursor();
        
        newCursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            // Check if parentId is null
            if (cursor.value.parentId === null) {
              newSiblings.push(cursor.value);
            }
            cursor.continue();
          } else {
            // Cursor is done, process the new siblings
            processNewSiblings(newSiblings);
          }
        };
        
        newCursorRequest.onerror = () => reject(newCursorRequest.error);
      } else {
        // For non-null newParentId, use getAll
        const newSiblingsRequest = index.getAll(newParentId);
        
        newSiblingsRequest.onsuccess = () => {
          processNewSiblings(newSiblingsRequest.result);
        };
        
        newSiblingsRequest.onerror = () => reject(newSiblingsRequest.error);
      }
    };
    
    bookmarkRequest.onerror = () => reject(bookmarkRequest.error);
  });
}

/**
 * Batch update multiple bookmarks at once for better performance
 * @param updates Array of bookmark updates to apply
 */
export async function batchUpdateBookmarks(updates: Array<{ id: string, changes: Partial<Bookmark> }>): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKMARKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKMARKS_STORE);
    
    const updatePromises = updates.map(({ id, changes }) => {
      return new Promise<void>((resolveUpdate, rejectUpdate) => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          const bookmark = request.result;
          if (!bookmark) {
            resolveUpdate(); // Skip if bookmark doesn't exist
            return;
          }
          
          // Apply changes
          const updatedBookmark = { ...bookmark, ...changes };
          
          const putRequest = store.put(updatedBookmark);
          putRequest.onsuccess = () => resolveUpdate();
          putRequest.onerror = () => rejectUpdate(putRequest.error);
        };
        
        request.onerror = () => rejectUpdate(request.error);
      });
    });
    
    Promise.all(updatePromises)
      .then(() => resolve())
      .catch(error => reject(error));
  });
}

/**
 * Add transaction logging for undo/redo support
 */
const MAX_HISTORY = 50;

// Initialize history store during DB initialization
export async function initHistoryStore(db: IDBDatabase): Promise<void> {
  if (!db.objectStoreNames.contains(HISTORY_STORE)) {
    db.createObjectStore(HISTORY_STORE, { keyPath: 'timestamp' });
  }
}

// Log a transaction for undo/redo
export async function logTransaction(action: string, data: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    
    // Create a transaction record
    const record = {
      timestamp: Date.now(),
      action,
      data
    };
    
    // Add the record
    const addRequest = store.add(record);
    
    addRequest.onsuccess = () => {
      // Trim history if it exceeds the maximum size
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        if (count > MAX_HISTORY) {
          // Get all records
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;
            // Sort by timestamp
            records.sort((a, b) => a.timestamp - b.timestamp);
            // Delete oldest records
            const toDelete = records.slice(0, count - MAX_HISTORY);
            toDelete.forEach(record => {
              store.delete(record.timestamp);
            });
            resolve();
          };
          getAllRequest.onerror = () => reject(getAllRequest.error);
        } else {
          resolve();
        }
      };
      countRequest.onerror = () => reject(countRequest.error);
    };
    
    addRequest.onerror = () => reject(addRequest.error);
  });
}

// Get transaction history
export async function getTransactionHistory(limit: number = MAX_HISTORY): Promise<any[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readonly');
    const store = transaction.objectStore(HISTORY_STORE);
    
    const request = store.getAll();
    
    request.onsuccess = () => {
      const records = request.result;
      // Sort by timestamp (newest first)
      records.sort((a, b) => b.timestamp - a.timestamp);
      // Limit the number of records
      resolve(records.slice(0, limit));
    };
    
    request.onerror = () => reject(request.error);
  });
} 