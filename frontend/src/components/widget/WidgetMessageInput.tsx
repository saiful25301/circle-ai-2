import React, { useState, useRef } from 'react';
import { Send, Paperclip, Sparkles } from 'lucide-react';
import { Language, translations } from './localization/translations';

interface WidgetMessageInputProps {
  language: Language;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  onQuickChipClick: (query: string) => void;
}

export const WidgetMessageInput: React.FC<WidgetMessageInputProps> = ({
  language,
  onSendMessage,
  disabled = false,
  onQuickChipClick,
}) => {
  const t = translations[language];
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setText('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
  };

  const quickChips = t.quickQuestions.slice(0, 4);

  return (
    <div className="bg-white border-t border-slate-200 p-2.5 sm:p-3 space-y-2 shadow-2xs shrink-0">
      {/* Horizontal Suggested Quick Chips */}
      <div className="flex gap-1.5 overflow-x-auto widget-scroll pb-1 touch-pan-x -mx-0.5 px-0.5">
        {quickChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onQuickChipClick(chip.query)}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-900 text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95 disabled:opacity-50 shadow-2xs shrink-0"
          >
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Input Box Shell */}
      <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 focus-within:border-amber-500 focus-within:bg-white rounded-2xl p-2 transition-all shadow-inner">
        {/* Mock Attachment / Emoji */}
        <button
          type="button"
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
          title="Attach file (PDF, Screenshot)"
          aria-label="Attach file"
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text Area */}
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={t.inputPlaceholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none resize-none max-h-24 min-h-[24px] py-1 leading-relaxed"
        />

        {/* Send Button Styled in Golden-Amber to Orange Gradient */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-40 disabled:hover:from-amber-500 disabled:hover:to-orange-500 transition-all font-bold shrink-0 shadow-xs active:scale-95"
          title={t.send}
          aria-label={t.send}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Small Brand Tagline */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
        <span>Press <kbd className="font-mono bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-slate-600 text-[9px]">Enter ↵</kbd> to send</span>
        <span className="flex items-center gap-1 text-amber-700 font-semibold">
          <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Circle AI Engine
        </span>
      </div>
    </div>
  );
};
