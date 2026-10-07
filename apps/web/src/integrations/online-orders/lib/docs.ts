/** Online store ki public guide (bina login) — har setting / step isi ke kisi hisse se jurta hai */
export const DOCS_PATH = '/docs/online-store';

export const docsUrl = (anchor?: string) => `${DOCS_PATH}${anchor ? `#${anchor}` : ''}`;
