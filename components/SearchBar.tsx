"use client";

import { useState, useEffect, useRef } from "react";
import { Bookmark } from "@/types/bookmark";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  bookmarks: Bookmark[];
  onSearchResults: (results: Bookmark[]) => void;
  onSelectBookmark?: (bookmark: Bookmark) => void;
  onSelectedIndexChange?: (index: number) => void;
}

export function SearchBar({ 
  bookmarks, 
  onSearchResults, 
  onSelectBookmark,
  onSelectedIndexChange 
}: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [results, setResults] = useState<Bookmark[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update parent component when selected index changes
  useEffect(() => {
    if (onSelectedIndexChange) {
      onSelectedIndexChange(selectedIndex);
    }
  }, [selectedIndex, onSelectedIndexChange]);

  // Function to recursively search through bookmarks
  const searchBookmarks = (items: Bookmark[], term: string): Bookmark[] => {
    const results: Bookmark[] = [];
    
    const searchTerm = term.toLowerCase();
    
    const searchInBookmark = (bookmark: Bookmark) => {
      // Check if the bookmark matches the search term
      const titleMatch = bookmark.title?.toLowerCase().includes(searchTerm);
      const urlMatch = bookmark.url?.toLowerCase().includes(searchTerm);
      const descriptionMatch = bookmark.description?.toLowerCase().includes(searchTerm);
      
      if (titleMatch || urlMatch || descriptionMatch) {
        results.push(bookmark);
      }
      
      // Recursively search in children
      if (bookmark.children && bookmark.children.length > 0) {
        bookmark.children.forEach(child => searchInBookmark(child));
      }
    };
    
    // Start the search
    items.forEach(bookmark => searchInBookmark(bookmark));
    
    return results;
  };

  // Handle search when the search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setResults([]);
      onSearchResults([]);
      setSelectedIndex(-1);
      return;
    }
    
    const searchResults = searchBookmarks(bookmarks, searchTerm);
    setResults(searchResults);
    onSearchResults(searchResults);
    setSelectedIndex(searchResults.length > 0 ? 0 : -1);
  }, [searchTerm, bookmarks, onSearchResults]);

  // Focus the input when search is opened
  useEffect(() => {
    if (isSearching && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearching]);

  // Handle keyboard shortcut (Ctrl+K or Cmd+K) to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearching(true);
      }
      
      if (e.key === "Escape" && isSearching) {
        setIsSearching(false);
        setSearchTerm("");
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearching]);

  // Handle keyboard navigation in search results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    // Arrow down - move selection down
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    }
    
    // Arrow up - move selection up
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    }
    
    // Enter - select the current item
    if (e.key === "Enter" && selectedIndex >= 0 && selectedIndex < results.length) {
      e.preventDefault();
      if (onSelectBookmark) {
        onSelectBookmark(results[selectedIndex]);
      }
      handleClearSearch();
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setResults([]);
    onSearchResults([]);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative">
      {!isSearching ? (
        <button
          onClick={() => setIsSearching(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
          aria-label="Search bookmarks"
        >
          <Search size={16} />
          <span>Search</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      ) : (
        <div className="flex items-center w-full max-w-md border border-input rounded-md focus-within:ring-1 focus-within:ring-ring">
          <Search size={16} className="ml-3 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search bookmarks..."
            className="flex-1 py-2 px-3 bg-transparent outline-none text-sm"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="mr-2 p-1 rounded-full hover:bg-accent"
              aria-label="Clear search"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
} 