"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimation,
  Modifier,
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
import { SocialLinks } from './SocialLinks';
import { AnimatedHeader } from "./AnimatedHeader";
import { PlusCircle } from "lucide-react";
import { Button } from "./ui/button";
import { EmptyState } from "./EmptyState";
import { throttle } from "@/lib/utils";

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

  // This effect ensures that activeColumns is always in sync with the bookmarks state
  // It preserves the hover state while updating the bookmark data
  useEffect(() => {
    // Only run this effect if we have bookmarks and activeColumns
    if (bookmarks.length === 0 || activeColumns.length === 0) return;

    // Create a new array of active columns with updated bookmark data
    const updatedActiveColumns = activeColumns.map((column, columnIndex) => {
      if (columnIndex === 0) {
        // For the root column, use the updated bookmarks while preserving hover state
        return bookmarks.map(bookmark => ({
          ...bookmark,
          isHovered: column.find(b => b.id === bookmark.id)?.isHovered || false
        }));
      } else {
        // For nested columns, find the parent bookmark in the previous column
        const hoveredBookmarkInPrevColumn = activeColumns[columnIndex - 1]?.find(b => b.isHovered);
        
        if (hoveredBookmarkInPrevColumn) {
          // Find the updated parent bookmark
          const updatedParent = findBookmarkById(bookmarks, hoveredBookmarkInPrevColumn.id);
          
          if (updatedParent?.children) {
            // Use the updated children while preserving hover state
            return updatedParent.children.map(child => ({
              ...child,
              isHovered: column.find(b => b.id === child.id)?.isHovered || false
            }));
          }
        }
        
        // If we can't find the parent or it has no children, preserve the current column
        // but update any bookmarks that might have changed
        return column.map(bookmark => {
          const updatedBookmark = findBookmarkById(bookmarks, bookmark.id);
          return updatedBookmark ? 
            { ...updatedBookmark, isHovered: bookmark.isHovered || false } : 
            bookmark;
        });
      }
    });
    
    // Only update if the columns have actually changed
    if (JSON.stringify(updatedActiveColumns) !== JSON.stringify(activeColumns)) {
      setActiveColumns(updatedActiveColumns);
    }
  }, [bookmarks]);

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

  const handleHoverImpl = (bookmark: Bookmark, depth: number) => {
    // Create a new array of active columns, keeping columns up to the current depth
    const newColumns = activeColumns.slice(0, depth + 1);
    
    // Store hovered bookmark information in a way that doesn't reorder the array
    // We'll attach a special property to the bookmark instead
    const updatedCurrentColumn = newColumns[depth].map(b => ({
      ...b,
      isHovered: b.id === bookmark.id
    }));
    newColumns[depth] = updatedCurrentColumn;
    
    if (bookmark.children && bookmark.children.length > 0) {
      // Add parent name to each child bookmark
      const childrenWithParentName = bookmark.children.map((child) => ({
        ...child,
        parentName: bookmark.title,
      }));
      newColumns[depth + 1] = childrenWithParentName;
    } else {
      // For bookmarks without children, create an empty column
      // This ensures we show an empty column when hovering over items without children
      newColumns[depth + 1] = [];
    }
    
    setActiveColumns(newColumns);
  };
  
  // Throttled version of handleHover to prevent excessive re-renders
  const handleHover = throttle(handleHoverImpl, 100);

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
        // Add parent name to the new bookmark
        const bookmarkWithParent = {
          ...newBookmark,
          parentName: item.title,
        };

        return {
          ...item,
          children: item.children
            ? [...item.children, bookmarkWithParent]
            : [bookmarkWithParent],
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
      
      // Just update the bookmarks state - the useEffect will handle synchronizing activeColumns
      setBookmarks(updatedBookmarks);
      
      // Save to database
      saveBookmarks(updatedBookmarks);
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
      
      // Just update the bookmarks state - the useEffect will handle synchronizing activeColumns
      setBookmarks(updatedBookmarks);
      
      // Save to database
      saveBookmarks(updatedBookmarks);
    }

    // Close the dialog
    setDialogOpen(false);
    setEditingBookmark(null);
  };

  const handleImportBookmarks = (importedBookmarks: Bookmark[]) => {
    setBookmarks(importedBookmarks);
  };

  const handleUpdateActiveColumns = (importedBookmarks: Bookmark[]) => {
    // For the root level, we don't need parent names
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

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    
    if (!over) return;

    // Find the bookmark being hovered over
    const hoveredBookmark = findBookmarkById(bookmarks, over.id);
    if (hoveredBookmark) {
      // If dragging over a bookmark without children, prevent dropping
      if (!hoveredBookmark.children || hoveredBookmark.children.length === 0) {
        event.over = null;
        return;
      }

      // Find the depth of the hovered bookmark
      const hoveredDepth = findBookmarkDepth(bookmarks, hoveredBookmark.id);
      
      // Trigger column expansion by simulating hover
      handleHoverImpl(hoveredBookmark, hoveredDepth || 0);
    }
  };

  // Helper function to find the depth of a bookmark
  const findBookmarkDepth = (
    items: Bookmark[],
    bookmarkId: string,
    depth: number = 0
  ): number | null => {
    for (const item of items) {
      if (item.id === bookmarkId) {
        return depth;
      }
      if (item.children) {
        const foundDepth = findBookmarkDepth(item.children, bookmarkId, depth + 1);
        if (foundDepth !== null) {
          return foundDepth;
        }
      }
    }
    return null;
  };

  // Helper function to find the parent ID of a bookmark
  const findBookmarkParentId = (
    items: Bookmark[],
    bookmarkId: string,
    parentId: string | null = null
  ): string | null => {
    for (const item of items) {
      if (item.children) {
        if (item.children.some(child => child.id === bookmarkId)) {
          return item.id;
        }
        const foundParentId = findBookmarkParentId(item.children, bookmarkId, item.id);
        if (foundParentId !== null) {
          return foundParentId;
        }
      }
    }
    return null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      // Find the actual parent IDs for both source and target
      const sourceParentId = findBookmarkParentId(bookmarks, active.id as string);
      const targetParentId = findBookmarkParentId(bookmarks, over.id as string);

      // Get the source and target items
      const sourceItems = sourceParentId 
        ? findBookmarkListById(bookmarks, sourceParentId) 
        : bookmarks;
      const targetItems = targetParentId
        ? findBookmarkListById(bookmarks, targetParentId)
        : bookmarks;
      
      if (!sourceItems || !targetItems) return;

      const oldIndex = sourceItems.findIndex((item) => item.id === active.id);
      const newIndex = targetItems.findIndex((item) => item.id === over.id);

      // If source and target parents are the same, handle reordering
      if (sourceParentId === targetParentId) {
        const newItems = arrayMove(sourceItems, oldIndex, newIndex);

        // Use the reorderBookmark function to update the database
        reorderBookmark(active.id as string, newIndex, sourceParentId)
          .then(() => {
            // Log the transaction for undo/redo
            logTransaction("reorderBookmark", {
              bookmarkId: active.id,
              parentId: sourceParentId,
              oldIndex,
              newIndex,
            });

            if (sourceParentId) {
              // For nested columns, update both the main bookmark tree and active columns
              const newBookmarks = updateBookmarkListById(
                bookmarks,
                sourceParentId,
                newItems
              );
              setBookmarks(newBookmarks);
              saveBookmarks(newBookmarks);
            } else {
              // For the root column, just update everything
              setBookmarks(newItems);
              saveBookmarks(newItems);
            }
          })
          .catch((error) => {
            console.error("Error reordering bookmark:", error);
          });
      } else {
        // Moving between different parents
        // Use moveBookmarkToParent to handle the move
        moveBookmarkToParent(active.id as string, targetParentId, newIndex)
          .then(() => {
            // Log the transaction for undo/redo
            logTransaction("moveBookmark", {
              bookmarkId: active.id,
              oldParentId: sourceParentId,
              newParentId: targetParentId,
              oldIndex,
              newIndex,
            });

            // Reload bookmarks to get the updated state
            loadBookmarks().then((updatedBookmarks) => {
              setBookmarks(updatedBookmarks);
              saveBookmarks(updatedBookmarks);
            });
          })
          .catch((error) => {
            console.error("Error moving bookmark:", error);
          });
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
      const rootBookmarkIds = [...bookmarks].map((bookmark) => bookmark.id);

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
      console.log("Starting to delete bookmark:", bookmark);
      await deleteBookmark(bookmark.id);
      console.log("Bookmark deleted from database, reloading bookmarks");

      // Reload bookmarks from the database to ensure we have the updated state
      const updatedBookmarks = await loadBookmarks();
      console.log("Reloaded bookmarks:", updatedBookmarks);
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
        <AnimatedHeader />
        <div className="flex items-center gap-4">
          <SocialLinks 
            twitterUrl="https://x.com/amiit_fyi"
            linkedinUrl="https://www.linkedin.com/in/amitgpatil215/"
          />
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
          <ThemeToggle />
          <BookmarkMenu
            bookmarks={bookmarks}
            onImport={handleImportBookmarks}
            onUpdateActiveColumns={handleUpdateActiveColumns}
          />
        </div>
      </header>

      {bookmarks.length === 0 ? (
        <EmptyState onAddBookmark={() => handleAddBookmark(null)} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
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
      )}

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
