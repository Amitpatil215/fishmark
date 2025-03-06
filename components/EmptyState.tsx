import { motion } from "framer-motion";
import { PlusCircle } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  onAddBookmark: () => void;
}

export function EmptyState({ onAddBookmark }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg"
      >
        <h2 className="text-3xl font-bold mb-6">Welcome to Fishmark!</h2>
        
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Get Started</h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              You don&apos;t have any bookmarks yet. Add your first bookmark to get started!
            </p>
            <Button 
              onClick={onAddBookmark}
              className="flex items-center gap-2"
            >
              <PlusCircle size={16} />
              <span>Add Your First Bookmark</span>
            </Button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Key Features</h3>
            <ul className="space-y-2 text-left text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">📋</span>
                <span>Organize bookmarks in multiple columns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">🔍</span>
                <span>Quickly search through all your bookmarks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">🌓</span>
                <span>Light and dark mode support</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-3">How to Use Fishmark</h3>
          <ol className="space-y-3 text-left text-gray-700 dark:text-gray-300 list-decimal pl-5">
            <li>
              <strong>Add bookmarks</strong> by clicking the &quot;+&quot; button in any column
            </li>
            <li>
              <strong>Organize in folders</strong> to create a hierarchical structure
            </li>
            <li>
              <strong>Drag and drop</strong> to rearrange your bookmarks
            </li>
            <li>
              <strong>Search</strong> using the search bar to quickly find any bookmark
            </li>
            <li>
              <strong>Import bookmarks</strong> from your browser using the menu in the top right
            </li>
          </ol>
        </div>
      </motion.div>
    </div>
  );
} 