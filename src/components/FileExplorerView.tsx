import React, { useState } from 'react';
import { Project, ProjectFile, AppLocale } from '../types';
import { translations } from '../services/i18n';
import {
  FilePlus,
  Trash2,
  Edit2,
  FileCode,
  FileText,
  FileJson,
  File,
  Check,
  X,
  FolderOpen,
} from 'lucide-react';

interface FileExplorerViewProps {
  project: Project;
  activeFile: ProjectFile | null;
  onSelectFile: (filePath: string) => void;
  onCreateFile: (filePath: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  locale: AppLocale;
}

export const FileExplorerView: React.FC<FileExplorerViewProps> = ({
  project,
  activeFile,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  locale,
}) => {
  const t = translations[locale];

  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [renameTarget, setRenameTarget] = useState<ProjectFile | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getFileIcon = (filePath: string) => {
    if (filePath.endsWith('.py')) return <span className="text-yellow-400 font-bold text-xs font-mono">PY</span>;
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return <span className="text-amber-400 font-bold text-xs font-mono">JS</span>;
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return <span className="text-sky-400 font-bold text-xs font-mono">TS</span>;
    if (filePath.endsWith('.json')) return <FileJson className="w-4 h-4 text-emerald-400" />;
    if (filePath.endsWith('.html')) return <FileCode className="w-4 h-4 text-orange-400" />;
    if (filePath.endsWith('.css')) return <FileCode className="w-4 h-4 text-sky-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;
    onCreateFile(newFilePath.trim());
    setNewFilePath('');
    setShowNewFileModal(false);
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameVal.trim()) return;
    onRenameFile(renameTarget.path, renameVal.trim());
    setRenameTarget(null);
    setRenameVal('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0c12] p-4 select-none">
      {/* Explorer Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c2230] mb-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-sky-400" />
          <h2 className="text-sm font-bold text-slate-100">{t.files.title}</h2>
          <span className="text-xs text-slate-500 font-mono">({project.files.length})</span>
        </div>

        <button
          onClick={() => setShowNewFileModal(true)}
          className="h-8 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-sky-600/20 transition active:scale-95"
        >
          <FilePlus className="w-3.5 h-3.5" />
          <span>{t.files.newFile}</span>
        </button>
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <form onSubmit={handleCreate} className="mb-4 bg-[#141824] border border-[#232b3d] rounded-xl p-3 shadow-lg">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.files.fileNamePrompt}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="e.g. models.py or src/index.js"
              className="flex-1 bg-[#090b10] border border-[#262f44] rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowNewFileModal(false)}
              className="p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Files List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {project.files.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            {t.files.fileEmpty}
          </div>
        ) : (
          project.files.map((file) => {
            const isActive = activeFile?.id === file.id;
            const isRenaming = renameTarget?.id === file.id;

            if (isRenaming) {
              return (
                <form
                  key={file.id}
                  onSubmit={handleRename}
                  className="flex items-center gap-2 p-2 bg-[#141824] border border-sky-500/50 rounded-lg"
                >
                  <input
                    type="text"
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    className="flex-1 bg-[#090b10] border border-[#262f44] rounded px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none"
                  />
                  <button type="submit" className="p-1 text-emerald-400 hover:text-emerald-300">
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenameTarget(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              );
            }

            return (
              <div
                key={file.id}
                onClick={() => onSelectFile(file.path)}
                className={`group flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/10 border-sky-500/30 text-white'
                    : 'bg-[#121622]/60 hover:bg-[#161b2a] border-[#1e2536] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-[#1c2232] shrink-0">
                    {getFileIcon(file.path)}
                  </div>
                  <span className="font-mono text-xs sm:text-sm truncate">
                    {file.path}
                  </span>
                  {file.isModified && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameTarget(file);
                      setRenameVal(file.path);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-200 transition"
                    title={t.files.rename}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {project.files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(file.id);
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title={t.files.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#131620] border border-[#262f44] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">{t.files.delete}</h3>
            <p className="text-xs text-slate-300 mb-4">{t.files.confirmDelete}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg bg-[#202738] text-slate-300 text-xs font-semibold hover:bg-[#2b354c]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteFile(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {t.files.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
