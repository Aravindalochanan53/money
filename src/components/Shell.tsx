import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingDown,
  ShieldAlert,
  Sliders,
  CheckSquare,
  HelpCircle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import { AsOfStamp } from './AsOfStamp';

interface ShellProps {
  children: React.ReactNode;
  activePath: string;
  onNavigate: (path: string) => void;
  onOpenAffordDrawer: () => void;
  actionBadgeCount?: number;
  businessName?: string;
  asOfDate?: string;
}

export const Shell: React.FC<ShellProps> = ({
  children,
  activePath,
  onNavigate,
  onOpenAffordDrawer,
  actionBadgeCount = 3,
  businessName = 'Sri Lakshmi Components Pvt Ltd',
  asOfDate = '2026-09-19'
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/overview', label: 'Overview', icon: LayoutDashboard },
    { path: '/timeline', label: 'Cash Timeline', icon: TrendingDown },
    { path: '/risk', label: 'Receivable Risk', icon: ShieldAlert },
    { path: '/scenarios', label: 'Scenario Simulator', icon: Sliders },
    { path: '/actions', label: 'Action Center', icon: CheckSquare, badge: actionBadgeCount },
    { path: '/import', label: 'Data Import', icon: FileSpreadsheet }
  ];

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans">
      {/* Persistent Mock API Banner */}
      <div className="bg-ink text-paper text-xs px-4 py-1 flex items-center justify-between font-mono border-b border-rule">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-threshold animate-pulse"></span>
          <span className="font-semibold tracking-wide">DEMO DATA — MOCK API ACTIVE</span>
        </div>
        <span className="text-[11px] text-ink-muted">Press Alt+A for "Can I afford this?" drawer</span>
      </div>

      {/* Main Top Header */}
      <header className="bg-surface border-b border-rule sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-ink p-1.5 rounded hover:bg-paper focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo / Brand Wordmark */}
          <div
            onClick={() => onNavigate('/overview')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded bg-cash text-surface flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              FC
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-ink block leading-none">
                FlowCred
              </span>
              <span className="text-[10px] text-ink-muted hidden sm:block leading-tight">
                Cash-Flow Decision Engine
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-rule hidden sm:block"></div>

          {/* Business Switcher / Context */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink font-medium bg-paper px-2.5 py-1 rounded border border-rule">
            <Building2 className="w-3.5 h-3.5 text-ink-muted" />
            <span className="truncate max-w-[200px]">{businessName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AsOfStamp date={asOfDate} className="hidden md:inline-flex" />

          {/* Persistent Hero CTA Button: Can I afford this? */}
          <button
            onClick={onOpenAffordDrawer}
            className="bg-cash text-surface text-xs font-semibold px-3.5 py-2 rounded-sm shadow-sm hover:bg-cash/90 focus:outline-none flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Can I afford this?</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-[73px] z-40 border-b border-rule bg-surface p-3 shadow-dropdown">
            <nav className="grid grid-cols-2 gap-2" aria-label="Mobile navigation">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activePath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { onNavigate(item.path); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-xs font-semibold ${isActive ? 'bg-cash/10 text-cash' : 'bg-paper text-ink-muted hover:text-ink'}`}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
        {/* Desktop Collapsible Left Navigation Rail */}
        <aside
          className={`hidden lg:flex flex-col bg-surface border-r border-rule transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-60'
          }`}
        >
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activePath === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-paper text-cash border-l-2 border-cash font-semibold'
                      : 'text-ink-muted hover:text-ink hover:bg-paper/60'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cash' : 'text-ink-muted'}`} />
                  {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                  {!collapsed && item.badge && item.badge > 0 ? (
                    <span className="bg-shortfall text-surface text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-rule space-y-1">
            <button
              onClick={() => onNavigate('/_design')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-xs text-ink-muted hover:text-ink hover:bg-paper ${
                activePath === '/_design' ? 'bg-paper text-cash font-semibold' : ''
              }`}
              title="Design System Component Showcase"
            >
              <Settings className="w-4 h-4 text-ink-muted" />
              {!collapsed && <span>Design System (/_design)</span>}
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-2 text-ink-muted hover:text-ink hover:bg-paper rounded-sm"
              aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden bg-surface border-t border-rule fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 px-1">
        {navItems.slice(0, 5).map(item => {
          const Icon = item.icon;
          const isActive = activePath === item.path;

          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium relative ${
                isActive ? 'text-cash font-bold' : 'text-ink-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label.split(' ')[0]}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-shortfall"></span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
