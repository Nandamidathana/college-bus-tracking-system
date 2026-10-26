import React, { useState, useEffect } from 'react';
import { studentApi } from '../../services/api';
import {
  ShieldCheck,
  X,
  Copy,
  Check,
  Lock,
  Clock,
  Trash2,
  Share2,
  ExternalLink,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface GuardianLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  busId?: string;
  busNumber?: string;
}

export const GuardianLinkModal: React.FC<GuardianLinkModalProps> = ({
  isOpen,
  onClose,
  busId,
  busNumber,
}) => {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadLinks();
      setGeneratedUrl(null);
      setErrorMessage('');
    }
  }, [isOpen, busId]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const res = await studentApi.getGuardianLinks();
      if (res.data.success) {
        setLinks(res.data.links || []);
      }
    } catch (err: any) {
      console.error('Failed to load guardian links:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setErrorMessage('');
      const res = await studentApi.createGuardianLink({
        busId,
        label: label.trim() || undefined,
        expiryHours: Number(expiryHours),
      });

      if (res.data.success) {
        const fullUrl = `${window.location.origin}${res.data.relativeUrl}`;
        setGeneratedUrl(fullUrl);
        setLabel('');
        loadLinks();
      } else {
        setErrorMessage(res.data.error || 'Failed to generate link.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Error generating link.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRevoke = async (id: string) => {
    try {
      await studentApi.revokeGuardianLink(id);
      loadLinks();
    } catch (err: any) {
      setErrorMessage('Failed to revoke link.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Parent / Guardian Tracking Link</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure read-only tracking without exposing personal info
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Privacy Guarantee Banner */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Cryptographically Protected</span>
              Parents can monitor live bus movement, speed, and stops on the map. Student names, student contact numbers,
              and driver personal numbers remain completely private.
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* New Link Creation Form */}
          <form onSubmit={handleCreateLink} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Recipient Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mom & Dad, Guardian"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Link Expiration Duration
                </label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500 cursor-pointer font-semibold"
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Standard)</option>
                  <option value={48}>48 Hours (2 Days)</option>
                  <option value={72}>72 Hours (3 Days)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {generating ? 'Generating Secure Token...' : `Generate Link for Bus #${busNumber || 'Assigned'}`}
            </button>
          </form>

          {/* Newly Generated URL Display */}
          {generatedUrl && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Ready to Share!
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">One-Time Token</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 font-mono text-slate-700 dark:text-slate-200 select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(generatedUrl, 'new')}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                >
                  {copiedId === 'new' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'new' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Active Links List */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Guardian Links</h3>

            {loading ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading links...</div>
            ) : links.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No active guardian links. Generate one above to share with your family.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {link.label || 'Guardian Link'}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
                          Bus #{link.busNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Expires: {new Date(link.expiresAt).toLocaleDateString()} {new Date(link.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevoke(link.id)}
                      title="Revoke access"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianLinkModal;
