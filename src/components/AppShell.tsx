import { useState, type ReactNode } from 'react';
import { Clock, LayoutDashboard, Timer, FolderKanban, Users, BarChart3, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export type View = 'dashboard' | 'timer' | 'projects' | 'clients' | 'reports';

interface AppShellProps {
  current: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'timer', label: 'Time Tracker', icon: Timer },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function AppShell({ current, onNavigate, children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Clock className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">Tempo</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-ink-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-4 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-ink-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-400 hover:text-white hover:bg-white/5 transition"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-ink-950 fixed inset-y-0 left-0 z-30">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-ink-950 animate-fade-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-400 hover:text-white hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-ink-950 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center">
              <Clock className="w-4 h-4 text-ink-950" strokeWidth={2.5} />
            </div>
            <span className="font-semibold tracking-tight">Tempo</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-ink-300 hover:text-white hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
