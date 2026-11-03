/**
 * App-wide events that do not belong to one screen: the subscription ran out
 * (API 402), the session ended, the connection changed.
 */

type Events = {
  'subscription:required': { message?: string };
  'session:expired': undefined;
  'shop:changed': undefined;
  'network:changed': { online: boolean };
};

type Handler<K extends keyof Events> = (payload: Events[K]) => void;
const handlers = new Map<keyof Events, Set<Handler<never>>>();

export function on<K extends keyof Events>(event: K, handler: Handler<K>): () => void {
  let set = handlers.get(event);
  if (!set) handlers.set(event, (set = new Set()));
  set.add(handler as Handler<never>);
  return () => set!.delete(handler as Handler<never>);
}

export function emit<K extends keyof Events>(event: K, payload: Events[K]): void {
  handlers.get(event)?.forEach((h) => (h as Handler<K>)(payload));
}
