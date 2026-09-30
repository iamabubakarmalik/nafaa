import { create } from 'zustand';
import type { BleApi, BleCharacteristic, BleDevice, SerialApi, SerialPortLike, UsbApi, UsbDevice } from './webDevices';
import { useHardwareSettings, type Transport } from './settings';

/* ═════════════════════════════════════════════════════════════
   DEVICES — printer aur tarazu se seedha baat (browser se, bina
   kisi driver ya software ke). Chrome / Edge me:
     • USB     — WebUSB (printer class 7 / vendor)
     • Serial  — Web Serial (COM port, USB-serial, Bluetooth COM)
     • Bluetooth — BLE wale chhote 58mm printer
   Ek dafa "jorein" dabane ke baad browser ijazat yaad rakhta hai;
   agli dafa safha khulte hi khud jur jata hai.
   ═════════════════════════════════════════════════════════════ */

const nav = () => navigator as unknown as { usb?: UsbApi; serial?: SerialApi; bluetooth?: BleApi };

type Conn = { kind: Transport; label: string; write: (b: Uint8Array) => Promise<void>; close: () => Promise<void> };

export const useDeviceStatus = create<{
  printer: { ready: boolean; label: string; error?: string };
  scale: { ready: boolean; label: string; weightKg: number | null; stable: boolean; raw: string; error?: string };
}>(() => ({
  printer: { ready: false, label: '' },
  scale: { ready: false, label: '', weightKg: null, stable: false, raw: '' },
}));

const setPrinter = (p: Partial<ReturnType<typeof useDeviceStatus.getState>['printer']>) =>
  useDeviceStatus.setState((s) => ({ printer: { ...s.printer, ...p } }));
const setScale = (p: Partial<ReturnType<typeof useDeviceStatus.getState>['scale']>) =>
  useDeviceStatus.setState((s) => ({ scale: { ...s.scale, ...p } }));

const hex = (n?: number) => (n ?? 0).toString(16).padStart(4, '0');
const serialLabel = (p: SerialPortLike) => { const i = p.getInfo(); return `serial:${hex(i.usbVendorId)}:${hex(i.usbProductId)}`; };
const usbLabel = (d: UsbDevice) => `usb:${hex(d.vendorId)}:${hex(d.productId)}`;
export const prettyLabel = (l: string) =>
  !l ? '' : l.startsWith('ble:') ? `Bluetooth — ${l.slice(4)}` : l.startsWith('usb:') ? `USB (${l.slice(4)})` : `Serial / COM (${l.slice(7)})`;

/* ─────────────────────────── USB ─────────────────────────── */

async function openUsb(d: UsbDevice): Promise<Conn> {
  if (!d.opened) await d.open();
  if (!d.configuration) await d.selectConfiguration(1);
  const ifaces = d.configuration?.interfaces ?? [];
  // Pehle printer class (7), warna koi bhi jis me bulk OUT ho
  const pick = [...ifaces].sort((a, b) => Number(b.alternate.interfaceClass === 7) - Number(a.alternate.interfaceClass === 7))
    .find((i) => i.alternate.endpoints.some((e) => e.direction === 'out' && e.type === 'bulk'));
  if (!pick) throw new Error('Is USB device me printer wala rasta nahi mila');
  const ep = pick.alternate.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk')!.endpointNumber;
  try { if (!pick.claimed) await d.claimInterface(pick.interfaceNumber); } catch {
    throw new Error('Printer Windows ke driver ke qabze me hai — "Serial" chunein, ya Browser print hi rakhein (madad neeche)');
  }
  const label = usbLabel(d);
  return {
    kind: 'usb', label,
    write: async (b) => { for (let i = 0; i < b.length; i += 4096) await d.transferOut(ep, b.slice(i, i + 4096)); },
    close: () => d.close(),
  };
}

/* ────────────────────────── SERIAL ───────────────────────── */

async function openSerial(p: SerialPortLike, baud: number): Promise<Conn> {
  if (!p.writable) await p.open({ baudRate: baud });
  return {
    kind: 'serial', label: serialLabel(p),
    write: async (b) => {
      const w = p.writable!.getWriter();
      try { await w.write(b); } finally { w.releaseLock(); }
    },
    close: () => p.close(),
  };
}

/* ───────────────────────── BLUETOOTH ─────────────────────── */

