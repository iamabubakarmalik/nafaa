import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Search, Sparkles, Moon, Sun, Globe, Bot, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { Avatar, Button } from '@/ui';
import { VoiceSearchButton } from '@/features/voice-search/components/VoiceSearchButton';
import { useEffect, useState } from 'react';
import { marketplaceClient, unwrap } from '@/api/client';
import { toast } from 'sonner';
import { useSocketEvent } from '@/lib/useSocket';

export function TopBar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const customer = useAuthStore((s) => s.customer);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const setTheme = useThemeStore((s) => s.setTheme);
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);

  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isAuth) return;
    marketplaceClient
      .get('/notifications/unread-count')
      .then((r) => setUnread(unwrap<{ count: number }>(r).count))
      .catch(() => {});
  }, [isAuth]);

  useSocketEvent('notification:new', (data: any) => {
    setUnread((n) => n + 1);
    toast(data.title, { description: data.body, icon: '🔔' });
  });

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'ur' : 'en';
    i18n.changeLanguage(next);
  };

  const toggleTheme = () => {
    setTheme(effectiveTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="container mx-auto flex items-center gap-2 py-3">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-10 w-10 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-brand">
            <span className="text-white font-black text-lg">N</span>
          </div>
          <div className="hidden sm:block">
            <div className="font-black text-content leading-none text-base">Nafaa Bazaar</div>
            <div className="text-2xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mt-0.5">
              🇵🇰 Pakistan
            </div>
          </div>
        </NavLink>

        <button
          onClick={() => navigate('/search')}
          className="flex-1 flex items-center gap-3 h-11 px-4 rounded-2xl bg-surface hover:bg-surface-muted border border-border transition text-content-muted text-sm font-medium"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">{t('home.searchPlaceholder')}</span>
        </button>

        {/* AI Assistant */}
        <button
          onClick={() => navigate('/ai-assistant')}
          className="hidden md:flex h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg items-center justify-center hover:scale-105 transition shrink-0"
          aria-label="AI Assistant"
          title="AI Shopping Assistant"
        >
          <Bot className="h-4 w-4" />
        </button>

        {/* Voice search */}
        <VoiceSearchButton className="shrink-0 hidden md:flex" />

        {/* Language */}
        <button
          onClick={toggleLang}
          className="h-11 w-11 rounded-2xl bg-surface hover:bg-surface-muted border border-border flex items-center justify-center transition shrink-0"
        >
          <Globe className="h-4 w-4 text-content-muted" />
        </button>

        {/* Theme */}
        <button
          onClick={toggleTheme}
          className="h-11 w-11 rounded-2xl bg-surface hover:bg-surface-muted border border-border flex items-center justify-center transition shrink-0"
        >
          {effectiveTheme === 'dark' ? (
            <Sun className="h-4 w-4 text-accent-500" />
          ) : (
            <Moon className="h-4 w-4 text-content-muted" />
          )}
        </button>

        {isAuth && (
          <NavLink
            to="/notifications"
            className="relative h-11 w-11 rounded-2xl bg-surface hover:bg-surface-muted border border-border flex items-center justify-center transition shrink-0"
          >
            <Bell className="h-4 w-4 text-content-muted" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-2xs font-bold flex items-center justify-center ring-2 ring-surface animate-pulse-soft">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </NavLink>
        )}

        {isAuth ? (
          <NavLink to="/profile" className="shrink-0">
            <Avatar src={customer?.avatarUrl} name={customer?.fullName} size="md" ring />
          </NavLink>
        ) : (
          <Button
            size="sm"
            variant="gradient"
            onClick={() => navigate('/login')}
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          >
            {t('auth.login')}
          </Button>
        )}
      </div>
    </header>
  );
}
