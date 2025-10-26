import React from 'react';
import { SparklesIcon } from './icons';

interface ThinkingModeToggleProps {
    thinkingMode: boolean;
    onToggle: () => void;
}

export const ThinkingModeToggle: React.FC<ThinkingModeToggleProps> = ({ thinkingMode, onToggle }) => {
    return (
        <div>
            <label htmlFor="thinking-mode-toggle" className="flex items-center cursor-pointer">
                <div className="relative">
                    <input id="thinking-mode-toggle" type="checkbox" className="sr-only" checked={thinkingMode} onChange={onToggle} />
                    <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ${thinkingMode ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${thinkingMode ? 'transform translate-x-full' : ''}`}></div>
                </div>
                <div className="ml-3 text-gray-300 font-medium flex items-center gap-2">
                    <SparklesIcon className={`w-5 h-5 transition-all duration-300 ${thinkingMode ? 'text-emerald-400 scale-110 rotate-12' : 'text-gray-500'}`} />
                    Thinking Mode
                </div>
            </label>
            <p className="text-xs text-gray-500 mt-1 text-right">Resets chat on change</p>
        </div>
    );
};