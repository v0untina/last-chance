import { useMemo } from "react";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightCode(code: string, lang?: string): string {
  const escaped = escapeHtml(code);
  if (!lang) return escaped;
  const keywords: Record<string, string[]> = {
    js: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "new", "this", "null", "undefined", "true", "false", "try", "catch", "throw", "switch", "case", "break", "default", "typeof", "instanceof", "in", "of", "map", "filter", "reduce", "forEach", "push", "pop", "shift", "unshift", "length"],
    javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "new", "this", "null", "undefined", "true", "false", "try", "catch", "throw", "switch", "case", "break", "default", "typeof", "instanceof"],
    python: ["def", "return", "if", "elif", "else", "for", "while", "in", "import", "from", "class", "try", "except", "finally", "with", "as", "pass", "None", "True", "False", "and", "or", "not", "is", "lambda", "yield", "async", "await", "self", "range", "len", "print"],
    java: ["public", "private", "protected", "class", "static", "void", "int", "long", "double", "boolean", "String", "return", "if", "else", "for", "while", "new", "this", "null", "true", "false", "try", "catch", "finally", "throw", "import", "package", "extends", "implements", "interface", "abstract", "final", "enum"],
    cpp: ["int", "long", "double", "float", "char", "bool", "void", "auto", "const", "static", "class", "struct", "enum", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return", "new", "delete", "this", "nullptr", "true", "false", "public", "private", "protected", "virtual", "override", "template", "typename", "namespace", "using", "include", "std", "vector", "map", "set", "string", "size_t"],
    go: ["func", "return", "if", "else", "for", "range", "switch", "case", "break", "continue", "go", "defer", "select", "chan", "map", "struct", "interface", "type", "package", "import", "var", "const", "nil", "true", "false", "make", "append", "len", "cap", "error", "string", "int", "bool", "byte", "rune", "float64"],
  };
  const kw = keywords[lang] ?? [];
  const kwSet = new Set(kw);
  return escaped.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (match) => {
    if (kwSet.has(match)) return `<span class="text-[#c678dd]">${match}</span>`;
    return match;
  });
}

function renderLine(line: string): string {
  let html = escapeHtml(line);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-bg-elev text-accent px-1 py-0.5 rounded text-[0.9em] font-mono">$1</code>');
  return html;
}

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let key = 0;

  const flushCode = () => {
    if (codeLines.length > 0) {
      const code = codeLines.join("\n");
      const highlighted = highlightCode(code, codeLang);
      nodes.push(
        <div key={key++} className="relative group">
          {codeLang && (
            <div className="absolute top-0 right-0 px-2 py-0.5 text-[10px] text-fg-subtle bg-bg-elev rounded-bl-lg rounded-tr-lg border-l border-b border-border font-mono">
              {codeLang}
            </div>
          )}
          <pre className="bg-bg-elev border border-border rounded-lg p-3 overflow-x-auto text-xs leading-relaxed font-mono mt-1 mb-2">
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        </div>
      );
      codeLines = [];
      codeLang = "";
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushCode();
        inCodeBlock = true;
        codeLang = line.slice(3).trim().toLowerCase();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (trimmed === "") {
      if (i > 0 && nodes.length > 0) {
        const last = nodes[nodes.length - 1];
        if (typeof last === "object" && "type" in (last as any) && (last as any).type !== "br") {
          nodes.push(<br key={key++} />);
        }
      }
      continue;
    }

    if (/^#{1,3}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#{1,3})/)?.[1].length ?? 1;
      const title = renderLine(trimmed.replace(/^#+\s*/, ""));
      const Tag = level === 1 ? "h4" : level === 2 ? "h5" : "h6";
      nodes.push(
        <Tag key={key++} className="font-semibold mt-3 mb-1 text-sm">
          <span dangerouslySetInnerHTML={{ __html: title }} />
        </Tag>
      );
      continue;
    }

    if (/^[-*]\s/.test(trimmed)) {
      const text = renderLine(trimmed.replace(/^[-*]\s*/, ""));
      nodes.push(
        <li key={key++} className="flex items-start gap-1.5 text-sm ml-1">
          <span className="text-accent mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: text }} />
        </li>
      );
      continue;
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      const text = renderLine(trimmed.replace(/^\d+[.)]\s*/, ""));
      nodes.push(
        <li key={key++} className="flex items-start gap-1.5 text-sm ml-1">
          <span className="text-accent font-mono text-xs mt-0.5 shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: text }} />
        </li>
      );
      continue;
    }

    const rendered = renderLine(line);
    nodes.push(
      <p key={key++} className="text-sm leading-relaxed">
        <span dangerouslySetInnerHTML={{ __html: rendered }} />
      </p>
    );
  }

  if (inCodeBlock) flushCode();

  return nodes;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const nodes = useMemo(() => parseMarkdown(text), [text]);
  return <div className={`space-y-1 ${className}`}>{nodes}</div>;
}
