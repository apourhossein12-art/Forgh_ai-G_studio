import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project, ProjectFile, AppLocale } from '../types';
import { translations } from '../services/i18n';
import {
  Play,
  Square,
  Save,
  Search,
  Undo2,
  Redo2,
  FileCode,
  Sparkles,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';

interface EditorViewProps {
  project: Project;
  activeFile: ProjectFile | null;
  onUpdateFileContent: (fileId: string, newContent: string) => void;
  onSaveFile: (fileId: string) => void;
  onRunCode: () => void;
  onStopRun: () => void;
  isRunning: boolean;
  locale: AppLocale;
  onSelectFile: (filePath: string) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  project,
  activeFile,
  onUpdateFileContent,
  onSaveFile,
  onRunCode,
  onStopRun,
  isRunning,
  locale,
  onSelectFile,
}) => {
  const t = translations[locale];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Undo / Redo history
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Search & replace state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [saveToast, setSaveToast] = useState(false);

  // Cursor position
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Initialize history when active file changes
  useEffect(() => {
    if (activeFile) {
      setHistory([activeFile.content]);
      setHistoryIndex(0);
    }
  }, [activeFile?.id]);

  // Sync line numbers scrolling with textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Cursor calculation
  const updateCursorInfo = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;
    const lines = text.slice(0, selStart).split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Content change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (activeFile) {
      onUpdateFileContent(activeFile.id, val);
      // Push to history
      const newHist = history.slice(0, historyIndex + 1);
      newHist.push(val);
      if (newHist.length > 50) newHist.shift();
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);
    }
    updateCursorInfo();
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0 && activeFile) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateFileContent(activeFile.id, prev);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1 && activeFile) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateFileContent(activeFile.id, next);
    }
  };

  // Quick insertion tool for mobile keyboard
  const insertText = useCallback((textToInsert: string, cursorOffset = textToInsert.length) => {
    const textarea = textareaRef.current;
    if (!textarea || !activeFile) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;

    const newVal = val.substring(0, start) + textToInsert + val.substring(end);
    onUpdateFileContent(activeFile.id, newVal);

    // Re-focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = start + cursorOffset;
      textarea.setSelectionRange(newPos, newPos);
      updateCursorInfo();
    }, 10);
  }, [activeFile, onUpdateFileContent]);

  // Handle Tab and Bracket Auto-close
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeFile || !textareaRef.current) return;

    // Save with Cmd+S / Ctrl+S
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      onSaveFile(activeFile.id);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
      return;
    }

    // Run with Cmd+Enter / Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRunCode();
      return;
    }

    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  ', 2);
      return;
    }

    // Auto-closing brackets & quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`',
    };

    if (pairs[e.key]) {
      const closing = pairs[e.key];
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selected = activeFile.content.substring(start, end);

      e.preventDefault();
      insertText(`${e.key}${selected}${closing}`, 1);
    }
  };

  // Search & replace logic
  const handleSearchReplace = (replaceAll = false) => {
    if (!activeFile || !searchQuery) return;
    const content = activeFile.content;
    let newContent = '';

    if (replaceAll) {
      newContent = content.split(searchQuery).join(replaceQuery);
    } else {
      const idx = content.indexOf(searchQuery);
      if (idx !== -1) {
        newContent = content.substring(0, idx) + replaceQuery + content.substring(idx + searchQuery.length);
      } else {
        return;
      }
    }
    onUpdateFileContent(activeFile.id, newContent);
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <FileCode className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm font-medium">{t.editor.noFileOpen}</p>
      </div>
    );
  }

  const linesCount = (activeFile.content.match(/\n/g) || []).length + 1;
  const lineNumbers = Array.from({ length: linesCount }, (_, i) => i + 1);

  // Quick keys buttons tailored for Python & JS on iPhone
  const quickKeys = [
    { label: 'Tab', val: '  ' },
    { label: '{ }', val: '{\n  \n}', offset: 3 },
    { label: '( )', val: '()', offset: 1 },
    { label: '[ ]', val: '[]', offset: 1 },
    { label: '=>', val: ' => ' },
    { label: ';', val: ';' },
    { label: ':', val: ':' },
    { label: '"', val: '""', offset: 1 },
    { label: "'", val: "''", offset: 1 },
    { label: '=', val: ' = ' },
    { label: '==', val: ' == ' },
    { label: '+', val: ' + ' },
    { label: '-', val: ' - ' },
    { label: '/', val: '/' },
    { label: '$', val: '$' },
    { label: '_', val: '_' },
    { label: 'def', val: 'def ' },
    { label: 'print()', val: 'print()', offset: 6 },
    { label: 'log()', val: 'console.log();', offset: 12 },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090b10] relative">
      {/* Top Editor Toolbar */}
      <div className="h-11 bg-[#10131c] border-b border-[#1c2230] px-3 flex items-center justify-between gap-2 shrink-0 select-none">
        {/* File name & Switcher */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center">
            <select
              value={activeFile.path}
              onChange={(e) => onSelectFile(e.target.value)}
              className="bg-transparent text-slate-200 text-xs sm:text-sm font-mono font-semibold focus:outline-none cursor-pointer truncate max-w-[150px] sm:max-w-[240px]"
            >
              {project.files.map((f) => (
                <option key={f.id} value={f.path} className="bg-[#141824] text-slate-200">
                  {f.path}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none -ml-1" />
          </div>

          {activeFile.isModified && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title={t.editor.unsaved} />
          )}

          {saveToast && (
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 animate-fade-in">
              <Check className="w-3 h-3" /> {t.editor.saved}
            </span>
          )}
        </div>

        {/* Action Buttons: Undo, Redo, Search, Save, Run/Stop */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="w-8 h-8 rounded-md bg-[#161b28] hover:bg-[#1e2538] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="w-8 h-8 rounded-md bg-[#161b28] hover:bg-[#1e2538] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition ${
              showSearch ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-[#161b28] hover:bg-[#1e2538] text-slate-300'
            }`}
            title="Find & Replace"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              onSaveFile(activeFile.id);
              setSaveToast(true);
              setTimeout(() => setSaveToast(false), 2000);
            }}
            className="h-8 px-2.5 rounded-md bg-[#161b28] hover:bg-[#1e2538] text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
          >
            <Save className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">{t.editor.save}</span>
          </button>

          {/* Execution RUN / STOP CTA */}
          {isRunning ? (
            <button
              onClick={onStopRun}
              className="h-8 px-3 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-rose-600/30 transition active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t.editor.stop}</span>
            </button>
          ) : (
            <button
              onClick={onRunCode}
              className="h-8 px-3.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 transition active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.editor.run}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Replace Panel */}
      {showSearch && (
        <div className="bg-[#121622] border-b border-[#202738] p-2 flex flex-wrap items-center gap-2 select-none z-10 text-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.editor.searchPlaceholder}
            className="flex-1 min-w-[130px] bg-[#090b10] border border-[#262f44] rounded px-2 py-1 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder={t.editor.replacePlaceholder}
            className="flex-1 min-w-[130px] bg-[#090b10] border border-[#262f44] rounded px-2 py-1 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={() => handleSearchReplace(false)}
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded transition"
          >
            Replace
          </button>
          <button
            onClick={() => handleSearchReplace(true)}
            className="px-2.5 py-1 bg-[#202738] hover:bg-[#2b354c] text-slate-200 font-medium rounded transition"
          >
            All
          </button>
          <button
            onClick={() => setShowSearch(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor Surface: Line Numbers + Textarea */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="w-10 sm:w-12 bg-[#090b10] border-r border-[#161c28] text-[#4b556b] font-mono text-xs select-none py-3 px-1 text-right overflow-hidden shrink-0"
        >
          {lineNumbers.map((num) => (
            <div key={num} className="leading-6 h-6">
              {num}
            </div>
          ))}
        </div>

        {/* Textarea Code Input */}
        <textarea
          ref={textareaRef}
          value={activeFile.content}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onClick={updateCursorInfo}
          onKeyUp={updateCursorInfo}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          className="flex-1 bg-transparent text-slate-100 code-font text-xs sm:text-sm leading-6 py-3 px-3 sm:px-4 resize-none focus:outline-none overflow-auto whitespace-pre font-normal selection:bg-sky-500/30"
          style={{
            tabSize: 2,
          }}
        />
      </div>

      {/* Mobile Quick-Keys Assistant Toolbar */}
      <div className="h-10 bg-[#0d1017] border-t border-[#181f2c] px-1 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 select-none z-10">
        {quickKeys.map((k, i) => (
          <button
            key={i}
            onClick={() => insertText(k.val, k.offset)}
            className="min-w-[36px] h-8 px-2 rounded bg-[#151a26] active:bg-sky-600 active:text-white text-slate-300 hover:text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0 border border-[#202738] transition-colors"
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Bottom Status Line */}
      <div className="h-6 bg-[#07090d] border-t border-[#141822] px-3 flex items-center justify-between text-[11px] text-slate-500 font-mono select-none shrink-0">
        <div className="flex items-center gap-3">
          <span>{activeFile.language.toUpperCase()}</span>
          <span>{activeFile.content.length} {t.editor.chars}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{t.editor.line} {cursorPos.line}, {t.editor.col} {cursorPos.col}</span>
        </div>
      </div>
    </div>
  );
};
