import { useLocaleStore } from '@/store/locale.store';
import en from './messages/en.json';
import ur from './messages/ur.json';

const messages = { en, ur };

function getNested(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function useTranslation() {
  const { locale } = useLocaleStore();

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let val = getNested(messages[locale], key);
    if (typeof val !== 'string') val = getNested(messages.en, key) ?? key;
    if (vars && typeof val === 'string') {
      Object.entries(vars).forEach(([k, v]) => {
        val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return val ?? key;
  };

  return { t, locale };
}
