import React from "react";
import { Twitter, Linkedin, HelpCircle, Info, LifeBuoy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface SocialLinksProps {
  twitterUrl: string;
  linkedinUrl: string;
}

export function SocialLinks({ twitterUrl, linkedinUrl }: SocialLinksProps) {
  return (
    <div className="flex items-center gap-3">
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-400 dark:text-gray-400 dark:hover:text-blue-300 transition-colors"
        aria-label="Twitter Profile"
      >
        <Twitter size={18} color="gray" />
      </a>
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-500 transition-colors"
        aria-label="LinkedIn Profile"
      >
        <Linkedin size={18} color="gray" />
      </a>
      <Dialog>
        <DialogTrigger asChild>
          <button
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            aria-label="Why Fishmark?"
          >
            <span>Why?</span>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Why Fishmark?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>
              Fishmark is a modern bookmark manager designed to help you
              organize and access your bookmarks efficiently.
            </p>
            <p>
              The name &ldquo;Fishmark&rdquo; combines &ldquo;fish&rdquo;
              (representing navigation and exploration) with
              &ldquo;bookmark&rdquo; - symbolizing a tool that helps you
              navigate the vast ocean of the internet.
            </p>
            <p>
              Created with ❤️ by{" "}
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Amit Patil
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <button
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            aria-label="How to use Fishmark"
          >
            <span>How?</span>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>How to Use Fishmark</DialogTitle>
          </DialogHeader>

          <div
            className="mt-4 overflow-y-auto"
            style={{ maxHeight: "calc(80vh - 120px)" }}
          >
            <h3 className="text-lg font-medium mb-4">Key Features:</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">📋 Column-Based Organization</h4>
                <p>
                  Organize your bookmarks in multiple columns for better
                  visibility and access.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">🔍 Powerful Search</h4>
                <p>
                  Quickly find any bookmark with the integrated search
                  functionality.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">🔄 Drag and Drop</h4>
                <p>
                  Easily reorganize your bookmarks by dragging and dropping them
                  within columns.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">📱 Responsive Design</h4>
                <p>
                  Access your bookmarks from any device with a responsive layout.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">🌓 Dark/Light Mode</h4>
                <p>
                  Switch between dark and light themes for comfortable viewing
                  in any environment.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">📥 Import/Export</h4>
                <p>
                  Easily import your existing bookmarks or export them for
                  backup.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">💾 Completely Local Storage</h4>
                <p>
                  All your bookmarks are stored locally in IndexedDB, ensuring
                  privacy and fast access.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">🌐 Auto-Fetch Favicons</h4>
                <p>
                  Automatically fetches and displays favicons from bookmark URLs
                  for visual recognition.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">📁 Folders Support</h4>
                <p>
                  Create bookmarks as folders (without URLs) to better organize
                  your collection.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">🚀 Quick Launch</h4>
                <p>
                  Double-click on a bookmark or click the launch button to open
                  it in a new tab.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">⚡ Keyboard Shortcuts</h4>
                <p>
                  Navigate and manage your bookmarks efficiently with keyboard
                  shortcuts.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">🔄 Undo/Redo</h4>
                <p>Made a mistake? Easily undo or redo your recent actions.</p>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      <a
        href="https://tally.so/r/wgvqlD"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        aria-label="Support Fishmark"
      >
        <span>Support</span>
      </a>
    </div>
  );
}
