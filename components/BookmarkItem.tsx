'use client';

import { ChevronRight, Globe, ExternalLink, Plus, Edit } from "lucide-react";
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
  onEditBookmark 
}: BookmarkItemProps) {
  const hasChildren = bookmark.children && bookmark.children.length > 0;
  
  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-lg p-2 hover:bg-accent",
        isActive && "bg-accent"
      )}
      onMouseEnter={() => onHover(bookmark, depth)}
      role="button"
      tabIndex={0}
    >
      <div className="flex-1 flex items-center gap-2">
        {hasChildren && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        {bookmark.icon ? (
          <img
            src={bookmark.icon}
            alt=""
            className="w-4 h-4"
            onError={(e) => {
              e.currentTarget.src = '/fallback-icon.png';
            }}
          />
        ) : (
          <Globe className="w-4 h-4 text-muted-foreground" />
        )}
        
        <HoverCard>
          <HoverCardTrigger asChild>
            <span className="font-medium truncate">{bookmark.title}</span>
          </HoverCardTrigger>
          {bookmark.description && (
            <HoverCardContent className="w-80">
              <p className="text-sm text-muted-foreground">{bookmark.description}</p>
            </HoverCardContent>
          )}
        </HoverCard>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {bookmark.url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              window.open(bookmark.url, '_blank');
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
    </div>
  );
}