/* WebUSB / Web Serial / Web Bluetooth — sirf utni types jitni hum use karte hain
   (poora @types package lagane ki zaroorat nahi). Chrome / Edge me milte hain. */
export interface UsbEndpoint { endpointNumber: number; direction: 'in' | 'out'; type: 'bulk' | 'interrupt' | 'isochronous' }
export interface UsbAlternate { interfaceClass: number; endpoints: UsbEndpoint[] }
export interface UsbInterface { interfaceNumber: number; alternate: UsbAlternate; claimed: boolean }
export interface UsbDevice {
  vendorId: number; productId: number; productName?: string; manufacturerName?: string; opened: boolean;
  configuration: { interfaces: UsbInterface[] } | null;
  open(): Promise<void>; close(): Promise<void>; selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferOut(ep: number, data: BufferSource): Promise<{ status: string }>;
}
export interface UsbApi {
  requestDevice(o: { filters: Array<{ classCode?: number; vendorId?: number }> }): Promise<UsbDevice>;
  getDevices(): Promise<UsbDevice[]>;
}

export interface SerialPortLike {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(o: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}
export interface SerialApi {
  requestPort(o?: { filters?: unknown[] }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

export interface BleCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithoutResponse?(v: BufferSource): Promise<void>;
  writeValue(v: BufferSource): Promise<void>;
}
export interface BleService { getCharacteristics(): Promise<BleCharacteristic[]> }
export interface BleServer { connected: boolean; connect(): Promise<BleServer>; disconnect(): void; getPrimaryServices(): Promise<BleService[]> }
export interface BleDevice { name?: string; gatt?: BleServer }
export interface BleApi {
  requestDevice(o: { acceptAllDevices?: boolean; filters?: unknown[]; optionalServices?: Array<string | number> }): Promise<BleDevice>;
  getDevices?(): Promise<BleDevice[]>;
}
