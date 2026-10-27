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
        </div>
      </div>
    </MobileAppLayout>
  );
};
