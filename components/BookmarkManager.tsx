"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import { Bookmark, BookmarkFormData } from "@/types/bookmark";
import { BookmarkColumn } from "./BookmarkColumn";
import { BookmarkDialog } from "./BookmarkDialog";
import { BookmarkMenu } from "./BookmarkMenu";
import {
  loadBookmarks,
  saveBookmarks,
  saveThemePreference,
  loadThemePreference,
  reorderBookmark,
  moveBookmarkToParent,
  logTransaction,
  getTransactionHistory,
  deleteBookmark,
} from "@/lib/db";
import { ThemeToggle } from "./ThemeToggle";
import { FishSymbol } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "./SearchResults";

export function BookmarkManager() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeColumns, setActiveColumns] = useState<Bookmark[][]>([[]]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<{
    bookmark?: Bookmark;
    parentId: string | null;
  } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [history, setHistory] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<Bookmark[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    // Load bookmarks from IndexedDB when component mounts
    loadBookmarks()
      .then((loadedBookmarks) => {
        if (loadedBookmarks.length > 0) {
          setBookmarks(loadedBookmarks);
          setActiveColumns([[...loadedBookmarks]]);
        } else {
          // If no bookmarks in IndexedDB, use demo bookmarks
          // setBookmarks(demoBookmarks);
          // setActiveColumns([[...demoBookmarks]]);
          // // Save demo bookmarks to IndexedDB
          // saveBookmarks(demoBookmarks);
        }
      })
      .catch((error) => {
        console.error("Error loading bookmarks:", error);
        // Fallback to demo bookmarks
        // setBookmarks(demoBookmarks);
        // setActiveColumns([[...demoBookmarks]]);
      });
  }, []);

  // Save bookmarks to IndexedDB whenever they change
  useEffect(() => {
    if (bookmarks.length > 0) {
      saveBookmarks(bookmarks).catch((error) => {
        console.error("Error saving bookmarks:", error);
      });
    }
  }, [bookmarks]);

  // Load history for undo/redo
  useEffect(() => {
    getTransactionHistory()
      .then((history) => {
        setHistory(history);
      })
      .catch((error) => {
        console.error("Error loading history:", error);
      });
  }, [bookmarks]); // Refresh history when bookmarks change

  // Handle keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y or Cmd+Y
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [history, historyIndex]);

  // Handle undo
  const handleUndo = () => {
    if (history.length === 0 || historyIndex >= history.length - 1) return;

    const nextIndex = historyIndex + 1;
    const transaction = history[nextIndex];

    if (!transaction) return;

    // Apply the reverse of the transaction
    applyReverseTransaction(transaction)
      .then(() => {
        setHistoryIndex(nextIndex);
        // Reload bookmarks to reflect changes
        return loadBookmarks();
      })
      .then((loadedBookmarks) => {
        setBookmarks(loadedBookmarks);
        handleUpdateActiveColumns(loadedBookmarks);
      })
      .catch((error) => {
        console.error("Error undoing action:", error);
      });
  };

  // Handle redo
  const handleRedo = () => {
    if (history.length === 0 || historyIndex < 0) return;

    const transaction = history[historyIndex];

    if (!transaction) return;

    // Apply the transaction
    applyTransaction(transaction)
      .then(() => {
        setHistoryIndex(historyIndex - 1);
        // Reload bookmarks to reflect changes
        return loadBookmarks();
      })
      .then((loadedBookmarks) => {
        setBookmarks(loadedBookmarks);
        handleUpdateActiveColumns(loadedBookmarks);
      })
      .catch((error) => {
        console.error("Error redoing action:", error);
      });
  };

  // Apply a transaction in reverse (for undo)
  const applyReverseTransaction = async (transaction: any) => {
    const { action, data } = transaction;

    switch (action) {
      case "moveBookmark":
        // Move the bookmark back to its original parent
        await moveBookmarkToParent(
          data.bookmarkId,
          data.oldParentId,
          data.oldIndex || 0
        );
        break;

      case "reorderBookmark":
        // Reorder the bookmark back to its original position
        await reorderBookmark(data.bookmarkId, data.oldIndex, data.parentId);
        break;

      // Add cases for other transaction types as needed

      default:
        console.warn("Unknown transaction type:", action);
    }
  };

  // Apply a transaction (for redo)
  const applyTransaction = async (transaction: any) => {
    const { action, data } = transaction;

    switch (action) {
      case "moveBookmark":
        // Move the bookmark to its new parent
        await moveBookmarkToParent(
          data.bookmarkId,
          data.newParentId,
          data.newIndex || 0
        );
        break;

      case "reorderBookmark":
        // Reorder the bookmark to its new position
        await reorderBookmark(data.bookmarkId, data.newIndex, data.parentId);
        break;

      // Add cases for other transaction types as needed

      default:
        console.warn("Unknown transaction type:", action);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (!containerRef.current || isScrolling) return;

    const container = containerRef.current;
    const scrollAmount = 100;

    setIsScrolling(true);
    scrollIntervalRef.current = setInterval(() => {
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }, 200);
  };

  const stopScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      setIsScrolling(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  const handleHover = (bookmark: Bookmark, depth: number) => {
    if (bookmark.children) {
      const newColumns = activeColumns.slice(0, depth + 1);
      newColumns[depth + 1] = bookmark.children;
      setActiveColumns(newColumns);
    }
  };

  const addBookmarkToTree = (
    items: Bookmark[],
    parentId: string | null,
    newBookmark: Bookmark
  ): Bookmark[] => {
    if (!parentId) {
      return [...items, newBookmark];
    }

    return items.map((item) => {
      if (item.id === parentId) {
        return {
          ...item,
          children: item.children
            ? [...item.children, newBookmark]
            : [newBookmark],
        };
      }
      if (item.children) {
        return {
          ...item,
          children: addBookmarkToTree(item.children, parentId, newBookmark),
        };
      }
      return item;
    });
  };

  const updateBookmarkInTree = (
    items: Bookmark[],
    bookmarkId: string,
    updates: Partial<Bookmark>
  ): Bookmark[] => {
    return items.map((item) => {
      if (item.id === bookmarkId) {
        return { ...item, ...updates };
      }
      if (item.children) {
        return {
          ...item,
          children: updateBookmarkInTree(item.children, bookmarkId, updates),
        };
      }
      return item;
    });
  };

  const handleAddBookmark = (parentId: string | null) => {
    setEditingBookmark({ parentId });
    setDialogOpen(true);
  };

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark({ bookmark, parentId: null });
    setDialogOpen(true);
  };

  const getFaviconUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch {
      return "";
    }
  };

  const handleSaveBookmark = (formData: BookmarkFormData) => {
    const bookmarkData = {
      ...formData,
      icon: formData.url ? getFaviconUrl(formData.url) : undefined,
    };

    if (editingBookmark?.bookmark) {
      // Edit existing bookmark
      const updatedBookmarks = updateBookmarkInTree(
        bookmarks,
        editingBookmark.bookmark.id,
        bookmarkData
      );
      setBookmarks(updatedBookmarks);
      setActiveColumns([[...updatedBookmarks]]);
    } else {
      // Add new bookmark
      const newBookmark: Bookmark = {
        id: Math.random().toString(36).substr(2, 9),
        ...bookmarkData,
      };
      const updatedBookmarks = addBookmarkToTree(
        bookmarks,
        editingBookmark?.parentId || null,
        newBookmark
      );
      setBookmarks(updatedBookmarks);
      setActiveColumns([[...updatedBookmarks]]);
    }
    setEditingBookmark(null);
  };

  const handleImportBookmarks = (importedBookmarks: Bookmark[]) => {
    setBookmarks(importedBookmarks);
  };

  const handleUpdateActiveColumns = (importedBookmarks: Bookmark[]) => {
    setActiveColumns([[...importedBookmarks]]);
  };

  const findBookmarkListById = (
    items: Bookmark[],
    columnId: string
  ): Bookmark[] | null => {
    if (columnId === "root") return items;

    for (const item of items) {
      if (item.id === columnId) return item.children || [];
      if (item.children) {
        const result = findBookmarkListById(item.children, columnId);
        if (result) return result;
      }
    }
    return null;
  };

  const updateBookmarkListById = (
    items: Bookmark[],
    columnId: string,
    newList: Bookmark[]
  ): Bookmark[] => {
    if (columnId === "root") return newList;

    return items.map((item) => {
      if (item.id === columnId) {
        return { ...item, children: newList };
      }
      if (item.children) {
        return {
          ...item,
          children: updateBookmarkListById(item.children, columnId, newList),
        };
      }
      return item;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      // Safely access containerId with fallbacks
      const activeContainer =
        active.data.current?.sortable?.containerId || "unknown";
      const overContainer =
        over.data.current?.sortable?.containerId || "unknown";

      // If either container is unknown, we can't safely proceed with the drag
      if (activeContainer === "unknown" || overContainer === "unknown") {
        console.warn("Unable to determine container for drag operation");
        return;
      }

      // Only allow reordering within the same container
      if (activeContainer === overContainer) {
        const items = findBookmarkListById(bookmarks, activeContainer);
        if (!items) return;

        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // If we're reordering in a nested column, we need to update the active columns
        const columnIndex = activeColumns.findIndex((column) =>
          column.some((item) => item.id === active.id)
        );

        // Find the parent ID for this container
        let parentId: string | null = null;
        if (activeContainer !== "root") {
          // The container ID is the parent bookmark's ID
          parentId = activeContainer;
        }

        // Use the reorderBookmark function to update the database
        reorderBookmark(active.id as string, newIndex, parentId)
          .then(() => {
            // Log the transaction for undo/redo
            logTransaction("reorderBookmark", {
              bookmarkId: active.id,
              parentId,
              oldIndex,
              newIndex,
            });

            if (columnIndex > 0) {
              // For nested columns, update both the main bookmark tree and active columns
              const newBookmarks = updateBookmarkListById(
                bookmarks,
                activeContainer,
                newItems
              );

              const newActiveColumns = [...activeColumns];
              newActiveColumns[columnIndex] = newItems;

              setBookmarks(newBookmarks);
              setActiveColumns(newActiveColumns);
            } else {
              // For the root column, just update everything
              setBookmarks(newItems);
              setActiveColumns([[...newItems]]);
            }
          })
          .catch((error) => {
            console.error("Error reordering bookmark:", error);
          });
      } else {
        // If containers are different, show a more helpful message
        console.log("Dragging between different containers is not supported");
      }
    }
  };

  // Helper function to find a bookmark by ID
  const findBookmarkById = (
    items: Bookmark[],
    id: string
  ): Bookmark | undefined => {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = findBookmarkById(item.children, id);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  };

  // Handle clicking outside of search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        searchResults.length > 0
      ) {
        setSearchResults([]);
        setIsSearchActive(false);
        setSelectedSearchIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchResults]);

  const handleSearchResults = (results: Bookmark[]) => {
    setSearchResults(results);
    setIsSearchActive(results.length > 0);
    setSelectedSearchIndex(results.length > 0 ? 0 : -1);
  };

  const handleSelectedIndexChange = (index: number) => {
    setSelectedSearchIndex(index);
  };

  const handleSelectSearchResult = (bookmark: Bookmark) => {
    // Find the path to the bookmark
    const path = findPathToBookmark(bookmarks, bookmark.id);

    if (path.length > 0) {
      // Build the active columns based on the path
      const newActiveColumns: Bookmark[][] = [];

      // First column is always the root bookmarks
      newActiveColumns.push([...bookmarks]);

      // Add each level of the path
      let currentItems = bookmarks;
      for (let i = 0; i < path.length - 1; i++) {
        const bookmark = findBookmarkById(currentItems, path[i]);
        if (bookmark && bookmark.children) {
          newActiveColumns.push([...bookmark.children]);
          currentItems = bookmark.children;
        }
      }

      setActiveColumns(newActiveColumns);
      setSearchResults([]);
      setIsSearchActive(false);
      setSelectedSearchIndex(-1);
    }
  };

  // Function to find the path to a bookmark
  const findPathToBookmark = (
    items: Bookmark[],
    id: string,
    path: string[] = []
  ): string[] => {
    for (const item of items) {
      if (item.id === id) {
        return [...path, item.id];
      }

      if (item.children && item.children.length > 0) {
        const childPath = findPathToBookmark(item.children, id, [
          ...path,
          item.id,
        ]);
        if (childPath.length > 0) {
          return childPath;
        }
      }
    }

    return [];
  };

  // Handle deleting all bookmarks
  const handleDeleteAllBookmarks = async () => {
    try {
      // Create a copy of all bookmark IDs at the root level
      const rootBookmarkIds = [...bookmarks].map(bookmark => bookmark.id);
      
      // Delete each root bookmark (which will cascade to delete all children)
      for (const id of rootBookmarkIds) {
        await deleteBookmark(id);
      }
      
      // Update state
      setBookmarks([]);
      setActiveColumns([[]]);
      
      // Close any open dialogs
      setDialogOpen(false);
      setEditingBookmark(null);
      
      // Clear search results if any
      setSearchResults([]);
      setIsSearchActive(false);
      
    } catch (error) {
      console.error("Error deleting bookmarks:", error);
    }
  };

  // Handle deleting a specific bookmark
  const handleDeleteBookmark = async (bookmark: Bookmark) => {
    try {
      console.log('Starting to delete bookmark:', bookmark);
      await deleteBookmark(bookmark.id);
      console.log('Bookmark deleted from database, reloading bookmarks');
      
      // Reload bookmarks from the database to ensure we have the updated state
      const updatedBookmarks = await loadBookmarks();
      console.log('Reloaded bookmarks:', updatedBookmarks);
      setBookmarks(updatedBookmarks);
      
      // Update active columns
      handleUpdateActiveColumns(updatedBookmarks);
      
      // Close any open dialogs
      setDialogOpen(false);
      setEditingBookmark(null);
      
    } catch (error) {
      console.error("Error deleting bookmark:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="h-16 border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <FishSymbol />
          <h1 className="text-2xl font-semibold">Bookmarks</h1>
        </div>
        <div className="flex items-center gap-4">
          <div ref={searchContainerRef} className="relative">
            <SearchBar
              bookmarks={bookmarks}
              onSearchResults={handleSearchResults}
              onSelectBookmark={handleSelectSearchResult}
              onSelectedIndexChange={handleSelectedIndexChange}
            />
            {isSearchActive && (
              <SearchResults
                results={searchResults}
                onSelectBookmark={handleSelectSearchResult}
                selectedIndex={selectedSearchIndex}
                onSelectedIndexChange={handleSelectedIndexChange}
              />
            )}
          </div>
          <div className="flex items-center gap-2 mr-4">
            <button
              onClick={handleUndo}
              disabled={
                history.length === 0 || historyIndex >= history.length - 1
              }
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={history.length === 0 || historyIndex < 0}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 14 5-5-5-5" />
                <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
              </svg>
            </button>
          </div>
          <ThemeToggle />
          <BookmarkMenu
            bookmarks={bookmarks}
            onImport={handleImportBookmarks}
            onUpdateActiveColumns={handleUpdateActiveColumns}
          />
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="h-[calc(100vh-4rem)] flex relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-16 z-10"
            onMouseEnter={() => handleScroll("left")}
            onMouseLeave={stopScroll}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-16 z-10"
            onMouseEnter={() => handleScroll("right")}
            onMouseLeave={stopScroll}
          />
          <div
            ref={containerRef}
            className="flex overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: "smooth" }}
          >
            <AnimatePresence initial={false}>
              {activeColumns.map((columnBookmarks, index) => (
                <BookmarkColumn
                  key={index}
                  bookmarks={columnBookmarks}
                  depth={index}
                  onHover={handleHover}
                  activeColumns={activeColumns}
                  onAddBookmark={handleAddBookmark}
                  onEditBookmark={handleEditBookmark}
                  columnId={
                    index === 0 ? "root" : activeColumns[index - 1]?.[0]?.id
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </DndContext>

      <BookmarkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveBookmark}
        onDelete={handleDeleteBookmark}
        initialData={editingBookmark?.bookmark}
      />
    </div>
  );
}
