// @ts-nocheck
'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { Bot, X, Sparkles, Send, Loader2 } from 'lucide-react';

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/chat',
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 9999,
          }}
        >
          <Sparkles style={{ width: 18, height: 18 }} />
          AI Copilot
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '380px',
          height: '560px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            padding: '16px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot style={{ width: 22, height: 22 }} />
              <span style={{ fontWeight: 600, fontSize: '16px' }}>Admin AI Copilot</span>
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '2px 8px',
                fontSize: '11px',
              }}>Gemini</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#f9fafb',
          }}>
            {messages.length === 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#9ca3af',
                textAlign: 'center',
                gap: '12px',
              }}>
                <Sparkles style={{ width: 40, height: 40, color: '#c4b5fd' }} />
                <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  こんにちは！<br />
                  プロフィールの更新や写真の確認など<br />
                  なんでもお気軽にどうぞ✨
                </p>
              </div>
            )}

            {messages.map((m) => {
              // Skip tool-only messages with no content
              const textContent = typeof m.content === 'string'
                ? m.content
                : Array.isArray(m.content)
                  ? m.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
                  : '';

              if (m.role !== 'user' && m.role !== 'assistant') return null;
              if (!textContent && m.role === 'assistant') return null;

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'white',
                    color: m.role === 'user' ? 'white' : '#1f2937',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    border: m.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                  }}>
                    {textContent}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#6b7280',
                  fontSize: '14px',
                }}>
                  <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                  考え中...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 16px',
            background: 'white',
            borderTop: '1px solid #f3f4f6',
          }}>
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', gap: '8px' }}
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="AIに指示を出す..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  border: '1px solid #e5e7eb',
                  borderRadius: '24px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#f9fafb',
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  background: input.trim() ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#e5e7eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Send style={{ width: 16, height: 16 }} />
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
