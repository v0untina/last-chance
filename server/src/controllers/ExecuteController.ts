import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { BadRequestError } from "../utils/errors";
import { logger } from "../config/logger";
import { simulate, type TraceOp } from "../utils/algoSimulator";

const PISTON_URL = process.env.PISTON_URL || "https://emkc.org/api/v2/piston/execute";

const LANG_MAP: Record<string, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  python:     { language: "python",     version: "3.10.0" },
  java:       { language: "java",       version: "15.0.2" },
  cpp:        { language: "c++",        version: "10.2.0" },
  go:         { language: "go",         version: "1.19.2" },
};

// Known main function names per algorithm and language
const SORT_FN: Record<string, { py: string; java: string; cpp: string; go: string }> = {
  "bubble-sort":    { py: "bubble_sort",    java: "bubbleSort",    cpp: "bubbleSort",    go: "bubbleSort" },
  "insertion-sort": { py: "insertion_sort", java: "insertionSort", cpp: "insertionSort", go: "insertionSort" },
  "selection-sort": { py: "selection_sort", java: "selectionSort", cpp: "selectionSort", go: "selectionSort" },
  "quick-sort":     { py: "quick_sort",     java: "quickSort",     cpp: "quickSort",     go: "quickSort" },
  "merge-sort":     { py: "merge_sort",     java: "mergeSort",     cpp: "mergeSort",     go: "mergeSort" },
  "heap-sort":      { py: "heap_sort",      java: "heapSort",      cpp: "heapSort",      go: "heapSort" },
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\r\n|\r/g, "\n");
}

interface Built { code: string; fileName: string; expected: string }

// ── PYTHON ───────────────────────────────────────────────────────────────────
function buildPython(slug: string, userCode: string, input: number[]): Built {
  const sorted = [...input].sort((a, b) => a - b);

  if (slug in SORT_FN) {
    const fn = SORT_FN[slug].py;
    return {
      code: `${userCode}\n\narr = ${JSON.stringify(input)}\nresult = ${fn}(list(arr))\nprint(' '.join(map(str, result)))`,
      fileName: "main.py",
      expected: sorted.join(" "),
    };
  }

  if (slug === "binary-search") {
    const midIdx = Math.floor(sorted.length / 2);
    const target = sorted[midIdx];
    return {
      code: `${userCode}\n\narr = ${JSON.stringify(sorted)}\nprint(binary_search(arr, ${target}))`,
      fileName: "main.py",
      expected: String(midIdx),
    };
  }

  if (slug === "stack") {
    return {
      code: `${userCode}

s = Stack()
s.push(1)
s.push(2)
s.push(3)
print(s.peek())
print(s.pop())
print(s.peek())
print(s.is_empty())
s.pop()
s.pop()
print(s.is_empty())`,
      fileName: "main.py",
      expected: "3\n3\n2\nfalse\ntrue",
    };
  }

  if (slug === "queue") {
    return {
      code: `${userCode}

q = Queue()
q.enqueue(1)
q.enqueue(2)
q.enqueue(3)
print(q.front())
print(q.dequeue())
print(q.front())
print(q.is_empty())
q.dequeue()
q.dequeue()
print(q.is_empty())`,
      fileName: "main.py",
      expected: "1\n1\n2\nfalse\ntrue",
    };
  }

  return { code: userCode, fileName: "main.py", expected: sorted.join(" ") };
}

