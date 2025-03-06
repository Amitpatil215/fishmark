import React from 'react';
import { Twitter, Linkedin, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

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
        <Twitter size={20} />
      </a>
      <a 
        href={linkedinUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-500 transition-colors"
        aria-label="LinkedIn Profile"
      >
        <Linkedin size={20} />
      </a>
      <Dialog>
        <DialogTrigger asChild>
          <button 
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            aria-label="Why Fishmark?"
          >
            <HelpCircle size={18} />
            <span>Why</span>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Why Fishmark?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>Fishmark is a modern bookmark manager designed to help you organize and access your bookmarks efficiently.</p>
            <p>The name &ldquo;Fishmark&rdquo; combines &ldquo;fish&rdquo; (representing navigation and exploration) with &ldquo;bookmark&rdquo; - symbolizing a tool that helps you navigate the vast ocean of the internet.</p>
            <p>Created with ❤️ by <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">Amit Patil</a></p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 