import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Mic, Users, ReceiptText, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { LogoWithText } from '@/components/Logo';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/voice', label: 'Voice Assistant', icon: Mic, highlight: true },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-navy-900 text-white">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center rounded-xl bg-white/10 text-forest-400 w-9 h-9">
            <Mic size={20} strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-lg tracking-tight">Bol Khata</div>
            <div className="text-[10px] font-semibold text-forest-400 uppercase tracking-widest">Voice Ledger</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => `
                flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all
                ${isActive
                  ? item.highlight
                    ? 'bg-forest-600 text-white shadow-sm'
                    : 'bg-white/10 text-white'
                  : item.highlight
                    ? 'bg-forest-600/15 text-forest-300 hover:bg-forest-600/25'
                    : 'text-navy-200 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <Icon size={19} strokeWidth={2.1} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[11px] text-navy-300 leading-relaxed">
          Built for <span className="text-forest-400 font-semibold">The Great Indian AI Internship Challenge 2026</span>
        </p>
      </div>
    </div>
  );
}
