/**
 * Server-side syntax highlighting for the `codeSample` block and fenced
 * code in rich text. Zero client JS: the output is plain spans with token
 * classes, coloured by blocks.module.css in both themes.
 *
 * It covers the seven contract languages (bash, http, json, js, ts, python,
 * php) with a small ordered rule list per language. It colours comments,
 * strings, numbers, keywords, names and punctuation; it is not a full
 * grammar, and unknown text stays plain.
 */

export type TokenClass = 'c' | 's' | 'n' | 'k' | 'f' | 'p' | 'v' | 'o' | 't';
export interface Token {
  cls: TokenClass | null;
  text: string;
}

type Rule = [TokenClass | null, RegExp];

const JS_KEYWORDS =
  'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|try|catch|finally|throw|class|extends|import|from|export|default|async|await|of|in|typeof|instanceof|this|yield|delete|void';
const TS_KEYWORDS = `${JS_KEYWORDS}|interface|type|enum|implements|declare|readonly|public|private|protected|as|satisfies|keyof|namespace`;
const PY_KEYWORDS =
  'def|return|if|elif|else|for|while|in|not|and|or|is|import|from|as|class|try|except|finally|raise|with|lambda|pass|break|continue|yield|async|await|global|nonlocal|del|assert';
const PHP_KEYWORDS =
  'function|return|if|else|elseif|foreach|for|while|as|new|class|public|private|protected|static|use|namespace|echo|try|catch|throw|array|fn|match|require|require_once|include';

const STRING_DQ = /"(?:[^"\\\n]|\\.)*"/y;
const STRING_SQ = /'(?:[^'\\\n]|\\.)*'/y;
const NUMBER = /\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/y;
const PUNCT = /[{}[\]();,.:?]+/y;
const OPERATOR = /(?:=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|[=+\-*/%<>!&|^~])/y;
const SPACE = /\s+/y;
const WORDS = /[A-Za-z_$][\w$]*/y;

const word = (list: string) => new RegExp(`\\b(?:${list})\\b`, 'y');
const call = /[A-Za-z_$][\w$]*(?=\s*\()/y;

const RULES: Record<string, Rule[]> = {
  js: [
    ['c', /\/\/[^\n]*/y],
    ['c', /\/\*[\s\S]*?\*\//y],
    ['s', /`(?:[^`\\]|\\.)*`/y],
    ['s', STRING_DQ],
    ['s', STRING_SQ],
    ['k', word(JS_KEYWORDS)],
    ['n', word('true|false|null|undefined|NaN')],
    ['n', NUMBER],
    ['f', call],
    ['t', /\b[A-Z][\w$]*/y],
    [null, WORDS],
    ['o', OPERATOR],
    ['o', PUNCT],
  ],
  ts: [],
  json: [
    ['p', /"(?:[^"\\\n]|\\.)*"(?=\s*:)/y],
    ['s', STRING_DQ],
    ['n', word('true|false|null')],
    ['n', /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
    ['o', PUNCT],
  ],
  bash: [
    ['c', /(?<![^\s])#[^\n]*/y],
    ['s', STRING_DQ],
    ['s', STRING_SQ],
    ['v', /\$\{[^}\n]*\}|\$[A-Za-z_][\w]*/y],
    ['p', /(?<![\w-])--?[A-Za-z][\w-]*/y],
    ['f', /(?<=^|\n|\|\s?|&&\s?|;\s?)[A-Za-z_][\w.-]*/y],
    [null, /[A-Za-z_][\w.-]*/y],
    ['o', /[|&;><\\]+/y],
  ],
  http: [
    ['k', /(?<=^|\n)(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/y],
    ['n', /HTTP\/\d(?:\.\d)?/y],
    ['n', /(?<=HTTP\/\d(?:\.\d)? )\d{3}\b/y],
    ['p', /(?<=^|\n)[A-Za-z][\w-]*(?=:)/y],
    ['p', /"(?:[^"\\\n]|\\.)*"(?=\s*:)/y],
    ['s', STRING_DQ],
    ['n', word('true|false|null')],
    ['n', NUMBER],
    [null, WORDS],
    ['o', PUNCT],
  ],
  python: [
    ['c', /#[^\n]*/y],
    ['s', /(?:"""[\s\S]*?"""|'''[\s\S]*?''')/y],
    ['s', /[fFrRbB]?"(?:[^"\\\n]|\\.)*"/y],
    ['s', /[fFrRbB]?'(?:[^'\\\n]|\\.)*'/y],
    ['t', /@[A-Za-z_][\w.]*/y],
    ['k', word(PY_KEYWORDS)],
    ['n', word('True|False|None')],
    ['n', NUMBER],
    ['f', call],
    [null, WORDS],
    ['o', OPERATOR],
    ['o', PUNCT],
  ],
  php: [
    ['k', /<\?php|\?>/y],
    ['c', /(?:\/\/|#)[^\n]*/y],
    ['c', /\/\*[\s\S]*?\*\//y],
    ['s', STRING_DQ],
    ['s', STRING_SQ],
    ['v', /\$[A-Za-z_][\w]*/y],
    ['k', word(PHP_KEYWORDS)],
    ['n', word('true|false|null|TRUE|FALSE|NULL')],
    ['n', NUMBER],
    ['f', call],
    [null, WORDS],
    ['o', /->|=>|::/y],
    ['o', OPERATOR],
    ['o', PUNCT],
  ],
};

RULES.ts = (RULES.js as Rule[]).map(([cls, re]): Rule => (cls === 'k' ? ['k', word(TS_KEYWORDS)] : [cls, re]));

const ALIASES: Record<string, string> = {
  javascript: 'js',
  jsx: 'js',
  mjs: 'js',
  typescript: 'ts',
  tsx: 'ts',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  curl: 'bash',
  py: 'python',
};

export function normalizeLanguage(lang: string | null | undefined): string | null {
  if (!lang) return null;
  const key = lang.toLowerCase();
  const resolved = ALIASES[key] ?? key;
  return resolved in RULES ? resolved : null;
}

/** Tokens for one code string. Unknown languages come back as one plain token. */
export function highlight(code: string, lang: string | null | undefined): Token[] {
  const language = normalizeLanguage(lang);
  const rules = language ? RULES[language] : undefined;
  if (!rules) return [{ cls: null, text: code }];

  const out: Token[] = [];
  const push = (cls: TokenClass | null, text: string) => {
    const last = out[out.length - 1];
    if (last && last.cls === cls) last.text += text;
    else out.push({ cls, text });
  };

  let i = 0;
  outer: while (i < code.length) {
    SPACE.lastIndex = i;
    const space = SPACE.exec(code);
    if (space) {
      push(null, space[0]);
      i += space[0].length;
      continue;
    }
    for (const [cls, re] of rules) {
      re.lastIndex = i;
      const match = re.exec(code);
      if (match && match[0].length > 0) {
        push(cls, match[0]);
        i += match[0].length;
        continue outer;
      }
    }
    push(null, code[i] as string);
    i++;
  }
  return out;
}
