'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BookmarkFormData, Bookmark } from '@/types/bookmark';
import { Trash } from 'lucide-react';
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

interface BookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: BookmarkFormData) => void;
  onDelete?: (bookmark: Bookmark) => void;
  initialData?: Bookmark;
}

export function BookmarkDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  onDelete,
  initialData 
}: BookmarkDialogProps) {
  const [formData, setFormData] = useState<BookmarkFormData>({
    title: '',
    url: '',
    description: '',
    icon: '',
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      setFormData({
        title: initialData?.title || '',
        url: initialData?.url || '',
        description: initialData?.description || '',
        icon: initialData?.icon || '',
      });
    } else {
      setFormData({
        title: '',
        url: '',
        description: '',
        icon: '',
      });
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      console.log('Deleting bookmark:', initialData);
      onDelete(initialData);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Edit Bookmark' : 'Add Bookmark'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL (optional)</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icon URL (optional)</Label>
              <Input
                id="icon"
                type="url"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              />
            </div>
            <div className="flex justify-between items-center">
              {initialData && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  className="h-9 w-9 border-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Delete bookmark"
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bookmark</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this bookmark and all its children. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}