/** Small argv helpers shared by the seed scripts. */

/** Value of `--name=value`, or undefined. */
export function argValue(argv: string[], name: string): string | undefined {
  return argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

/** True for `--name` or `--name=...`. */
export function hasFlag(argv: string[], name: string): boolean {
  return argv.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
}

/** Comma list from `--name=a,b`; `--name` alone gives an empty set with `all` true. */
export function listArg(argv: string[], name: string): { given: boolean; all: boolean; values: Set<string> } {
  const value = argValue(argv, name);
  const given = hasFlag(argv, name);
  const values = new Set((value ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  return { given, all: given && values.size === 0, values };
}

export function apiArg(argv: string[]): string {
  return (argValue(argv, 'api') ?? process.env.CMS_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
}