// ── C++ ──────────────────────────────────────────────────────────────────────
function buildCpp(slug: string, userCode: string, input: number[]): Built {
  const sorted = [...input].sort((a, b) => a - b);
  const clean = userCode
    .replace(/#include\s*<[^>]+>/g, "")
    .replace(/using\s+namespace\s+std\s*;/g, "")
    .trim();
  const base = `#include <vector>\n#include <deque>\n#include <iostream>\n#include <algorithm>\nusing namespace std;\n\n`;
  const arrLit = input.join(",");
  const sortedLit = sorted.join(",");

  if (slug in SORT_FN) {
    const fn = SORT_FN[slug].cpp;
    return {
      code: `${base}${clean}\n\nint main() {\n  vector<int> arr = {${arrLit}};\n  auto result = ${fn}(arr);\n  for (int i = 0; i < (int)result.size(); i++) { if (i) cout << " "; cout << result[i]; }\n  cout << "\\n";\n  return 0;\n}`,
      fileName: "main.cpp",
      expected: sorted.join(" "),
    };
  }

  if (slug === "binary-search") {
    const midIdx = Math.floor(sorted.length / 2);
    const target = sorted[midIdx];
    return {
      code: `${base}${clean}\n\nint main() {\n  vector<int> arr = {${sortedLit}};\n  cout << binarySearch(arr, ${target}) << "\\n";\n  return 0;\n}`,
      fileName: "main.cpp",
      expected: String(midIdx),
    };
  }

  if (slug === "stack") {
    return {
      code: `${base}${clean}\n\nint main() {\n  Stack s;\n  s.push(1); s.push(2); s.push(3);\n  cout << s.top() << "\\n";\n  cout << s.pop() << "\\n";\n  cout << s.top() << "\\n";\n  cout << (s.empty() ? "true" : "false") << "\\n";\n  s.pop(); s.pop();\n  cout << (s.empty() ? "true" : "false") << "\\n";\n  return 0;\n}`,
      fileName: "main.cpp",
      expected: "3\n3\n2\nfalse\ntrue",
    };
  }

  if (slug === "queue") {
    return {
      code: `${base}${clean}\n\nint main() {\n  Queue q;\n  q.enqueue(1); q.enqueue(2); q.enqueue(3);\n  cout << q.front() << "\\n";\n  cout << q.dequeue() << "\\n";\n  cout << q.front() << "\\n";\n  cout << (q.empty() ? "true" : "false") << "\\n";\n  q.dequeue(); q.dequeue();\n  cout << (q.empty() ? "true" : "false") << "\\n";\n  return 0;\n}`,
      fileName: "main.cpp",
      expected: "1\n1\n2\nfalse\ntrue",
    };
  }

  return { code: userCode, fileName: "main.cpp", expected: sorted.join(" ") };
}

// ── GO ───────────────────────────────────────────────────────────────────────
function buildGo(slug: string, userCode: string, input: number[]): Built {
  const sorted = [...input].sort((a, b) => a - b);
  const arrLit = input.join(",");
  const sortedLit = sorted.join(",");

  if (slug in SORT_FN) {
    const fn = SORT_FN[slug].go;
    return {
      code: `package main\n\nimport (\n    "fmt"\n    "strconv"\n    "strings"\n)\n\n${userCode}\n\nfunc main() {\n    arr := []int{${arrLit}}\n    result := ${fn}(arr)\n    parts := make([]string, len(result))\n    for i, v := range result { parts[i] = strconv.Itoa(v) }\n    fmt.Println(strings.Join(parts, " "))\n}`,
      fileName: "main.go",
      expected: sorted.join(" "),
    };
  }

  if (slug === "binary-search") {
    const midIdx = Math.floor(sorted.length / 2);
    const target = sorted[midIdx];
    return {
      code: `package main\n\nimport "fmt"\n\n${userCode}\n\nfunc main() {\n    arr := []int{${sortedLit}}\n    fmt.Println(binarySearch(arr, ${target}))\n}`,
      fileName: "main.go",
      expected: String(midIdx),
    };
  }

  if (slug === "stack") {
    return {
      code: `package main\n\nimport "fmt"\n\n${userCode}\n\nfunc main() {\n    s := &Stack{}\n    s.Push(1); s.Push(2); s.Push(3)\n    fmt.Println(s.Peek())\n    fmt.Println(s.Pop())\n    fmt.Println(s.Peek())\n    fmt.Println(s.IsEmpty())\n    s.Pop(); s.Pop()\n    fmt.Println(s.IsEmpty())\n}`,
      fileName: "main.go",
      expected: "3\n3\n2\nfalse\ntrue",
    };
  }

  if (slug === "queue") {
    return {
      code: `package main\n\nimport "fmt"\n\n${userCode}\n\nfunc main() {\n    q := &Queue{}\n    q.Enqueue(1); q.Enqueue(2); q.Enqueue(3)\n    fmt.Println(q.Front())\n    fmt.Println(q.Dequeue())\n    fmt.Println(q.Front())\n    fmt.Println(q.IsEmpty())\n    q.Dequeue(); q.Dequeue()\n    fmt.Println(q.IsEmpty())\n}`,
      fileName: "main.go",
      expected: "1\n1\n2\nfalse\ntrue",
    };
  }

  return { code: userCode, fileName: "main.go", expected: sorted.join(" ") };
}

// ── JAVA ─────────────────────────────────────────────────────────────────────
function buildJava(slug: string, userCode: string, input: number[]): Built {
  const sorted = [...input].sort((a, b) => a - b);
  const arrLit = input.join(",");
  const sortedLit = sorted.join(",");

  // Extract user imports, strip them from body, rename public class → package-private
  const userImports = (userCode.match(/^import\s+[^;]+;/gm) ?? []).join("\n");
  const codeBody = userCode
    .replace(/^import\s+[^;]+;\s*/gm, "")
    .replace(/public\s+class\s+\w+(<[^>]+>)?/, "class UserCode")
    .trim();

  const header = `import java.util.*;\nimport java.util.stream.*;\n${userImports ? userImports + "\n" : ""}`;

  if (slug in SORT_FN) {
    const fn = SORT_FN[slug].java;
    const main = `public class Main {\n    public static void main(String[] args) {\n        int[] arr = {${arrLit}};\n        int[] result = UserCode.${fn}(arr);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < result.length; i++) { if (i > 0) sb.append(" "); sb.append(result[i]); }\n        System.out.println(sb);\n    }\n}`;
    return { code: `${header}\n${codeBody}\n\n${main}`, fileName: "Main.java", expected: sorted.join(" ") };
  }

  if (slug === "binary-search") {
    const midIdx = Math.floor(sorted.length / 2);
    const target = sorted[midIdx];
    const main = `public class Main {\n    public static void main(String[] args) {\n        int[] arr = {${sortedLit}};\n        System.out.println(UserCode.binarySearch(arr, ${target}));\n    }\n}`;
    return { code: `${header}\n${codeBody}\n\n${main}`, fileName: "Main.java", expected: String(midIdx) };
  }

  if (slug === "stack") {
    const main = `public class Main {\n    public static void main(String[] args) {\n        UserCode s = new UserCode();\n        s.push(1); s.push(2); s.push(3);\n        System.out.println(s.peek());\n        System.out.println(s.pop());\n        System.out.println(s.peek());\n        System.out.println(s.isEmpty());\n        s.pop(); s.pop();\n        System.out.println(s.isEmpty());\n    }\n}`;
    return { code: `${header}\n${codeBody}\n\n${main}`, fileName: "Main.java", expected: "3\n3\n2\nfalse\ntrue" };
  }

  if (slug === "queue") {
    const main = `public class Main {\n    public static void main(String[] args) {\n        UserCode q = new UserCode();\n        q.enqueue(1); q.enqueue(2); q.enqueue(3);\n        System.out.println(q.front());\n        System.out.println(q.dequeue());\n        System.out.println(q.front());\n        System.out.println(q.isEmpty());\n        q.dequeue(); q.dequeue();\n        System.out.println(q.isEmpty());\n    }\n}`;
    return { code: `${header}\n${codeBody}\n\n${main}`, fileName: "Main.java", expected: "1\n1\n2\nfalse\ntrue" };
  }

  return { code: userCode, fileName: "Main.java", expected: sorted.join(" ") };
}

function buildCode(slug: string, language: string, userCode: string, input: number[]): Built {
  switch (language) {
    case "python": return buildPython(slug, userCode, input);
    case "cpp":    return buildCpp(slug, userCode, input);
    case "go":     return buildGo(slug, userCode, input);
    case "java":   return buildJava(slug, userCode, input);
    default: throw new BadRequestError(`Язык "${language}" не поддерживается`);
  }
}

export class ExecuteController {
  run = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { language, code, input, slug } = req.body as {
        language: string; code: string; input?: number[]; slug?: string;
      };

      if (!language || !code) throw new BadRequestError("language и code обязательны");

      const langConfig = LANG_MAP[language];
      if (!langConfig) throw new BadRequestError(`Язык "${language}" не поддерживается`);

      // JavaScript runs in the browser worker — server only handles Python/Java/C++/Go
      if (language === "javascript") {
        res.status(400).json({ data: { output: "JavaScript выполняется в браузере, не на сервере", runtime: 0, passed: false, error: null, signal: null } });
        return;
      }

      const inputArr: number[] = Array.isArray(input) ? input : [5, 2, 8, 1, 9, 3];
      const slugStr: string = slug || "bubble-sort";

      const built = buildCode(slugStr, language, code, inputArr);

      const { data } = await axios.post(PISTON_URL, {
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: built.fileName, content: built.code }],
        stdin: "",
        args: [],
        compile_timeout: 15000,
        run_timeout: 10000,
      }, { timeout: 25000 });

      const compileErr = (data.compile?.stderr ?? "").trim();
      const stdout = (data.run?.stdout ?? "").trim();
      const runStderr = (data.run?.stderr ?? "").trim();
      const runtime = Math.round((data.run?.time ?? 0) * 1000);

      if (compileErr) {
        res.json({ data: { output: compileErr, runtime, passed: false, error: compileErr, signal: null, expected: built.expected } });
        return;
      }

      const passed = normalize(stdout) === normalize(built.expected);
      const outputToShow = stdout || runStderr;

      res.json({ data: { output: outputToShow, runtime, passed, error: runStderr || null, signal: null, expected: built.expected } });
    } catch (e: any) {
      const isNetwork = e?.code === "ENOTFOUND" || e?.code === "ECONNREFUSED" || e?.code === "ETIMEDOUT";
      const httpStatus = e?.response?.status;
      if (isNetwork || httpStatus) {
        res.status(503).json({
          data: {
            output: `Сервис компиляции (Piston) недоступен${httpStatus ? ` (HTTP ${httpStatus})` : ` (${e?.code})`}. JavaScript выполняется локально без внешних сервисов.`,
            runtime: 0,
            passed: false,
            error: "Сервис компиляции недоступен",
            signal: null,
          },
        });
        return;
      }
      logger.error("[Execute] failed", { error: e?.message });
      next(e);
    }
  };

  trace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug, input, target } = req.body as { slug?: string; input?: number[]; target?: number };
      if (!slug || !Array.isArray(input)) throw new BadRequestError("slug и input обязательны");
      if (input.length > 50) throw new BadRequestError("input слишком большой (макс. 50 элементов)");
      const result = simulate(slug, input, target);
      if (!result.ok) {
        res.status(400).json({ data: { trace: [] as TraceOp[], ok: false, error: result.error } });
        return;
      }
      res.json({ data: { trace: result.steps, ok: true, error: null } });
    } catch (e) {
      next(e);
    }
  };
}
