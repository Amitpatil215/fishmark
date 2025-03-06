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
import { loadBookmarks, saveBookmarks } from "@/lib/db";
import { ThemeToggle } from "./ThemeToggle";
import { FishSymbol } from "lucide-react";

const demoBookmarks: Bookmark[] = [
  {
    id: "1",
    title: "Development",
    url: "https://dev.to",
    icon: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=32&h=32&fit=crop&auto=format",
    children: [
      {
        id: "1-1",
        title: "Frontend",
        url: "https://frontend.com",
        children: [
          {
            id: "1-1-1",
            title: "React",
            url: "https://react.dev",
            description: "React documentation and resources",
          },
          {
            id: "1-1-2",
            title: "Next.js",
            url: "https://nextjs.org",
            description: "The React Framework for the Web",
          },
        ],
      },
      {
        id: "1-2",
        title: "Backend",
        url: "https://backend.com",
        children: [
          {
            id: "1-2-1",
            title: "Node.js",
            url: "https://nodejs.org",
            description: "Node.js® is a JavaScript runtime",
          },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Design",
    url: "https://design.com",
    icon: "https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?w=32&h=32&fit=crop&auto=format",
    children: [
      {
        id: "2-1",
        title: "UI Resources",
        url: "https://ui.com",
        children: [
          {
            id: "2-1-1",
            title: "Figma",
            url: "https://figma.com",
            description: "Collaborative interface design tool",
          },
        ],
      },
    ],
  },
];

export function BookmarkManager() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeColumns, setActiveColumns] = useState<Bookmark[][]>([[]]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<{
    bookmark?: Bookmark;
    parentId: string | null;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollIntervalRef = useRef<NodeJS.Timeout>();

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
          setBookmarks(demoBookmarks);
          setActiveColumns([[...demoBookmarks]]);
          // Save demo bookmarks to IndexedDB
          saveBookmarks(demoBookmarks);
        }
      })
      .catch((error) => {
        console.error("Error loading bookmarks:", error);
        // Fallback to demo bookmarks
        setBookmarks(demoBookmarks);
        setActiveColumns([[...demoBookmarks]]);
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
      const activeContainer = active.data.current?.sortable.containerId;
      const overContainer = over.data.current?.sortable.containerId;
      
      if (activeContainer === overContainer) {
        const items = findBookmarkListById(bookmarks, activeContainer);
        if (!items) return;

        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // If we're reordering in a nested column, we need to update the active columns
        const columnIndex = activeColumns.findIndex(column => 
          column.some(item => item.id === active.id)
        );

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
      }
    }
  };

  return (
    <>
      <header className="h-16 border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <FishSymbol />
          <h1 className="text-2xl font-semibold">Bookmarks</h1>
        </div>
        <div className="absolute right-4 top-4 z-20 flex items-center gap-4">
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
                  columnId={index === 0 ? "root" : activeColumns[index - 1]?.[0]?.id}
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
        initialData={editingBookmark?.bookmark}
      />
    </>
  );
}
