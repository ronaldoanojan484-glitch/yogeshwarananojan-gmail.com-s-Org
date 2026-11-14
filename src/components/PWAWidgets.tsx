import React, { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4ad5d] bg-[#1a140b] text-[#f7e4b2] font-bold transition hover:bg-[#2a2010] whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'min-h-[36px] px-3 py-1.5 text-xs' : 'min-h-[44px] px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#6e552d] bg-[#141009] text-[#f7e4b2] font-semibold transition hover:border-[#d4ad5d] whitespace-nowrap shrink-0 cursor-pointer ${
            compact ? 'min-h-[36px] px-3 py-1.5 text-xs' : 'min-h-[44px] px-4 py-2.5 text-sm'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border-2 border-[#d4ad5d] bg-[#12100d] p-6 shadow-2xl">
              <h3 className="font-royal text-lg text-[#f7e4b2] mb-2">
                Install on iPhone / iPad
              </h3>
              <p className="text-sm text-[#ded4bf] leading-relaxed">
                1. Tap the <strong className="text-[#f7e4b2]">Share</strong> icon in Safari toolbar.
                <br />
                2. Scroll down and tap{' '}
                <strong className="text-[#f7e4b2]">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl gold-gradient-bg text-[#171107] font-bold text-sm cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-5 left-4 z-[250] flex items-center gap-2 rounded-xl border border-[#d4ad5d]/60 bg-[#1a140b]/95 px-3.5 py-2 text-xs font-semibold text-[#f7e4b2] shadow-xl backdrop-blur-md"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#f87171]" />
      <span>Offline Mode — App Shell Active</span>
    </div>
  );
};
