import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Message, Role } from './types';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ThinkingModeToggle } from './components/ThinkingModeToggle';

const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingMode, setThinkingMode] = useState(() => {
        try {
            const savedMode = localStorage.getItem('thinkingMode');
            return savedMode ? JSON.parse(savedMode) : false;
        } catch (error) {
            console.error('Failed to parse thinkingMode from localStorage', error);
            return false;
        }
    });
    const [chat, setChat] = useState<Chat | null>(null);
    const [error, setError] = useState<{ message: string; canRetry: boolean } | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const lastUserMessageRef = useRef<string | null>(null);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading, error]);

    // Save conversation to localStorage whenever messages or mode change
    useEffect(() => {
        try {
            localStorage.setItem('thinkingMode', JSON.stringify(thinkingMode));
            const historyKey = thinkingMode ? 'chatHistory_thinking' : 'chatHistory_normal';
            if (messages.length > 0) {
                localStorage.setItem(historyKey, JSON.stringify(messages));
            }
        } catch (error) {
            console.error('Failed to save to localStorage', error);
        }
    }, [messages, thinkingMode]);


    const initializeChat = useCallback(() => {
        try {
            setError(null);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const model = thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
            
            const historyKey = thinkingMode ? 'chatHistory_thinking' : 'chatHistory_normal';
            const savedHistoryJSON = localStorage.getItem(historyKey);
            
            let savedMessages: Message[] | null = null;
            if (savedHistoryJSON) {
                try {
                    savedMessages = JSON.parse(savedHistoryJSON);
                } catch (e) {
                    console.error("Failed to parse chat history from localStorage", e);
                    localStorage.removeItem(historyKey); // Clear corrupted data
                }
            }
            
            let historyForGemini: Message[] = [];
            if (savedMessages) {
                let tempHistory = [...savedMessages];
                // The history for the gemini chat instance should end on a model turn.
                if (tempHistory.length > 0 && tempHistory[tempHistory.length - 1].role === Role.USER) {
                    tempHistory.pop();
                }
                historyForGemini = tempHistory;
            }

            const chatSession = ai.chats.create({
                model,
                history: historyForGemini.map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.content }],
                })),
                config: {
                    ...(thinkingMode ? { thinkingConfig: { thinkingBudget: 32768 } } : {}),
                    systemInstruction: 'You are an expert AI assistant specializing in ecosystem management. Provide detailed, accurate, and helpful answers to questions on this topic. Format your answers using markdown for readability (e.g., using headings, lists, bold text).',
                },
            });

            setChat(chatSession);

            if (savedMessages) {
                setMessages(savedMessages);
            } else {
                setMessages([
                    { role: Role.MODEL, content: `Hello! I am an AI expert in ecosystem management. ${thinkingMode ? '**Thinking mode is now active** for complex queries.' : ''} How can I help you today?` }
                ]);
            }

        } catch (e) {
            console.error("Failed to initialize chat:", e);
            const err = e as Error;
            let initError = "Failed to initialize chat. Please check your API key and configuration.";
            if (err.message?.includes('API_KEY')) {
                 initError = "Failed to initialize chat due to an API Key issue. Please ensure it is set up correctly and you have access.";
            }
            setError({ message: initError, canRetry: false });
            setMessages([]);
        }
    }, [thinkingMode]);

    useEffect(() => {
        initializeChat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [thinkingMode]);


    const executeSendMessage = async (userInput: string) => {
        if (!chat) {
            setError({ message: 'Chat session is not initialized.', canRetry: false });
            return;
        }

        setIsLoading(true);
        setError(null);
        lastUserMessageRef.current = userInput;

        try {
            const stream = await chat.sendMessageStream({ message: userInput });

            let firstChunk = true;
            let fullResponse = "";

            for await (const chunk of stream) {
                const chunkText = chunk.text;
                fullResponse += chunkText;

                if (firstChunk) {
                    setMessages(prev => [...prev, { role: Role.MODEL, content: fullResponse }]);
                    firstChunk = false;
                } else {
                    setMessages(prev => {
                        const lastMessageIndex = prev.length - 1;
                        if (prev[lastMessageIndex]?.role === Role.MODEL) {
                             const updatedLastMessage = {
                                ...prev[lastMessageIndex],
                                content: fullResponse,
                            };
                            return [
                                ...prev.slice(0, lastMessageIndex),
                                updatedLastMessage,
                            ];
                        }
                        return prev;
                    });
                }
            }
            lastUserMessageRef.current = null; // Clear on success
        } catch (e: any) {
            console.error("Error sending message:", e);
            let detailedMessage = "Sorry, an unexpected error occurred. Please try again.";
            if (e.message) {
                if (e.message.includes('API_KEY')) {
                    detailedMessage = "There seems to be an issue with your API Key. Please verify it's configured correctly.";
                } else if (e.message.includes('400')) {
                    detailedMessage = "The request was invalid, which could be due to safety settings or an issue with the prompt. Please adjust your input and try again.";
                } else if (e.message.includes('500') || e.message.includes('503')) {
                    detailedMessage = "A server error occurred. This is likely a temporary issue. Please wait a moment and try again.";
                } else {
                     detailedMessage = `An error occurred: ${e.message}`;
                }
            }
            setError({ message: detailedMessage, canRetry: true });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSendMessage = async (userInput: string) => {
        if (isLoading) return;
        const newUserMessage: Message = { role: Role.USER, content: userInput };
        setMessages(prev => [...prev, newUserMessage]);
        await executeSendMessage(userInput);
    };
    
    const handleRetry = async () => {
        if (lastUserMessageRef.current && !isLoading) {
            await executeSendMessage(lastUserMessageRef.current);
        }
    };

    const handleToggleThinkingMode = () => {
        setThinkingMode(prev => !prev);
    };

    return (
        <div className="flex flex-col h-screen text-white font-sans">
            <header className="p-4 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 shadow-lg z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-emerald-400">Ecosystem AI</h1>
                        <p className="text-sm text-gray-400">Your Guide to Ecosystem Management</p>
                    </div>
                    <ThinkingModeToggle thinkingMode={thinkingMode} onToggle={handleToggleThinkingMode} />
                </div>
            </header>

            <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 scroll-smooth">
                <div className="max-w-4xl mx-auto">
                    {messages.map((msg, index) => (
                        <ChatMessage key={index} message={msg} />
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-4 my-4 animate-slideInUp">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm relative">
                                <div className="absolute -inset-0.5 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                                <span className="relative">AI</span>
                            </div>
                            <div className="max-w-xl p-4 rounded-2xl bg-gray-700 text-gray-100 rounded-tl-none flex items-center gap-3">
                               <div className="flex space-x-1.5">
                                    <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '1s' }}></div>
                                    <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s', animationDuration: '1s' }}></div>
                                    <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s', animationDuration: '1s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                     {error && !isLoading && (
                        <div className="flex items-center justify-between gap-4 my-4 p-3 text-sm text-red-300 bg-red-900/60 rounded-lg shadow-md animate-slideInUp">
                           <p className="flex-grow">{error.message}</p>
                           {error.canRetry && (
                                <button
                                    onClick={handleRetry}
                                    className="px-4 py-1.5 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-900/60 focus:ring-red-500 transition-all duration-200 flex-shrink-0"
                                    aria-label="Retry sending message"
                                >
                                    Retry
                                </button>
                           )}
                        </div>
                     )}
                </div>
            </main>

            <footer className="p-4 bg-gray-900/50 backdrop-blur-sm sticky bottom-0 border-t border-gray-700/50">
                <div className="max-w-4xl mx-auto">
                    <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || (!!error && error.canRetry)} />
                </div>
            </footer>
        </div>
    );
};

export default App;
