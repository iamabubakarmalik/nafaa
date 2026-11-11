import type { ComponentType, CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import type { AdminWorkspace } from '../navigation/nav-config';

type IconType = ComponentType<{ className?: string; style?: CSSProperties }>;

/** Colored tile with the workspace icon (sidebar, rail, switcher and search). */
export function WorkspaceMark({ workspace, size = 'md', className }: { workspace: AdminWorkspace; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = workspace.icon as IconType;
  const box = size === 'sm' ? 'h-7 w-7 rounded-md' : size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-9 w-9 rounded-xl';
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-[1.125rem] w-[1.125rem]';
  return (
    <span className={cn('flex shrink-0 items-center justify-center shadow-sm', box, workspace.tone, className)} aria-hidden>
      <Icon className={icon} />
    </span>
  );
}
