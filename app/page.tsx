import { BookmarkManager } from '@/components/BookmarkManager';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="h-16 border-b flex items-center justify-between px-6">
        <h1 className="text-2xl font-semibold">Bookmarks</h1>
      </header>
      <BookmarkManager />
    </main>
  );
}