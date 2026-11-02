import React from 'react';
import { AppLocale } from '../types';
import { translations } from '../services/i18n';
import { Share, PlusSquare, Sparkles, X, Smartphone, Download } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  onTriggerNativeInstall: () => void;
  locale: AppLocale;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  onTriggerNativeInstall,
  locale,
}) => {
  if (!isOpen) return null;
  const t = translations[locale];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none animate-fade-in">
      <div className="w-full max-w-sm bg-[#131622] border border-[#232b3d] rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-[#1a2030]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/20">
          <Smartphone className="w-6 h-6 text-white" />
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          {isIOS ? t.pwa.iosTitle : t.pwa.installApp}
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Install NONONICK Forge for an instant, full-screen mobile workstation experience on Safari.
        </p>

        {isIOS ? (
          <div className="space-y-3.5 mb-6 text-xs text-slate-300">
            <div className="flex items-start gap-3 bg-[#0d0f16] p-3 rounded-xl border border-[#1e2434]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-sky-400 flex items-center justify-center shrink-0 font-bold font-mono">
                1
              </div>
              <div className="flex-1">
                <span className="font-semibold text-white block mb-0.5">Safari Share Button</span>
                <span>{t.pwa.iosStep1}</span>
              </div>
              <Share className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            </div>

            <div className="flex items-start gap-3 bg-[#0d0f16] p-3 rounded-xl border border-[#1e2434]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-sky-400 flex items-center justify-center shrink-0 font-bold font-mono">
                2
              </div>
              <div className="flex-1">
                <span className="font-semibold text-white block mb-0.5">Add to Home Screen</span>
                <span>{t.pwa.iosStep2}</span>
              </div>
              <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            </div>

            <div className="flex items-start gap-3 bg-[#0d0f16] p-3 rounded-xl border border-[#1e2434]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-sky-400 flex items-center justify-center shrink-0 font-bold font-mono">
                3
              </div>
              <div className="flex-1">
                <span className="font-semibold text-white block mb-0.5">Launch Fullscreen</span>
                <span>{t.pwa.iosStep3}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <button
              onClick={() => {
                onTriggerNativeInstall();
                onClose();
              }}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-98 transition"
            >
              <Download className="w-4 h-4" />
              <span>{t.pwa.installApp}</span>
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#1b2130] hover:bg-[#242b3e] text-slate-200 text-xs font-semibold transition"
        >
          {t.pwa.close}
        </button>
      </div>
    </div>
  );
};
