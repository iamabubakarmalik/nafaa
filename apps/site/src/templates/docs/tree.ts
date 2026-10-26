/**
 * Docs tree. DOC paths nest under /developers by their parent chain
 * (/developers/webhooks/verify), and help center PAGEs nest under /help the
 * same way, so the tree is rebuilt from the published cards' paths in the
 * API's `order` sort. The flattened order drives the previous/next links.
 */
import { DOC_ROOT_PATH, type EntryCard } from '@/lib/cms/contract/cms-contract';

export interface DocNode {
  card: EntryCard;
  children: DocNode[];
}

export function buildDocTree(cards: readonly EntryCard[], rootPath: string = DOC_ROOT_PATH): DocNode[] {
  const byPath = new Map<string, DocNode>();
  for (const card of cards) byPath.set(card.path, { card, children: [] });
  const roots: DocNode[] = [];
  for (const card of cards) {
    if (card.path === rootPath) continue;
    const node = byPath.get(card.path)!;
    const parentPath = card.path.split('/').slice(0, -1).join('/');
    const parent = parentPath !== rootPath ? byPath.get(parentPath) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

export function flattenDocs(nodes: readonly DocNode[], rootCard?: EntryCard): EntryCard[] {
  const out: EntryCard[] = rootCard ? [rootCard] : [];
  const walk = (list: readonly DocNode[]) => {
    for (const node of list) {
      out.push(node.card);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/** True when `path` is the node or inside it (keeps the current branch open). */
export function containsPath(node: DocNode, path: string): boolean {
  return node.card.path === path || node.children.some((child) => containsPath(child, path));
}
