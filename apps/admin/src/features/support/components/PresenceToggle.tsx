/** My support status (Online / Away), shown in the Support page header. Shops see the team's state. */

import { useRef, useState } from 'react';
import { Menu, MenuItem, MenuLabel, heroButton } from '@/design-system/components';
import { cn } from '@/lib/cn';
import { emitAck } from '../lib/socket';
import { saveMyState, useSupportLive } from '../lib/live';
import { SUPPORT_EVENTS } from '../lib/support.types';

export function PresenceToggle() {
  const { myState, autoAway, connected, agents } = useSupportLive();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const set = (state: 'online' | 'away') => {
    setOpen(false);
    saveMyState(state);
    useSupportLive.getState().set({ myState: state, autoAway: false });
    void emitAck(SUPPORT_EVENTS.setPresence, { state });
  };
  const online = agents.filter((a) => a.state === 'online').length;
  const label = !connected ? 'Connecting…' : myState === 'online' ? 'Online' : autoAway ? 'Away (idle)' : 'Away';
  return (
    <>
      <button ref={ref} type="button" className={heroButton} onClick={() => setOpen(true)} title="Your support status">
        <span className={cn('h-2.5 w-2.5 rounded-full', !connected ? 'bg-slate-400' : myState === 'online' ? 'bg-emerald-500' : 'bg-amber-500')} />
        {label}
      </button>
      <Menu open={open} onClose={() => setOpen(false)} anchorRef={ref} align="end" width="w-64">
        <MenuLabel>Your status</MenuLabel>
        <MenuItem checked={myState === 'online'} onClick={() => set('online')} hint="gets new chats">Online</MenuItem>
        <MenuItem checked={myState === 'away'} onClick={() => set('away')} hint="no auto-assign">Away</MenuItem>
        <MenuLabel>Team</MenuLabel>
        {agents.length ? agents.map((a) => (
          <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[0.8125rem] text-slate-700">
            <span className={cn('h-2 w-2 rounded-full', a.state === 'online' ? 'bg-emerald-500' : a.state === 'away' ? 'bg-amber-500' : 'bg-slate-300')} />
            <span className="flex-1 truncate">{a.name}</span>
            <span className="text-[0.75rem] text-slate-400">{a.state}</span>
          </div>
        )) : <p className="px-2.5 py-1.5 text-[0.8125rem] text-slate-500">{online} online</p>}
      </Menu>
    </>
  );
}
