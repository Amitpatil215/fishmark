"use client";

import {
  ChevronRight,
  Globe,
  ExternalLink,
  Plus,
  Edit,
  FishSymbol,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { BookmarkItemProps } from "@/types/bookmark";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useState, memo } from "react";

// Status bar component
function StatusBar({ url }: { url: string }) {
  return (
    <div className="fixed bottom-0 left-0 truncate h-6 bg-muted/50 backdrop-blur-sm text-xs text-muted-foreground z-50 w-full flex items-center px-2 border-t">
      {url}
    </div>
  );
}

// Base BookmarkItem component
function BookmarkItemBase({
  bookmark,
  depth,
  index,
  isActive,
  onHover,
  onAddBookmark,
  onEditBookmark,
}: BookmarkItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = bookmark.children && bookmark.children.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
    over,
  } = useSortable({ 
    id: bookmark.id,
    data: {
      type: 'bookmark',
      hasChildren,
      depth
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    pointerEvents: isDragging ? 'none' as const : undefined,
    scale: isDragging ? 0.95 : 1,
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (bookmark.url) {
      window.open(bookmark.url, "_blank");
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default to avoid navigation on single click
    onHover(bookmark, depth);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative flex items-center gap-2 rounded-lg p-2 hover:bg-accent overflow-hidden transition-all duration-200",
        isActive && "bg-accent",
        isDragging && "shadow-lg bg-accent/50 cursor-grabbing",
        over?.id === bookmark.id && "ring-2 ring-primary",
        hasChildren && "hover:ring-1 hover:ring-primary/20"
      )}
      onMouseEnter={() => {
        onHover(bookmark, depth);
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
    >
      <div
        className="flex-1 flex items-center gap-2 min-w-0"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        data-url={bookmark.url || "#"}
      >
        {bookmark.icon ? (
          <img
            src={bookmark.icon}
            alt=""
            className="w-4 h-4 flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <FishSymbol
          className={cn(
            "h-4 w-4 text-muted-foreground flex-shrink-0",
            bookmark.icon ? "hidden" : ""
          )}
        />

        <HoverCard>
          <HoverCardTrigger asChild>
            <span className="text-sm truncate min-w-0 flex-1">
              {bookmark.title}
            </span>
          </HoverCardTrigger>
          {bookmark.description && (
            <HoverCardContent className="w-80">
              <p className="text-sm text-muted-foreground">
                {bookmark.description}
              </p>
            </HoverCardContent>
          )}
        </HoverCard>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-95 transition-opacity absolute right-2 bg-background/80 backdrop-blur-sm p-1 rounded-md">
        {bookmark.url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              if (bookmark.url) {
                window.open(bookmark.url, "_blank");
              }
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onEditBookmark(bookmark);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onAddBookmark(bookmark.id);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {isHovered && bookmark.url && <StatusBar url={bookmark.url} />}
    </div>
  );
}

// Memoize the BookmarkItem to prevent unnecessary re-renders
export const BookmarkItem = memo(BookmarkItemBase);