// Chhote Chinese BLE printers (Goojprt, MTP, Xprinter mini…) ke aam services
const BLE_SERVICES: Array<string | number> = [
  0x18f0, 0xff00, 0xffe0, 0xfee7, 0xae30,
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

async function openBle(dev: BleDevice): Promise<Conn> {
  const server = await dev.gatt!.connect();
  let ch: BleCharacteristic | undefined;
  for (const s of await server.getPrimaryServices()) {
    ch = (await s.getCharacteristics()).find((c) => c.properties.writeWithoutResponse || c.properties.write);
    if (ch) break;
  }
  if (!ch) { server.disconnect(); throw new Error('Is Bluetooth device me likhne ka rasta nahi mila'); }
  const c = ch;
  return {
    kind: 'bluetooth', label: `ble:${dev.name ?? 'printer'}`,
    write: async (b) => {
      // BLE ek waqt me thora hi leta hai — tukron me, thora ruk ruk kar
      for (let i = 0; i < b.length; i += 180) {
        const part = b.slice(i, i + 180);
        if (c.properties.writeWithoutResponse && c.writeValueWithoutResponse) await c.writeValueWithoutResponse(part);
        else await c.writeValue(part);
        await new Promise((r) => setTimeout(r, 20));
      }
    },
    close: async () => server.disconnect(),
  };
}

/* ────────────────────────── PRINTER ──────────────────────── */

let printer: Conn | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** Browser ki list khol kar printer chunein (button click se hi chalta hai) */
export async function pairPrinter(kind: Transport): Promise<string> {
  const s = useHardwareSettings.getState();
  await disconnectPrinter();
  let conn: Conn;
  if (kind === 'usb') {
    if (!nav().usb) throw new Error('Ye browser USB nahi chalata — Chrome ya Edge kholein');
    conn = await openUsb(await nav().usb!.requestDevice({ filters: [] }));
  } else if (kind === 'serial') {
    if (!nav().serial) throw new Error('Ye browser Serial nahi chalata — Chrome ya Edge (computer) kholein');
    conn = await openSerial(await nav().serial!.requestPort(), s.printerBaud);
  } else {
    if (!nav().bluetooth) throw new Error('Ye browser Bluetooth nahi chalata — Chrome kholein');
    conn = await openBle(await nav().bluetooth!.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES }));
  }
  printer = conn;
  s.set({ transport: kind, printerLabel: conn.label });
  setPrinter({ ready: true, label: conn.label, error: undefined });
  return conn.label;
}

/** Pehle se ijazat wala printer khud jor lo (safha khulte hi) — koi popup nahi */
export async function reconnectPrinter(): Promise<boolean> {
  if (printer) return true;
  const s = useHardwareSettings.getState();
  if (s.printMode !== 'direct' || !s.printerLabel) return false;
  try {
    if (s.printerLabel.startsWith('usb:') && nav().usb) {
      const d = (await nav().usb!.getDevices()).find((x) => usbLabel(x) === s.printerLabel);
      if (d) printer = await openUsb(d);
    } else if (s.printerLabel.startsWith('serial:') && nav().serial) {
      // Agar tarazu aur printer ek hi chip ke hon to jo port tarazu ne liya wo chhor do
      const p = (await nav().serial!.getPorts()).find((x) => serialLabel(x) === s.printerLabel && x !== scalePort);
      if (p) printer = await openSerial(p, s.printerBaud);
    } else if (s.printerLabel.startsWith('ble:') && nav().bluetooth?.getDevices) {
      const d = (await nav().bluetooth!.getDevices!()).find((x) => `ble:${x.name ?? 'printer'}` === s.printerLabel);
      if (d) printer = await openBle(d);
    }
  } catch (e) {
    setPrinter({ ready: false, error: (e as Error).message });
    return false;
  }
  setPrinter({ ready: !!printer, label: s.printerLabel, error: printer ? undefined : 'Printer nahi mila — cable / power check karein' });
  return !!printer;
}

export async function disconnectPrinter() {
  const p = printer; printer = null;
  setPrinter({ ready: false });
  try { await p?.close(); } catch { /* pehle hi band */ }
}

export const printerReady = () => !!printer;

