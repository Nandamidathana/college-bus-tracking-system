import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import {
  Bus as BusIcon,
  Copy,
  Check,
  Share2,
  Trash2,
  CheckCircle2,
  Shield,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const ParentTrackingScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeLink, setActiveLink] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);

  const fetchLinks = () => {
    setLoading(true);
    studentApi
      .getGuardianLinks()
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.links)) {
          const valid = res.data.links.find(
            (l: any) => !l.isRevoked && new Date(l.expiresAt) > new Date()
          );
          setActiveLink(valid || null);
        }
      })
      .catch((err) => console.warn('Fetch guardian links error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleGenerateLink = async () => {
    setActionError('');
    setActionMsg('');
    try {
      const res = await studentApi.createGuardianLink({
        expiryHours,
        label: 'Parent Tracking Link',
      });
      if (res.data.success) {
        setActiveLink(res.data.link);
        setActionMsg('New secure tracking link created!');
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to create tracking link.');
    }
  };

  const handleRevokeLink = async () => {
    if (!activeLink?.id) return;
    if (!window.confirm('Revoke this link? Parents with this link will no longer be able to track.')) return;

    try {
      await studentApi.revokeGuardianLink(activeLink.id);
      setActiveLink(null);
      setActionMsg('Tracking link revoked successfully.');
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to revoke link.');
    }
  };

  const getFullTrackingUrl = () => {
    if (!activeLink) return '';
    if (activeLink.trackingUrl) {
      if (activeLink.trackingUrl.startsWith('http')) return activeLink.trackingUrl;
      return `${window.location.origin}${activeLink.trackingUrl}`;
    }
    return `${window.location.origin}/track/bus/${activeLink.busId || '001'}?token=${activeLink.token || 'demo'}`;
  };

  const handleCopy = () => {
    const url = getFullTrackingUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = getFullTrackingUrl();
    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'College Bus Live Tracking',
          text: `Track my college bus in real time: ${url}`,
          url,
        });
        return;
      } catch {
        // fall back to copy
      }
    }
    handleCopy();
  };

  const busNumberDisplay = user?.busNumber || 'BUS-12';
  const routeNameDisplay = user?.routeName || 'Engineering Route';

  const expiresAtFormatted = activeLink?.expiresAt
    ? new Date(activeLink.expiresAt).toLocaleDateString([], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '26 Oct 2026, 7:30 PM';

  const displayUrlShort = activeLink
    ? `/track/bus/${activeLink.busId || '12'}?token=${(activeLink.token || '7f3a8b29').slice(0, 10)}...`
    : '/track/bus/12?token=7f3a8b29c4...';

  return (
    <MobileAppLayout showBottomNav={true} activeScreenIndex={9}>
      <div className="flex-1 flex flex-col justify-between">
        {/* Header */}
        <MobileHeader title="Share with Parents" showBack={true} />

        <div className="px-5 py-3 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Give your parents real-time access to your bus location.
          </p>

          {/* Status Banners */}
          {actionMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMsg}</span>
            </div>
          )}

          {actionError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Bus Summary Card */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <BusIcon className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                {busNumberDisplay.startsWith('BUS-') || busNumberDisplay.startsWith('Bus ') ? busNumberDisplay : `BUS-${busNumberDisplay}`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{routeNameDisplay}</p>
            </div>
          </div>

          {/* Tracking Link Box (Screen 9 Reference Design) */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Tracking Link
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>

            {/* Input / Display Field with Copy Icon */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300">
              <span className="truncate mr-2">{displayUrlShort}</span>
              <button
                onClick={handleCopy}
                className="text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                title="Copy Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Validity Label */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
              <span>Valid Until</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{expiresAtFormatted}</span>
            </div>
          </div>

          {/* Action Buttons: Share Link & Revoke Link */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleShare}
              className="w-full py-3.5 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 stroke-[2.2]" />
              <span>Share Link</span>
            </button>

            <button
              onClick={activeLink ? handleRevokeLink : handleGenerateLink}
              className="w-full py-2.5 px-6 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <span>{activeLink ? 'Revoke Link' : 'Generate New Link'}</span>
            </button>
          </div>

          {/* Info Section: "What your parents can see" Checklist */}
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              What your parents can see
            </h5>

            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Live bus location</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Estimated arrival time</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>Occupancy status</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
};
