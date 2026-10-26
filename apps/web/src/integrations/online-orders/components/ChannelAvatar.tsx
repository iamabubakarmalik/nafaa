/**
 * Sales-channel mark: the platform emoji on a soft tint of the platform's own
 * brand colour (WooCommerce purple, Daraz orange…). The colour comes from
 * lib/labels PLATFORM, so it is data rather than a theme value.
 */

export function ChannelAvatar({ emoji, color, size = 40 }: { emoji: string; color: string; size?: number }) {
  const rem = size / 16;
  return (
    <span
      style={{ width: `${rem}rem`, height: `${rem}rem`, backgroundColor: `${color}1a`, fontSize: `${rem / 2}rem` }}
      className="inline-flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-slate-900/5"
      aria-hidden
    >
      {emoji}
    </span>
  );
}
