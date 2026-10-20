/**
 * Runs in <head> before the first paint, so a stored theme choice never
 * flashes. It sets <html data-theme> for a manual choice (no attribute means
 * "follow the device"), puts `theme-ink` on <html> while the resolved theme is
 * dark (see theme.css), follows device changes while on "system", and exposes
 * window.__nafaaTheme for the toggle. About 700 bytes; no external file.
 */
export const THEME_STORAGE_KEY = 'nafaa_theme';

const script = `(function(){try{var d=document.documentElement,k='${THEME_STORAGE_KEY}',m=window.matchMedia('(prefers-color-scheme: dark)');function g(){try{var v=localStorage.getItem(k);return v==='light'||v==='dark'?v:'system'}catch(e){return'system'}}function a(p){var x=p==='dark'||(p==='system'&&m.matches);if(p==='system')d.removeAttribute('data-theme');else d.setAttribute('data-theme',p);d.classList.toggle('theme-ink',x)}window.__nafaaTheme={get:g,set:function(p){try{p==='system'?localStorage.removeItem(k):localStorage.setItem(k,p)}catch(e){}a(p);window.dispatchEvent(new Event('nafaa:theme'))},dark:function(){return d.classList.contains('theme-ink')}};a(g());m.addEventListener('change',function(){if(g()==='system')a('system')})}catch(e){}})();`;

export function ThemeScript() {
  return <script id="nafaa-theme" dangerouslySetInnerHTML={{ __html: script }} />;
}
