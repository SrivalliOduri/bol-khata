import { useEffect, useState } from 'react';
import { Menu, Bell, Store, ChevronRight } from 'lucide-react';

interface TopbarProps {
  shopName: string;
  onMenuClick: () => void;
}

export function Topbar({ shopName, onMenuClick }: TopbarProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="sticky top-0 z-30 bg-sand-50/90 backdrop-blur-md border-b border-navy-100">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-navy-700 hover:bg-navy-100 transition"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-navy-400 uppercase tracking-wide hidden sm:block">{dateStr}</p>
            <h1 className="font-bold text-navy-900 text-base sm:text-lg truncate flex items-center gap-1.5">
              <Store size={16} className="text-navy-500 hidden sm:inline" />
              {shopName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="relative p-2 rounded-xl text-navy-600 hover:bg-navy-100 transition" aria-label="Notifications">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-forest-500 rounded-full ring-2 ring-sand-50" />
          </button>
          <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l border-navy-200">
            <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center font-bold text-sm">
              {shopName.charAt(0).toUpperCase()}
            </div>
            <ChevronRight size={16} className="text-navy-300 hidden sm:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
