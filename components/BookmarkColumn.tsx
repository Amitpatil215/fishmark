'use client';

import { motion } from "framer-motion";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BookmarkColumnProps } from "@/types/bookmark";
import { BookmarkItem } from "./BookmarkItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function BookmarkColumn({ 
  bookmarks, 
  depth, 
  onHover, 
  activeColumns,
  onAddBookmark,
  onEditBookmark,
  columnId
}: BookmarkColumnProps) {
  // Get the parent bookmark name if this is a nested column
  const getColumnTitle = () => {
    if (depth === 0) return 'All Bookmarks';
    
    // For nested columns (depth > 0), find the parent bookmark
    // The parent is the active bookmark from the previous column that contains these children
    const parentBookmark = activeColumns[depth-1]?.find(b => 
      b.children?.some(child => bookmarks.some(bm => bm.id === child.id))
    );
    
    return parentBookmark ? `${parentBookmark.title}` : 'Nested Bookmarks';
  };
  
  // Get the parent ID for adding new bookmarks
  const getParentId = () => {
    if (depth === 0) return null;
    
    // For nested columns, we need to find the parent bookmark
    // The parent is the active bookmark from the previous column that contains these children
    const parentBookmark = activeColumns[depth-1]?.find(b => 
      b.children?.some(child => bookmarks.some(bm => bm.id === child.id))
    );
    
    return parentBookmark?.id || null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full w-72 border-r"
    >
      <ScrollArea className="h-full">
        <div className="p-4 space-y-2">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              {getColumnTitle()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddBookmark(getParentId())}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          <SortableContext 
            items={bookmarks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
            id={columnId}
          >
            <div className="space-y-2">
              {bookmarks.map((bookmark, index) => (
                <BookmarkItem
                  key={bookmark.id}
                  bookmark={bookmark}
                  depth={depth}
                  index={index}
                  isActive={activeColumns[depth]?.includes(bookmark)}
                  onHover={onHover}
                  onAddBookmark={onAddBookmark}
                  onEditBookmark={onEditBookmark}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      </ScrollArea>
    </motion.div>
  );
}