export interface Bookmark {
  id: string;
  title: string;
  url?: string;
  description?: string;
  icon?: string;
  children?: Bookmark[];
}

export interface BookmarkColumnProps {
  bookmarks: Bookmark[];
  depth: number;
  onHover: (bookmark: Bookmark, depth: number) => void;
  activeColumns: Bookmark[][];
  onAddBookmark: (parentId: string | null) => void;
  onEditBookmark: (bookmark: Bookmark) => void;
}

export interface BookmarkItemProps {
  bookmark: Bookmark;
  depth: number;
  isActive: boolean;
  onHover: (bookmark: Bookmark, depth: number) => void;
  onAddBookmark: (parentId: string) => void;
  onEditBookmark: (bookmark: Bookmark) => void;
}

export interface BookmarkFormData {
  title: string;
  url?: string;
  description?: string;
  icon?: string;
}