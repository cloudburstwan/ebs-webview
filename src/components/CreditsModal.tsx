import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { creditsData } from '../utils/creditsData';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreditsModal = ({ isOpen, onClose }: CreditsModalProps) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fade-in-slide-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 glass">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 flex-none bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col">
            <h2 id="credits-modal-title" className="text-xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400">
              Credits & Contributors
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              The creative minds behind the project.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200 active:scale-95 cursor-pointer"
            aria-label="Close credits dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {creditsData.map((section, idx) => (
            <section key={idx} className="space-y-4">
              <div className="flex flex-col border-b border-slate-100 dark:border-white/5 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-500">
                  {section.title}
                </h3>
                {section.description && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                    {section.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {section.contributors.map((contrib, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-teal-500/20 dark:hover:border-teal-400/20 hover:shadow-lg dark:hover:shadow-teal-500/5 transition-all duration-300 flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      {contrib.avatarUrl ? (
                        <img
                          src={contrib.avatarUrl}
                          alt={`${contrib.name}'s avatar`}
                          className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                          {contrib.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                          {contrib.name}
                        </span>
                        {contrib.role && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                            {contrib.role}
                          </span>
                        )}
                      </div>
                    </div>

                    {contrib.links && contrib.links.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                        {contrib.links.map((link, lIdx) => (
                          <a
                            key={lIdx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 transition-colors uppercase tracking-wider"
                          >
                            {link.label}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/10 flex-none text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide uppercase">
            Thank you to all who contribute and support!
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreditsModal;
