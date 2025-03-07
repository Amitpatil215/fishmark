"use client";

import { motion } from "framer-motion";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
  columnId,
}: BookmarkColumnProps) {
  // Get the parent bookmark name if this is a nested column
  const getColumnTitle = () => {
    if (depth === 0) return "All Bookmarks";

    // Find the hovered bookmark in the previous column
    const hoveredBookmark = activeColumns[depth - 1]?.find(b => b.isHovered);
    
    // If we found a hovered bookmark, use its title
    if (hoveredBookmark) {
      // If this is an empty column (no bookmarks), it means we're showing
      // an empty children list for the item hovered in the previous column
      if (bookmarks.length === 0) {
        return `${hoveredBookmark.title} (Empty)`;
      }
      return hoveredBookmark.title;
    }

    return "Nested Bookmarks";
  };

  // Get the parent ID for adding new bookmarks
  const getParentId = () => {
    if (depth === 0) return null;

    // Find the hovered bookmark in the previous column
    const hoveredBookmark = activeColumns[depth - 1]?.find(b => b.isHovered);
    
    // If we found a hovered bookmark, use its ID
    if (hoveredBookmark?.id) {
      return hoveredBookmark.id;
    }

    return null;
  };

  // Get the column ID for the SortableContext
  const getColumnId = () => {
    if (depth === 0) return "root";

    // Find the hovered bookmark in the previous column
    const hoveredBookmark = activeColumns[depth - 1]?.find(b => b.isHovered);
    return hoveredBookmark?.id || `column-${depth}`;
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
              variant="ghost"
              size="sm"
              onClick={() => onAddBookmark(getParentId())}
              className="h-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <SortableContext
            items={bookmarks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
            id={getColumnId()}
          >
            <div className="space-y-2 min-h-[50px]">
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
