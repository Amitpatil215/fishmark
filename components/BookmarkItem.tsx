"use client";

import {
  ChevronRight,
  Globe,
  ExternalLink,
  Plus,
  Edit,
  FishSymbol,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BookmarkItemProps } from "@/types/bookmark";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export function BookmarkItem({
  bookmark,
  depth,
  isActive,
  onHover,
  onAddBookmark,
  onEditBookmark,
}: BookmarkItemProps) {
  const hasChildren = bookmark.children && bookmark.children.length > 0;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-lg p-2 hover:bg-accent overflow-hidden",
        isActive && "bg-accent"
      )}
      onMouseEnter={() => onHover(bookmark, depth)}
      role="button"
      tabIndex={0}
    >
      <div className="flex-1 flex items-center gap-2 min-w-0">
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
            <span className="font-medium truncate min-w-0 flex-1">{bookmark.title}</span>
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
              window.open(bookmark.url, "_blank");
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
        {hasChildren && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
