/**
 * Class for a band below the fold (globals.css `.cv-auto`): the browser skips
 * its rendering until it nears the viewport. A band can set its estimated
 * height in rem with `--cv-h` (phones) and `--cv-h-lg` (lg and up), which
 * sizes the scrollbar before the first render; the real height is remembered
 * after that.
 */
export const BELOW_FOLD = 'cv-auto';
