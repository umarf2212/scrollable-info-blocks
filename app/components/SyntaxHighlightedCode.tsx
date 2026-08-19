import type { CSSProperties, ReactNode } from "react";

type TokenKind =
  | "plain"
  | "keyword"
  | "builtin"
  | "literal"
  | "number"
  | "string"
  | "comment"
  | "operator";

interface Token {
  kind: TokenKind;
  value: string;
}

const PYTHON_KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "class", "continue",
  "def", "del", "elif", "else", "except", "finally", "for", "from",
  "global", "if", "import", "in", "is", "lambda", "nonlocal", "not",
  "or", "pass", "raise", "return", "try", "while", "with", "yield",
]);

const PYTHON_BUILTINS = new Set([
  "abs", "all", "any", "bool", "dict", "enumerate", "filter", "float",
  "int", "len", "list", "map", "max", "min", "print", "range", "reversed",
  "set", "sorted", "str", "sum", "tuple", "zip",
]);

const PYTHON_LITERALS = new Set(["True", "False", "None", "NotImplemented", "Ellipsis"]);
const OPERATOR_CHARS = new Set("+-*/%@&|^~<>=!:.,;()[]{}");

function pushToken(tokens: Token[], kind: TokenKind, value: string) {
  if (!value) return;
  const previous = tokens.at(-1);
  if (previous?.kind === kind) previous.value += value;
  else tokens.push({ kind, value });
}

function tokenizePythonLine(line: string, openTriple: string | null) {
  const tokens: Token[] = [];
  let index = 0;
  let triple = openTriple;

  while (index < line.length) {
    if (triple) {
      const closing = line.indexOf(triple, index);
      if (closing === -1) {
        pushToken(tokens, "string", line.slice(index));
        index = line.length;
      } else {
        pushToken(tokens, "string", line.slice(index, closing + 3));
        index = closing + 3;
        triple = null;
      }
      continue;
    }

    const character = line[index];
    if (character === "#") {
      pushToken(tokens, "comment", line.slice(index));
      break;
    }

    const tripleCandidate = line.slice(index, index + 3);
    if (tripleCandidate === "'''" || tripleCandidate === '"""') {
      const closing = line.indexOf(tripleCandidate, index + 3);
      if (closing === -1) {
        pushToken(tokens, "string", line.slice(index));
        triple = tripleCandidate;
        break;
      }
      pushToken(tokens, "string", line.slice(index, closing + 3));
      index = closing + 3;
      continue;
    }

    if (character === "'" || character === '"') {
      const quote = character;
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === "\\") end += 2;
        else if (line[end] === quote) {
          end += 1;
          break;
        } else end += 1;
      }
      pushToken(tokens, "string", line.slice(index, end));
      index = end;
      continue;
    }

    if (/\d/.test(character)) {
      const match = line.slice(index).match(/^(?:0[xob][0-9a-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i);
      const value = match?.[0] ?? character;
      pushToken(tokens, "number", value);
      index += value.length;
      continue;
    }

    if (/[A-Za-z_]/.test(character)) {
      const match = line.slice(index).match(/^[A-Za-z_]\w*/);
      const value = match?.[0] ?? character;
      const kind = PYTHON_KEYWORDS.has(value)
        ? "keyword"
        : PYTHON_BUILTINS.has(value)
          ? "builtin"
          : PYTHON_LITERALS.has(value)
            ? "literal"
            : "plain";
      pushToken(tokens, kind, value);
      index += value.length;
      continue;
    }

    if (OPERATOR_CHARS.has(character)) {
      pushToken(tokens, "operator", character);
      index += 1;
      continue;
    }

    pushToken(tokens, "plain", character);
    index += 1;
  }

  return { tokens, openTriple: triple };
}

function tokenNode(token: Token, index: number): ReactNode {
  if (token.kind === "plain") return token.value;
  return <span className={`syntax-${token.kind}`} key={`${token.kind}-${index}`}>{token.value}</span>;
}

export function SyntaxHighlightedCode({
  language,
  lines,
  startLine = 1,
}: {
  language: string;
  lines: string[];
  startLine?: number;
}) {
  const rendered: ReactNode[] = [];
  let openTriple: string | null = null;

  lines.forEach((line, lineIndex) => {
    const result = language.toLowerCase() === "python"
      ? tokenizePythonLine(line, openTriple)
      : { tokens: [{ kind: "plain" as const, value: line }], openTriple: null };
    openTriple = result.openTriple;
    rendered.push(
      <span className="code-line" key={`line-${lineIndex}`}>
        {result.tokens.length ? result.tokens.map(tokenNode) : " "}
      </span>,
      lineIndex < lines.length - 1 ? "\n" : null,
    );
  });

  return (
    <code
      className={`syntax-code syntax-code--${language.toLowerCase()}`}
      style={{ "--code-line-start": startLine - 1 } as CSSProperties}
    >
      {rendered}
    </code>
  );
}
