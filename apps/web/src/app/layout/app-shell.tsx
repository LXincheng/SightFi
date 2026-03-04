import {
  Activity,
  Briefcase,
  LayoutDashboard,
  Moon,
  Newspaper,
  Settings,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { clsx } from 'clsx';
import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CURRENCY_OPTIONS } from '../../shared/constants/currency.constants';
import type { CurrencyCode } from '../../shared/constants/currency.constants';
import { formatDateTimeWithZone } from '../../shared/i18n/format';
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
    ? 'bg-slate-950 text-slate-100'
    : 'bg-slate-100/75 text-slate-900';

  const sidebarBg = isDark
    ? 'bg-slate-950/70 border-slate-800/75 backdrop-blur-xl'
    : 'bg-white/72 border-slate-200/85 backdrop-blur-xl';

  const navActiveClass = isDark
    ? 'bg-cyan-500/12 text-cyan-300 border border-cyan-500/25'
    : 'bg-cyan-50/85 text-cyan-700 border border-cyan-200/80';

  const navInactiveClass = isDark
    ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
    : 'text-slate-500 hover:text-slate-800 hover:bg-white/70 border border-transparent';

  const bottomNavBg = isDark
    ? 'bg-slate-950/88 border-slate-800/80 backdrop-blur-xl'
    : 'bg-white/90 border-slate-200/90 backdrop-blur-xl';

  const statusBg = isDark
    ? 'bg-slate-900/55 border-slate-800'
    : 'bg-white/75 border-slate-200/80';

  return (
    <div
      className={clsx(
        'flex h-screen w-full overflow-hidden font-sans antialiased selection:bg-emerald-500/25',
        rootBg,
      )}
    >
      <aside className={clsx('hidden w-64 shrink-0 border-r p-5 md:flex md:flex-col', sidebarBg)}>
        <div className="mb-7 mt-1 flex items-center gap-3 px-1">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2">
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>
          <h1 className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
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
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-base transition-all duration-200 hover:-translate-y-[1px]',
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
          <div className={clsx('rounded-xl border p-3', statusBg)}>
            <div className="flex items-center justify-between">
              <span className={clsx('text-xs', isDark ? 'text-zinc-400' : 'text-slate-500')}>{t('shell.dataSource')}</span>
              <span className="text-xs font-medium text-cyan-500">{t('shell.bffGateway')}</span>
            </div>
            <div className={clsx('mt-2 flex items-center gap-1.5 text-xs', isDark ? 'text-zinc-300' : 'text-slate-700')}>
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
              {t('shell.zeroClientKey')}
            </div>
            <div className={clsx('mt-1.5 text-xs', isDark ? 'text-zinc-500' : 'text-slate-500')}>
              {t('shell.lastSync')}: {formatDateTimeWithZone(new Date().toISOString(), locale, { withYear: false })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
              className={clsx(
                'rounded-xl border px-2 py-2 text-sm outline-none transition-all',
                isDark
                  ? 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-600'
                  : 'border-slate-200 bg-white/82 text-slate-700 hover:border-slate-300',
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
                  ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                  : 'border-slate-200 bg-white/82 text-slate-600 hover:border-slate-300',
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
                  ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                  : 'border-slate-200 bg-white/82 text-slate-600 hover:border-slate-300',
              )}
            >
              {t('app.switchLanguage')}
            </button>
          </div>

        </div>
      </aside>

      <main className="relative flex-1 overflow-y-auto scrollbar-thin">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.08),transparent_56%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.07),transparent_58%)]" />
        <div className="relative z-20 w-full px-3 pb-28 pt-4 md:px-5 md:pb-6 md:pt-5 lg:px-6">
          <div className="absolute right-2 top-2 z-30 flex items-center gap-2 md:hidden">
            <select
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
              className={clsx(
                'rounded-lg border px-2 py-1.5 text-xs backdrop-blur-md outline-none',
                isDark
                  ? 'border-slate-700 bg-slate-900/72 text-slate-200'
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
                  ? 'border-slate-700 bg-slate-900/72 text-slate-200'
                  : 'border-slate-200 bg-white/80 text-slate-700',
              )}
            >
              {t('app.switchLanguage')}
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className={clsx(
                'rounded-lg border px-2 py-1.5 text-xs backdrop-blur-md',
                isDark
                  ? 'border-slate-700 bg-slate-900/72 text-slate-200'
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
        <div className="grid h-14 grid-cols-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 transition-colors active:scale-95',
                  isActive ? 'text-cyan-500' : isDark ? 'text-slate-600' : 'text-slate-400',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium tracking-wide">{t(item.shortKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
