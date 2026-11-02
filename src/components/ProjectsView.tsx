import React, { useState, useRef } from 'react';
import { Project, SupportedLanguage, AppLocale } from '../types';
import { translations } from '../services/i18n';
import { exportProjectToZip } from '../services/zipExport';
import JSZip from 'jszip';
import {
  FolderPlus,
  Download,
  Upload,
  Copy,
  Trash2,
  Search,
  Layers,
  FileCode,
  Calendar,
  X,
  RefreshCw,
  CheckCircle2,
  FileArchive,
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (p: Project) => void;
  onCreateProject: (name: string, description: string, language: SupportedLanguage, template?: string) => void;
  onCloneProject: (p: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onImportProject: (imported: Project) => void;
  locale: AppLocale;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onCloneProject,
  onDeleteProject,
  onImportProject,
  locale,
}) => {
  const t = translations[locale];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [template, setTemplate] = useState('blank');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ZIP Export UI State
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);
  const [exportToast, setExportToast] = useState<{
    message: string;
    filename: string;
    filesCount: number;
    blobSize: number;
  } | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateProject(name.trim(), desc.trim(), language, template);
    setName('');
    setDesc('');
    setShowNewModal(false);
  };

  /**
   * Bundles current or specified project files into a clean zip archive using JSZip,
   * generates a structured manifest (forge-project.json and manifest.json),
   * and triggers an automated browser download.
   */
  const handleExportZip = async (project: Project) => {
    try {
      setExportingProjectId(project.id);
      const result = await exportProjectToZip(project);
      setExportToast({
        message: t.projects.exportedToast,
        filename: result.filename,
        filesCount: result.filesCount,
        blobSize: result.blobSize,
      });
      setTimeout(() => {
        setExportToast((curr) => (curr?.filename === result.filename ? null : curr));
      }, 4000);
    } catch (err: any) {
      alert(`ZIP export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExportingProjectId(null);
    }
  };

  // Export as JSON bundle fallback
  const handleExportJson = (project: Project) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.json`;
    a.click();
  };

  // Import from ZIP or JSON
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text) as Project;
        const newProj: Project = {
          ...parsed,
          id: `proj_import_${Date.now()}`,
          name: `${parsed.name} (Imported)`,
          updatedAt: new Date().toISOString(),
        };
        onImportProject(newProj);
      } else if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const files: { id: string; path: string; content: string; language: string }[] = [];
        let metaName = file.name.replace(/\.zip$/i, '');
        let metaLang: SupportedLanguage = 'python';

        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue;
          const content = await zipEntry.async('string');
          if (relativePath === 'forge-project.json' || relativePath === 'manifest.json') {
            try {
              const meta = JSON.parse(content);
              if (meta.name) metaName = meta.name;
              if (meta.language) metaLang = meta.language;
            } catch (_) {}
            continue;
          }

          let lang = 'text';
          if (relativePath.endsWith('.py')) lang = 'python';
          else if (relativePath.endsWith('.js')) lang = 'javascript';
          else if (relativePath.endsWith('.json')) lang = 'json';
          else if (relativePath.endsWith('.html')) lang = 'html';
          else if (relativePath.endsWith('.css')) lang = 'css';

          files.push({
            id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            path: relativePath,
            content,
            language: lang,
          });
        }

        const newProj: Project = {
          id: `proj_import_${Date.now()}`,
          name: `${metaName} (Imported)`,
          description: `Imported from archive ${file.name}`,
          language: metaLang,
          files: files.length > 0 ? files : [{ id: 'main', path: 'main.py', content: '# Imported\n', language: 'python' }],
          activeFilePath: files[0]?.path || 'main.py',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          env: {},
          timeoutMs: 10000,
        };
        onImportProject(newProj);
      }
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0c12] p-3 sm:p-5 select-none relative">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1c2230] mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white">{t.projects.title}</h2>
          <span className="text-xs text-slate-500 font-mono">({projects.length})</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Current Project ZIP Button */}
          {activeProject && (
            <button
              onClick={() => handleExportZip(activeProject)}
              disabled={exportingProjectId === activeProject.id}
              className="h-8 px-2.5 rounded-lg bg-[#161f33] hover:bg-[#1e2a47] text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 shadow-sm"
              title={`Export active project "${activeProject.name}" as clean ZIP with manifest`}
            >
              {exportingProjectId === activeProject.id ? (
                <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="hidden xs:inline">
                {exportingProjectId === activeProject.id
                  ? t.projects.exporting
                  : t.projects.exportCurrentZip}
              </span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-2.5 rounded-lg bg-[#161b28] hover:bg-[#1e2538] text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-[#232b3d] transition active:scale-95"
            title="Import project from ZIP or JSON"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.projects.importZip}</span>
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-sky-600/20 transition active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{t.projects.newProject}</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-4 relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.projects.search}
          className="w-full bg-[#121622] border border-[#202738] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto space-y-2.5">
        {filteredProjects.map((p) => {
          const isActive = p.id === activeProjectId;
          const isExportingThis = exportingProjectId === p.id;

          return (
            <div
              key={p.id}
              onClick={() => onSelectProject(p)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col gap-2 ${
                isActive
                  ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/5'
                  : 'bg-[#121622]/80 hover:bg-[#151a28] border-[#1e2434]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">{p.name}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1c2232] text-sky-400 font-bold">
                      {p.language}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{p.description}</p>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* ZIP Export Button */}
                  <button
                    onClick={() => handleExportZip(p)}
                    disabled={isExportingThis}
                    className="p-1.5 rounded-lg bg-[#181e2c] hover:bg-[#222a3e] text-slate-300 transition disabled:opacity-50"
                    title={t.projects.exportZip}
                  >
                    {isExportingThis ? (
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </button>

                  <button
                    onClick={() => onCloneProject(p)}
                    className="p-1.5 rounded-lg bg-[#181e2c] hover:bg-[#222a3e] text-slate-300 transition"
                    title={t.projects.clone}
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  </button>

                  {projects.length > 1 && (
                    <button
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="p-1.5 rounded-lg bg-[#181e2c] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                      title={t.projects.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono pt-1 border-t border-[#1a202c]">
                <div className="flex items-center gap-1">
                  <FileCode className="w-3 h-3" />
                  <span>{p.files.length} {t.projects.filesCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export Toast Notification */}
      {exportToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#121826] border border-sky-500/40 text-slate-100 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-white">{exportToast.message}</span>
            <span className="text-[11px] text-slate-400 font-mono truncate">
              {exportToast.filename} · {exportToast.filesCount} files · {(exportToast.blobSize / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            onClick={() => setExportToast(null)}
            className="text-slate-400 hover:text-white p-1 ml-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-[#131722] border border-[#232b3d] rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{t.projects.newProject}</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name</label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Data Pipeline Core"
                className="w-full bg-[#090b10] border border-[#262f44] rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Brief summary of project"
                className="w-full bg-[#090b10] border border-[#262f44] rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Starter Template</label>
              <select
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  if (e.target.value === 'python_algo') setLanguage('python');
                  else if (e.target.value === 'node_cloud' || e.target.value === 'web_app') setLanguage('javascript');
                }}
                className="w-full bg-[#090b10] border border-[#262f44] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="python_algo">{t.projects.pythonTemplate}</option>
                <option value="node_cloud">{t.projects.nodeTemplate}</option>
                <option value="web_app">{t.projects.webTemplate}</option>
                <option value="blank">Blank Project</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Runtime</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('python')}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    language === 'python'
                      ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                      : 'bg-[#181d2a] border-[#252d40] text-slate-400'
                  }`}
                >
                  Python 3.12+
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('javascript')}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    language === 'javascript'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                      : 'bg-[#181d2a] border-[#252d40] text-slate-400'
                  }`}
                >
                  Node.js 22+
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2536]">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3.5 py-2 rounded-xl bg-[#1e2434] text-slate-300 text-xs font-semibold hover:bg-[#283146]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#131620] border border-[#262f44] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">{t.projects.delete}</h3>
            <p className="text-xs text-slate-300 mb-4">
              Are you sure you want to delete this project? This will remove all files stored in IndexedDB.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg bg-[#202738] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProject(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {t.projects.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
