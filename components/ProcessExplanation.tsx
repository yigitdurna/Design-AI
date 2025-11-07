import React from 'react';
import { SparklesIcon, LayoutGridIcon, ChatBubbleIcon } from './icons';

interface ProcessExplanationProps {
  onStart: () => void;
}

const ProcessExplanation: React.FC<ProcessExplanationProps> = ({ onStart }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col justify-center h-full animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">How It Works</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Follow these simple steps to transform your space.</p>
      
      <ul className="space-y-6 text-gray-700 dark:text-gray-300">
        <li className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
            <LayoutGridIcon className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h3 className="font-semibold">1. Select Your Style</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose a base style, then add optional colors and atmospheres in the Design Controls.</p>
          </div>
        </li>
        <li className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h3 className="font-semibold">2. Generate with AI</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Our AI will reimagine your room based on your selections while keeping the original structure.</p>
          </div>
        </li>
        <li className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
            <ChatBubbleIcon className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h3 className="font-semibold">3. Compare & Refine</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Use the slider to compare before and after. Then, use the chat to make further tweaks or find shoppable items.</p>
          </div>
        </li>
      </ul>
      
      <button 
        onClick={onStart} 
        className="w-full mt-10 inline-flex items-center justify-center gap-3 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md cursor-pointer hover:bg-indigo-700 transition-transform transform hover:scale-105"
      >
        Let's Get Started
      </button>
    </div>
  );
};

export default ProcessExplanation;
