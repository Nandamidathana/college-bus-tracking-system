import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CollegeBusLogo } from '../../components/common/CollegeBusLogo';
import { CampusBusIllustration } from '../../components/common/CampusBusIllustration';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { ArrowRight } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user && user.role === 'STUDENT') {
      navigate('/student/dashboard');
    } else {
      navigate('/student/login');
    }
  };

  return (
    <MobileAppLayout showBottomNav={false} activeScreenIndex={1}>
      <div className="flex-1 flex flex-col justify-between items-center px-6 py-6 text-center select-none">
        {/* Top Logo & Title */}
        <div className="pt-4">
          <CollegeBusLogo size="lg" showSubtitle={true} />
        </div>

        {/* Center Campus & Bus Illustration */}
        <div className="w-full my-auto py-2">
          <CampusBusIllustration className="w-full h-56 sm:h-64" variant="splash" />
        </div>

        {/* Bottom Actions */}
        <div className="w-full space-y-4 pb-4">
          {/* Get Started Pill Button */}
          <button
            onClick={handleGetStarted}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-base shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Already have an account link */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              to="/student/login"
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Login
            </Link>
          </div>

          {/* Quick Role Portal Buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 mb-2">
              Select Portal Login
            </p>
            <div className="flex items-center justify-center gap-2">
              <Link
                to="/student/login"
                className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 text-[11px] active:scale-95 transition-all"
              >
                🎓 Student
              </Link>
              <Link
                to="/driver/login"
                className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 text-[11px] active:scale-95 transition-all"
              >
                🚌 Driver
              </Link>
              <Link
                to="/admin/login"
                className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 text-[11px] active:scale-95 transition-all"
              >
                🛡️ Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
};