/** Bytes printer ko — ek ke baad ek (do bill aapas me na milein) */
export function sendToPrinter(bytes: Uint8Array): Promise<void> {
  const job = queue.then(async () => {
    if (!printer && !(await reconnectPrinter())) throw new Error('Printer jura hua nahi');
    try { await printer!.write(bytes); } catch (e) {
      // Cable nikal gayi / printer band — ek dafa dobara jor kar koshish
      await disconnectPrinter();
      if (!(await reconnectPrinter())) throw e;
      await printer!.write(bytes);
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

/* ─────────────────────────── SCALE ───────────────────────── */

let scalePort: SerialPortLike | null = null;
let scaleStop: (() => void) | null = null;

/**
 * Tarazu ki ek line padho. Aam formats:
 *   "ST,GS,+  1.250kg"   (stable)    "US,GS,+  1.2kg" (hil raha)
 *   "  1.250 kg"   "W 1250 g"   "=543.21" (XK3190 — ulte digits)
 */
export function parseScaleLine(line: string): { kg: number; stable: boolean } | null {
  const t = line.trim();
  if (!t) return null;
  if (/^=/.test(t)) {
    const n = Number(t.slice(1).split('').reverse().join(''));
    return Number.isFinite(n) ? { kg: Math.round(n * 1000) / 1000, stable: true } : null;
  }
  const m = t.match(/([-+]?\s*\d+(?:\.\d+)?)\s*(kg|g|lb)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/\s/g, ''));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] ?? 'kg').toLowerCase();
  if (unit === 'g') n /= 1000;
  if (unit === 'lb') n *= 0.45359237;
  return { kg: Math.round(n * 1000) / 1000, stable: !/\bUS\b|unstable|motion/i.test(t) };
}

async function readScale(p: SerialPortLike) {
  let alive = true;
  let lastData = Date.now();
  const reader = p.readable!.getReader();
  scaleStop = () => { alive = false; reader.cancel().catch(() => undefined); };
  // Kuch tarazu khud nahi bhejte — poochna parta hai ("W" / "P")
  const poll = setInterval(async () => {
    if (Date.now() - lastData < 1500 || !p.writable) return;
    const w = p.writable.getWriter();
    try { await w.write(new TextEncoder().encode('W\r\n')); } catch { /* */ } finally { w.releaseLock(); }
  }, 1000);
  let buf = '';
  const dec = new TextDecoder();
  try {
    while (alive) {
      const { value, done } = await reader.read();
      if (done) break;
      lastData = Date.now();
      buf += dec.decode(value, { stream: true });
      const parts = buf.split(/[\r\n\x02\x03]+/);
      buf = parts.pop() ?? '';
      if (buf.length > 200) buf = '';
      for (const line of parts) {
        const r = parseScaleLine(line);
        if (r) setScale({ weightKg: r.kg, stable: r.stable, raw: line.trim().slice(0, 40), error: undefined });
      }
    }
  } catch (e) {
    if (alive) setScale({ ready: false, error: `Tarazu se rabta toot gaya: ${(e as Error).message}` });
  } finally {
    clearInterval(poll);
    reader.releaseLock();
  }
}

async function startScale(p: SerialPortLike) {
  const s = useHardwareSettings.getState();
  if (!p.readable) await p.open({ baudRate: s.scaleBaud });
  scalePort = p;
  setScale({ ready: true, label: serialLabel(p), error: undefined });
  void readScale(p);
}

export async function pairScale(): Promise<string> {
  if (!nav().serial) throw new Error('Ye browser Serial nahi chalata — Chrome ya Edge (computer) kholein');
  await disconnectScale();
  const p = await nav().serial!.requestPort();
  await startScale(p);
  useHardwareSettings.getState().set({ scaleEnabled: true, scaleLabel: serialLabel(p) });
  return serialLabel(p);
}

export async function reconnectScale(): Promise<boolean> {
  if (scalePort) return true;
  const s = useHardwareSettings.getState();
  if (!s.scaleEnabled || !s.scaleLabel || !nav().serial) return false;
  try {
    const p = (await nav().serial!.getPorts()).find((x) => serialLabel(x) === s.scaleLabel && !x.writable);
    if (!p) { setScale({ ready: false, error: 'Tarazu nahi mila — cable check karein' }); return false; }
    await startScale(p);
    return true;
  } catch (e) {
    setScale({ ready: false, error: (e as Error).message });
    return false;
  }
}

export async function disconnectScale() {
  scaleStop?.(); scaleStop = null;
  const p = scalePort; scalePort = null;
  setScale({ ready: false, weightKg: null, stable: false });
  await new Promise((r) => setTimeout(r, 50));
  try { await p?.close(); } catch { /* */ }
}
