/** Pill tab look shared by button tabs (Tabs) and link tabs on server pages. */
import { cn } from './cn';

export const tabClass = (active: boolean) =>
  cn('whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition', active ? 'bg-brand-600 text-white shadow-brand' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50');
