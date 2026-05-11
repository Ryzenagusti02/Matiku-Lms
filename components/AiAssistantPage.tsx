import React, { useState } from 'react';
import { generateAiResponse } from '../config/api';

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

const AiAssistantPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const result = await generateAiResponse({
                role: 'asisten',
                question: currentInput,
            });
            const aiMessage: Message = { sender: 'ai', text: result };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error: any) {
            console.error('Error calling AI backend:', error);
            const errorMessage: Message = {
                sender: 'ai',
                text: error.message || 'Maaf, terjadi kesalahan. Pastikan backend AI sudah berjalan.',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in-up">
            <h3 className="text-3xl font-medium text-white mb-4">AI Assistant Guru</h3>
            <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-[75vh]">
                <div className="flex-1 p-6 overflow-y-auto">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 h-full flex items-center justify-center">
                            Mulai percakapan dengan mengetik di bawah.
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                            <div className={`max-w-lg p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start mb-4">
                            <div className="max-w-lg p-3 rounded-lg bg-gray-700 text-gray-200">
                                <p className="animate-pulse">AI sedang berpikir...</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-700">
                    <div className="flex">
                        <input
                            type="text"
                            className="flex-1 p-2 bg-gray-700 text-gray-200 border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Tanya apa saja..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:bg-blue-800"
                        >
                            Kirim
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiAssistantPage;