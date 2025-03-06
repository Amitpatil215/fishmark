"use client";

import { Bookmark } from "@/types/bookmark";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

interface SearchResultsProps {
  results: Bookmark[];
  onSelectBookmark: (bookmark: Bookmark) => void;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
}

export function SearchResults({ 
  results, 
  onSelectBookmark, 
  selectedIndex = -1,
  onSelectedIndexChange
}: SearchResultsProps) {
  const selectedItemRef = useRef<HTMLLIElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to keep the selected item in view
  useEffect(() => {
    if (selectedItemRef.current && resultsContainerRef.current) {
      const container = resultsContainerRef.current;
      const selectedItem = selectedItemRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const selectedItemRect = selectedItem.getBoundingClientRect();
      
      // Check if the selected item is outside the visible area
      if (
        selectedItemRect.bottom > containerRect.bottom ||
        selectedItemRect.top < containerRect.top
      ) {
        // Scroll the item into view
        selectedItem.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  const handleMouseEnter = (index: number) => {
    if (onSelectedIndexChange) {
      onSelectedIndexChange(index);
    }
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto bg-background border border-input rounded-md shadow-md z-50" ref={resultsContainerRef}>
      <div className="p-2">
        <h3 className="text-sm font-medium mb-2">Search Results ({results.length})</h3>
        <ul className="space-y-1">
          {results.map((bookmark, index) => (
            <li 
              key={bookmark.id} 
              ref={index === selectedIndex ? selectedItemRef : undefined}
              onMouseEnter={() => handleMouseEnter(index)}
            >
              <button
                onClick={() => onSelectBookmark(bookmark)}
                className={`w-full flex items-center gap-3 p-2 text-left rounded-md ${
                  index === selectedIndex 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-accent'
                }`}
              >
                {bookmark.icon ? (
                  <div className="w-5 h-5 relative flex-shrink-0">
                    <Image
                      src={bookmark.icon}
                      alt=""
                      fill
                      className="object-contain rounded-sm"
                    />
                  </div>
                ) : (
                  <div className={`w-5 h-5 flex items-center justify-center rounded-sm flex-shrink-0 ${
                    index === selectedIndex 
                      ? 'bg-primary-foreground/20' 
                      : 'bg-primary/10'
                  }`}>
                    <ExternalLink size={12} className={index === selectedIndex ? 'text-primary-foreground' : 'text-primary'} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{bookmark.title}</div>
                  {bookmark.url && (
                    <div className={`text-xs truncate ${
                      index === selectedIndex 
                        ? 'text-primary-foreground/80' 
                        : 'text-muted-foreground'
                    }`}>
                      {bookmark.url}
                    </div>
                  )}
                  {bookmark.description && (
                    <div className={`text-xs truncate ${
                      index === selectedIndex 
                        ? 'text-primary-foreground/80' 
                        : 'text-muted-foreground'
                    }`}>
                      {bookmark.description}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 