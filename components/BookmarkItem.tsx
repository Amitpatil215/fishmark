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
import { useState } from "react";

export function BookmarkItem({
  bookmark,
  depth,
  index,
  isActive,
  onHover,
  onAddBookmark,
  onEditBookmark,
}: BookmarkItemProps) {
  const hasChildren = bookmark.children && bookmark.children.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
        "group relative flex items-center gap-2 rounded-lg p-2 hover:bg-accent overflow-hidden",
        isActive && "bg-accent",
        isDragging && "shadow-lg bg-accent/50"
      )}
      onMouseEnter={() => onHover(bookmark, depth)}
      role="button"
      tabIndex={0}
    >
      <a
        href={bookmark.url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center gap-2 min-w-0"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
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
      </a>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-95 transition-opacity absolute right-2 bg-background/80 backdrop-blur-sm p-1 rounded-md">
        {bookmark.url && (
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
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
    </div>
  );
}
