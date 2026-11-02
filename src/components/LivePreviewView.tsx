import React, { useState, useEffect, useRef } from 'react';
import { Project, AppLocale } from '../types';
import { translations } from '../services/i18n';
import { RefreshCw, Smartphone, Tablet, Monitor, ExternalLink } from 'lucide-react';

interface LivePreviewViewProps {
  project: Project;
  locale: AppLocale;
}

export const LivePreviewView: React.FC<LivePreviewViewProps> = ({ project, locale }) => {
  const t = translations[locale];
  const [viewportMode, setViewportMode] = useState<'mobile' | 'tablet' | 'full'>('mobile');
  const [iframeSrcDoc, setIframeSrcDoc] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const buildPreview = () => {
    // Find index.html or fallback
    const htmlFile = project.files.find((f) => f.path === 'index.html' || f.path.endsWith('.html'));
    const cssFiles = project.files.filter((f) => f.path.endsWith('.css'));
    const jsFiles = project.files.filter((f) => f.path.endsWith('.js') && !f.path.includes('node_modules'));

    let htmlContent = htmlFile
      ? htmlFile.content
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{background:#0a0c10;color:#f1f5f9;font-family:sans-serif;padding:24px;text-align:center;}h2{color:#38bdf8;}</style></head><body><h2>${project.name}</h2><p>This project has no index.html file. Create an HTML file in the file explorer to preview live web applications.</p></body></html>`;

    // Inject inline styles
    const stylesBundle = cssFiles.map((c) => `<style>/* ${c.path} */\n${c.content}</style>`).join('\n');

    // Console capture script
    const consoleCaptureScript = `
      <script>
        (function() {
          const sendLog = (type, args) => {
            window.parent.postMessage({ type: 'FORGE_PREVIEW_CONSOLE', logType: type, message: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
          };
          const origLog = console.log;
          const origError = console.error;
          const origWarn = console.warn;
          console.log = function(...args) { origLog.apply(console, args); sendLog('log', args); };
          console.error = function(...args) { origError.apply(console, args); sendLog('error', args); };
          console.warn = function(...args) { origWarn.apply(console, args); sendLog('warn', args); };
          window.onerror = function(msg, url, line) {
            sendLog('error', [msg + ' (' + line + ')']);
          };
        })();
      </script>
    `;

    // Inject scripts
    const scriptsBundle = jsFiles.map((j) => `<script>/* ${j.path} */\n${j.content}</script>`).join('\n');

    // Combine
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${stylesBundle}\n${consoleCaptureScript}</head>`);
    } else {
      htmlContent = `${stylesBundle}\n${consoleCaptureScript}\n${htmlContent}`;
    }

    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `${scriptsBundle}</body>`);
    } else {
      htmlContent = `${htmlContent}\n${scriptsBundle}`;
    }

    setConsoleLogs([]);
    setIframeSrcDoc(htmlContent);
  };

  useEffect(() => {
    buildPreview();
  }, [project.id, project.files]);

  // Listen to iframe console messages
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data && e.data.type === 'FORGE_PREVIEW_CONSOLE') {
        setConsoleLogs((prev) => [...prev.slice(-30), `[${e.data.logType.toUpperCase()}] ${e.data.message}`]);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, []);

  const getContainerWidth = () => {
    switch (viewportMode) {
      case 'mobile':
        return 'max-w-[430px]'; // iPhone 16 Pro Max viewport width
      case 'tablet':
        return 'max-w-[768px]';
      case 'full':
        return 'w-full';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090b10] select-none">
      {/* Preview Header */}
      <div className="h-11 bg-[#10131c] border-b border-[#1c2230] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-200">{t.preview.title}</h2>
        </div>

        {/* Viewport switchers & Refresh */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#161b28] border border-[#22293a] rounded-lg p-0.5">
            <button
              onClick={() => setViewportMode('mobile')}
              className={`p-1.5 rounded-md transition ${viewportMode === 'mobile' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
              title={t.preview.mobile16}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewportMode('tablet')}
              className={`p-1.5 rounded-md transition ${viewportMode === 'tablet' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
              title={t.preview.tablet}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewportMode('full')}
              className={`p-1.5 rounded-md transition ${viewportMode === 'full' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
              title={t.preview.fullWidth}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={buildPreview}
            className="h-8 px-2.5 rounded-lg bg-[#161b28] hover:bg-[#1e2538] text-slate-200 text-xs font-semibold flex items-center gap-1 border border-[#22293a] transition"
            title="Reload Preview"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">{t.preview.reload}</span>
          </button>
        </div>
      </div>

      {/* Frame Canvas */}
      <div className="flex-1 bg-[#06070a] p-2 sm:p-4 flex flex-col items-center justify-center min-h-0 overflow-auto">
        <div className={`w-full ${getContainerWidth()} h-full flex flex-col transition-all duration-300`}>
          {/* Simulated Device Frame for iPhone mode */}
          <div className="flex-1 flex flex-col bg-[#121622] rounded-2xl border border-[#242b3d] overflow-hidden shadow-2xl relative">
            {viewportMode === 'mobile' && (
              <div className="h-6 bg-[#161c2b] border-b border-[#20273c] flex items-center justify-center relative px-4 shrink-0">
                <div className="w-20 h-3.5 bg-black rounded-full" />
              </div>
            )}

            <iframe
              ref={iframeRef}
              srcDoc={iframeSrcDoc}
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              title="Forge Live Preview"
              className="flex-1 w-full h-full border-0 bg-[#0d0f14]"
            />
          </div>

          {/* Console logs drawer */}
          {consoleLogs.length > 0 && (
            <div className="mt-2 max-h-24 bg-[#0a0d14] border border-[#1d2332] rounded-lg p-2 overflow-y-auto text-[10px] font-mono text-slate-300 space-y-1">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Console Stream</div>
              {consoleLogs.map((log, i) => (
                <div key={i} className="truncate">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
