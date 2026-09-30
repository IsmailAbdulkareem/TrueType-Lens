'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  X,
  Bot,
  User,
  RotateCcw,
  CheckCircle2,
  Wand2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Palette,
  Type,
  Trash2,
} from 'lucide-react';
import { TextLayer } from '@/lib/canvas-renderer';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  operations?: Array<{
    type: string;
    description?: string;
    targetLayerId?: string;
  }>;
  quickSuggestions?: string[];
  timestamp: number;
}

interface ChatBotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  layers: TextLayer[];
  imageSrc: string | null;
  onApplyOperations: (operations: any[], explanation: string) => void;
  onUndoLastAction?: () => void;
}

const DEFAULT_SUGGESTIONS = [
  'Change the title to "OFFICIAL DIPLOMA"',
  'Change name to "Alexander Wright"',
  'Change the text color to golden yellow',
  'Make all text bold and sharp',
  'Change date to "OCTOBER 2026"',
  'Make font match the image ink',
];

export function ChatBotPanel({
  isOpen,
  onClose,
  layers,
  imageSrc,
  onApplyOperations,
  onUndoLastAction,
}: ChatBotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! I am your AI Image Editing Copilot. Just tell me what you want to change on the image in plain words, and I will execute the edits for you!',
      quickSuggestions: [
        'Change name to...',
        'Replace numbers/marks',
        'Make text bold & golden',
      ],
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          layers,
          imageBase64: imageSrc,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to edit image');
      }

      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Edits completed on your image!',
        operations: data.operations,
        quickSuggestions: data.quickSuggestions,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botReply]);

      // Apply operations on the canvas
      if (data.operations && data.operations.length > 0) {
        onApplyOperations(data.operations, data.reply || text);
      }
    } catch (err: any) {
      console.error('Chat edit error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          text: `I had trouble connecting to the model: ${err.message || 'Server is busy'}. You can also edit text directly by double-clicking on the image or using the Lens tool!`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 w-96 max-w-[calc(100vw-2rem)] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/80 transition-all duration-300 overflow-hidden ${
        isMinimized ? 'h-14' : 'h-[520px]'
      }`}
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                AutoEditor <span className="text-cyan-400">AI</span>
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400">Natural language image editor</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized((m) => !m)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close Chatbot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-fade-in`}
                >
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 font-semibold rounded-br-none shadow-cyan-500/10'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {/* Operations Applied Tag Pills */}
                    {!isUser && msg.operations && msg.operations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                          <span>Edits Applied ({msg.operations.length})</span>
                        </div>
                        {msg.operations.map((op, i) => (
                          <div
                            key={i}
                            className="text-[10px] px-2 py-1 bg-slate-900/90 rounded-md border border-slate-700/80 text-slate-300 flex items-center justify-between"
                          >
                            <span className="truncate flex-1">
                              {op.description || `${op.type}: ${op.targetLayerId || 'layer'}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick follow-up suggestion chips */}
                  {!isUser && msg.quickSuggestions && msg.quickSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 max-w-[95%]">
                      {msg.quickSuggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSend(sug)}
                          className="px-2 py-0.5 text-[10px] font-medium bg-slate-950/80 hover:bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 rounded-full transition-colors truncate max-w-full"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading state indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-2xl rounded-bl-none border border-slate-700/60 max-w-[80%] animate-pulse">
                <Wand2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span className="text-[11px] text-cyan-300 font-medium">
                  Analyzing image & making edits...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Presets Carousel if few messages */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-slate-400 shrink-0 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Try:
              </span>
              {DEFAULT_SUGGESTIONS.slice(0, 3).map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sug)}
                  className="px-2 py-0.5 text-[10px] font-medium bg-slate-950/70 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-800 rounded-full whitespace-nowrap transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/90">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 bg-slate-900 border border-slate-700 focus-within:border-cyan-400 rounded-xl px-3 py-1.5 transition-colors shadow-inner"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tell me what to change on the image..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-950 transition-all font-bold"
                title="Send instruction to AI"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
