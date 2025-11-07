import React from 'react';
import type { MoodBoardItem } from '../types';
import { XIcon, LayoutGridIcon } from './icons';

interface MoodBoardProps {
  items: MoodBoardItem[];
  onClose: () => void;
  onRemoveItem: (id: string) => void;
}

const MoodBoard: React.FC<MoodBoardProps> = ({ items, onClose, onRemoveItem }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="moodboard-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <LayoutGridIcon className="w-7 h-7 text-indigo-500" />
            <h2 id="moodboard-title" className="text-2xl font-bold text-gray-800 dark:text-white">My Mood Board</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close Mood Board"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <LayoutGridIcon className="w-20 h-20 opacity-50" />
              <p className="mt-6 text-xl">Your mood board is empty.</p>
              <p className="mt-2 text-gray-500">Save designs and items to see them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {items.map(item => (
                <div key={item.id} className="group relative bg-gray-100 dark:bg-gray-900 rounded-lg shadow-md overflow-hidden animate-fade-in">
                  <button 
                    onClick={() => onRemoveItem(item.id)} 
                    className="absolute top-2 right-2 z-10 p-1.5 bg-black bg-opacity-40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    aria-label={`Remove ${item.type}`}
                  >
                    <XIcon className="w-4 h-4" />
                  </button>

                  {item.type === 'design' ? (
                    <div>
                      <img src={item.imageUrl} alt={item.style} className="w-full h-48 object-cover" />
                      <div className="p-3">
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">Design</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.style}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 flex flex-col h-full">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">Shopping Item</p>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 text-base font-bold text-indigo-600 dark:text-indigo-400 hover:underline break-words">
                            {item.name}
                        </a>
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{item.description}</p>
                      </div>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs font-semibold text-indigo-500 hover:underline">
                        View Product &rarr;
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MoodBoard;
