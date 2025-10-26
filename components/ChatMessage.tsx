import React from 'react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUserModel = message.role === Role.MODEL;
  return (
    <div className={`flex items-start gap-4 my-4 animate-slideInUp ${!isUserModel ? 'justify-end' : ''}`}>
      {isUserModel && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
          AI
        </div>
      )}
      <div
        className={`max-w-2xl lg:max-w-3xl p-4 rounded-2xl shadow-lg ${
          isUserModel ? 'bg-gray-700 text-gray-100 rounded-tl-none' : 'bg-blue-600 text-white rounded-br-none'
        }`}
      >
        <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    </div>
  );
};