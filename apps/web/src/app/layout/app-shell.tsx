import { Activity, Briefcase, LayoutDashboard, Moon, Newspaper, Settings, Sun } from 'lucide-react';
import { clsx } from 'clsx';
import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CURRENCY_OPTIONS } from '../../shared/constants/currency.constants';
import type { CurrencyCode } from '../../shared/constants/currency.constants';
import type { Locale } from '../../shared/i18n/messages';
import { t } from '../../shared/i18n/messages';

interface AppShellProps {
  children: ReactNode;
  isDark: boolean;
  locale: Locale;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onToggleTheme: () => void;
  onToggleLocale: () => void;
}

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, key: 'nav.dashboard', shortKey: 'nav.dashboardShort' },
  { to: '/news', icon: Newspaper, key: 'nav.intel', shortKey: 'nav.intelShort' },
  { to: '/portfolio', icon: Briefcase, key: 'nav.assets', shortKey: 'nav.assetsShort' },
  { to: '/settings', icon: Settings, key: 'nav.system', shortKey: 'nav.systemShort' },
] as const;

export function AppShell({
  children,
  isDark,
  locale,
  currency,
  onCurrencyChange,
  onToggleTheme,
  onToggleLocale,
}: AppShellProps) {
  const rootBg = isDark
    ? 'bg-zinc-950 text-zinc-100'
    : 'bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-50/20 text-slate-900';

  const sidebarBg = isDark
    ? 'bg-zinc-950/80 border-zinc-800/70'
    : 'bg-white/55 border-slate-200/70';

  const navActiveClass = isDark
    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/70';

  const navInactiveClass = isDark
    ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/70 border border-transparent'
    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent';

  const bottomNavBg = isDark
    ? 'bg-zinc-950/90 border-zinc-800/80'
    : 'bg-white/90 border-slate-200/80';

  const tickerBg = isDark
    ? 'bg-zinc-900/60 border-zinc-800'
    : 'bg-white/60 border-slate-200/60';

  return (
    <div
      className={clsx(
        'flex h-screen w-full overflow-hidden font-sans antialiased selection:bg-emerald-500/25',
        rootBg,
      )}
    >
      <aside className={clsx('hidden w-64 shrink-0 border-r p-5 md:flex md:flex-col', sidebarBg)}>
        <div className="mb-7 mt-1 flex items-center gap-3 px-1">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            SightFi
          </h1>
        </div>

        <nav className="flex-1 space-y-1.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-base transition-all duration-200',
                  isActive ? navActiveClass : navInactiveClass,
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="font-medium tracking-wide">{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-4">
          <div className={clsx('relative flex h-6 items-center overflow-hidden rounded-lg border', tickerBg)}>
            <div className="ticker-marquee whitespace-nowrap text-[11px] font-mono">
              <span className="mx-2 text-emerald-500">BTC $68,420 +0.8%</span>
              <span className="mx-2 text-rose-400">ETH $3,840 -1.2%</span>
              <span className="mx-2 text-emerald-500">NVDA $892 +3.4%</span>
              <span className="mx-2 text-rose-400">TSLA $172 -2.1%</span>
              <span className="mx-2 text-emerald-500">AAPL $178 +1.2%</span>
              <span className="mx-2 text-amber-400">GOLD $2,345 +0.3%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
              className={clsx(
                'rounded-xl border px-2 py-2 text-sm outline-none transition-all',
                isDark
                  ? 'border-zinc-800 bg-zinc-900/50 text-zinc-200 hover:border-zinc-700'
                  : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300',
              )}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleTheme}
              className={clsx(
                'flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm transition-all',
                isDark
                  ? 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700'
                  : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300',
              )}
            >
              {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              <span>{isDark ? t('app.darkMode') : t('app.dayMode')}</span>
            </button>
            <button
              type="button"
              onClick={onToggleLocale}
              className={clsx(
                'rounded-xl border px-2 py-2 text-sm font-medium transition-all',
                isDark
                  ? 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700'
                  : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300',
              )}
            >
              {locale === 'en' ? '中文' : 'EN'}
            </button>
          </div>

        </div>
      </aside>

      <main className="relative flex-1 overflow-y-auto scrollbar-thin">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.06),transparent_55%)]" />
        <div className="relative z-20 w-full px-3 pb-24 pt-4 md:px-5 md:pb-6 md:pt-5 lg:px-6">
          <div className="absolute right-2 top-2 z-30 flex items-center gap-2 md:hidden">
            <select
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
              className={clsx(
                'rounded-lg border px-2 py-1.5 text-xs backdrop-blur-md outline-none',
                isDark
                  ? 'border-zinc-700 bg-zinc-900/70 text-zinc-200'
                  : 'border-slate-200 bg-white/80 text-slate-700',
              )}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleLocale}
              className={clsx(
                'rounded-lg border px-2 py-1.5 text-xs font-semibold backdrop-blur-md',
                isDark
                  ? 'border-zinc-700 bg-zinc-900/70 text-zinc-200'
                  : 'border-slate-200 bg-white/80 text-slate-700',
              )}
            >
              {locale === 'en' ? '中文' : 'EN'}
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className={clsx(
                'rounded-lg border px-2 py-1.5 text-xs backdrop-blur-md',
                isDark
                  ? 'border-zinc-700 bg-zinc-900/70 text-zinc-200'
                  : 'border-slate-200 bg-white/80 text-slate-700',
              )}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          {children}
        </div>
      </main>

      <nav className={clsx('safe-bottom fixed inset-x-0 bottom-0 z-50 border-t md:hidden', bottomNavBg)}>
        <div className="grid h-16 grid-cols-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 transition-colors active:scale-95',
                  isActive ? 'text-emerald-500' : isDark ? 'text-zinc-600' : 'text-slate-400',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">{t(item.shortKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
