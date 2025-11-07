import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ChatMessage } from '../types';
import { SendIcon, SparklesIcon, ChatBubbleIcon, BookmarkIcon } from './icons';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, isShoppingQuery: boolean) => void;
  isLoading: boolean;
  isDesignMode: boolean;
  onSaveShoppingItem: (item: { name: string; url: string; description: string; }) => void;
}

const ShoppingItem: React.FC<{name: string, url: string, description: string, onSave: () => void}> = ({ name, url, description, onSave }) => (
    <div className="my-2 p-3 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-between gap-3">
        <div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                {name}
            </a>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{description}</p>
        </div>
        <button onClick={onSave} className="flex-shrink-0 p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors" aria-label="Save item">
            <BookmarkIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
    </div>
);

const ParsedMessage: React.FC<{ message: ChatMessage; onSaveShoppingItem: ChatInterfaceProps['onSaveShoppingItem'] }> = ({ message, onSaveShoppingItem }) => {
    const content = useMemo(() => {
        const shoppingLinkRegex = /- \*\*\[(.*?)\]\((.*?)\)\*\* - (.*)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        if (message.role === 'user' || !message.text.includes('- **[')) {
            return message.text.split('\n').map((line, i) => <span key={i}>{line}<br/></span>);
        }

        while ((match = shoppingLinkRegex.exec(message.text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(message.text.substring(lastIndex, match.index));
            }
            const [_, name, url, description] = match;
            parts.push(
                <ShoppingItem 
                    key={url}
                    name={name}
                    url={url}
                    description={description}
                    onSave={() => onSaveShoppingItem({ name, url, description })}
                />
            );
            lastIndex = shoppingLinkRegex.lastIndex;
        }

        if (lastIndex < message.text.length) {
            parts.push(message.text.substring(lastIndex));
        }
        
        return parts.map((part, index) => {
             if (typeof part === 'string') {
                return part.split('\n').map((line, i) => <span key={`${index}-${i}`}>{line}<br/></span>);
             }
             return part;
        });

    }, [message.text, onSaveShoppingItem]);

    return <div className="text-sm">{content}</div>;
}


const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading, isDesignMode, onSaveShoppingItem }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const shoppingKeywords = ['shop', 'buy', 'link', 'find', 'product', 'item'];
      const isShoppingQuery = isDesignMode && shoppingKeywords.some(kw => input.toLowerCase().includes(kw));
      onSendMessage(input, isShoppingQuery);
      setInput('');
    }
  };
  
  const placeholderText = isDesignMode 
    ? "e.g., 'Make the walls light blue' or 'Find a similar couch'"
    : "Ask anything about interior design...";

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col h-[60vh]">
      <div className="flex-1 p-6 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ChatBubbleIcon className="w-16 h-16" />
            <p className="mt-4 text-lg">
                {isDesignMode ? 'Start refining your design!' : 'Ask a question to get started!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0"><SparklesIcon className="w-5 h-5"/></div>}
                <div
                  className={`max-w-md lg:max-w-xl px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-none'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                  }`}
                >
                  <ParsedMessage message={msg} onSaveShoppingItem={onSaveShoppingItem} />
                </div>
              </div>
            ))}
            {isLoading && (
                 <div className="flex items-end gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0"><SparklesIcon className="w-5 h-5"/></div>
                    <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-none px-4 py-3">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:-.3s]"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:-.15s]"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholderText}
            className="w-full py-3 pl-4 pr-12 text-sm bg-gray-100 dark:bg-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute inset-y-0 right-0 flex items-center justify-center w-10 h-10 my-auto mr-1 text-white bg-indigo-500 rounded-full disabled:bg-indigo-300 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
