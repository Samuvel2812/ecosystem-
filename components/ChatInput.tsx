import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from './icons';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 192; // 12rem or max-h-48
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="flex items-start gap-2 p-1 bg-gray-800 rounded-xl border border-gray-700/80 transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent"
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about ecosystem management..."
        className="flex-grow bg-transparent text-white placeholder-gray-400 focus:outline-none px-4 py-2.5 resize-none max-h-48 overflow-y-auto"
        rows={1}
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="p-3 m-1 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 self-end"
        aria-label="Send message"
      >
        <SendIcon className="w-5 h-5" />
      </button>
    </form>
  );
};