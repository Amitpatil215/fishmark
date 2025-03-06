import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useRef } from "react";
import { Bookmark } from "@/types/bookmark";

interface BookmarkMenuProps {
  bookmarks: Bookmark[];
  onImport: (bookmarks: Bookmark[]) => void;
  onUpdateActiveColumns: (bookmarks: Bookmark[]) => void;
}

export function BookmarkMenu({ bookmarks, onImport, onUpdateActiveColumns }: BookmarkMenuProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const bookmarksJson = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([bookmarksJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookmarks.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setShowImportDialog(true);
  };

  const handleImportConfirm = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedBookmarks = JSON.parse(e.target?.result as string);
        onImport(importedBookmarks);
        onUpdateActiveColumns(importedBookmarks);
        setShowImportDialog(false);
      } catch (error) {
        console.error("Error parsing bookmarks:", error);
        // TODO: Show error toast
      }
    };
    reader.readAsText(file);
    // Reset the file input so the same file can be selected again
    event.target.value = '';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExport}>
            Export Bookmarks
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleImportClick}>
            Import Bookmarks
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Bookmarks</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all your existing bookmarks. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/json"
        className="hidden"
      />
    </>
  );
} 