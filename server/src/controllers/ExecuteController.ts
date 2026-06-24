import { Request, Response, NextFunction } from "express";
import { exec } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, rm, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { BadRequestError } from "../utils/errors";
import { logger } from "../config/logger";
import { simulate, type TraceOp } from "../utils/algoSimulator";

// Known main function names per algorithm and language
const SORT_FN: Record<string, { py: string; java: string; cpp: string; go: string }> = {
  "bubble-sort":    { py: "bubble_sort",    java: "bubbleSort",    cpp: "bubbleSort",    go: "bubbleSort" },
  "insertion-sort": { py: "insertion_sort", java: "insertionSort", cpp: "insertionSort", go: "insertionSort" },
  "selection-sort": { py: "selection_sort", java: "selectionSort", cpp: "selectionSort", go: "selectionSort" },
  "quick-sort":     { py: "quick_sort",     java: "quickSort",     cpp: "quickSort",     go: "quickSort" },
  "merge-sort":     { py: "merge_sort",     java: "mergeSort",     cpp: "mergeSort",     go: "mergeSort" },
  "heap-sort":      { py: "heap_sort",      java: "heapSort",      cpp: "heapSort",      go: "heapSort" },
};

const IS_WIN = process.platform === "win32";
const PYTHON_CMD = IS_WIN ? "python" : "python3";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\r\n|\r/g, "\n");
}

// ── Shell execution helper ────────────────────────────────────────────────────
function execCmd(cmd: string, cwd: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const proc = exec(cmd, { cwd, timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout ?? "",
        stderr: err?.killed ? `Превышено время выполнения (${timeoutMs / 1000} с)` : (stderr ?? ""),
        timedOut: !!err?.killed,
      });
    });
  });
}

// ── Local runner ─────────────────────────────────────────────────────────────
async function runLocally(language: string, code: string, fileName: string): Promise<{
  stdout: string; stderr: string; compileErr: string; runtime: number;
}> {
  const dir = join(tmpdir(), `algo_${randomUUID()}`);
  await mkdir(dir, { recursive: true });

  try {
    await writeFile(join(dir, fileName), code, "utf8");
    const t0 = Date.now();

    // ── Compile ──────────────────────────────────────────────────────────────
    if (language === "java") {
      const r = await execCmd(`javac ${fileName}`, dir, 15000);
      if (r.stderr.trim()) return { stdout: "", stderr: "", compileErr: r.stderr.trim(), runtime: 0 };
    } else if (language === "cpp") {
      const outBin = IS_WIN ? "out.exe" : "out";
      const r = await execCmd(`g++ -std=c++17 -O2 ${fileName} -o ${outBin}`, dir, 15000);
      if (r.stderr.trim()) return { stdout: "", stderr: "", compileErr: r.stderr.trim(), runtime: 0 };
    }

    // ── Run ──────────────────────────────────────────────────────────────────
    let runCmd: string;
    switch (language) {
      case "python": runCmd = `${PYTHON_CMD} ${fileName}`; break;
      case "java":   runCmd = `java -cp . Main`; break;
      case "cpp":    runCmd = IS_WIN ? "out.exe" : "./out"; break;
      case "go":     runCmd = `go run ${fileName}`; break;
      default: throw new Error(`Язык "${language}" не поддерживается`);
    }

    const r = await execCmd(runCmd, dir, 10000);
    return { stdout: r.stdout, stderr: r.stderr, compileErr: "", runtime: Date.now() - t0 };
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Code builders ─────────────────────────────────────────────────────────────

interface Built { code: string; fileName: string; expected: string }

function buildPython(slug: string, userCode: string, input: number[]): Built {
  const sorted = [...input].sort((a, b) => a - b);

  if (slug in SORT_FN) {
    const fn = SORT_FN[slug].py;
    return {
      code: `${userCode}\n\narr = ${JSON.stringify(input)}\nresult = ${fn}(list(arr))\nprint(' '.join(map(str, result)))`,
      fileName: "main.py", expected: sorted.join(" "),
    };
  }
  if (slug === "binary-search") {
    const midIdx = Math.floor(sorted.length / 2);
    return {
      code: `${userCode}\n\narr = ${JSON.stringify(sorted)}\nprint(binary_search(arr, ${sorted[midIdx]}))`,
      fileName: "main.py", expected: String(midIdx),
    };
  }
  if (slug === "stack") {
    return {
      code: `${userCode}\n\ns = Stack()\ns.push(1)\ns.push(2)\ns.push(3)\nprint(s.peek())\nprint(s.pop())\nprint(s.peek())\nprint(s.is_empty())\ns.pop()\ns.pop()\nprint(s.is_empty())`,
      fileName: "main.py", expected: "3\n3\n2\nfalse\ntrue",
    };
  }
  if (slug === "queue") {
    return {
      code: `${userCode}\n\nq = Queue()\nq.enqueue(1)\nq.enqueue(2)\nq.enqueue(3)\nprint(q.front())\nprint(q.dequeue())\nprint(q.front())\nprint(q.is_empty())\nq.dequeue()\nq.dequeue()\nprint(q.is_empty())`,
      fileName: "main.py", expected: "1\n1\n2\nfalse\ntrue",
    };
  }
  return { code: userCode, fileName: "main.py", expected: sorted.join(" ") };
}

function buildCpp(slug: string, userCode: string, input: number[]): Built {
  const sorted = [...input].sort((a, b) => a - b);
  const clean = userCode
    .replace(/#include\s*<[^>]+>/g, "")
    .replace(/using\s+namespace\s+std\s*;/g, "")
    .trim();
  const base = `#include <vector>\n#include <deque>\n#include <iostream>\n#include <algorithm>\nusing namespace std;\n\n`;

  if (slug in SORT_FN) {
    const fn = SORT_FN[slug].cpp;
    return {
      code: `${base}${clean}\n\nint main() {\n  vector<int> arr = {${input.join(",")}};\n  auto result = ${fn}(arr);\n  for (int i = 0; i < (int)result.size(); i++) { if (i) cout << " "; cout << result[i]; }\n  cout << "\\n";\n  return 0;\n}`,
      fileName: "main.cpp", expected: sorted.join(" "),
    };
  }
  if (slug === "binary-search") {
    const midIdx = Math.floor(sorted.length / 2);
    return {
      code: `${base}${clean}\n\nint main() {\n  vector<int> arr = {${sorted.join(",")}};\n  cout << binarySearch(arr, ${sorted[midIdx]}) << "\\n";\n  return 0;\n}`,
      fileName: "main.cpp", expected: String(midIdx),
    };
  }
  if (slug === "stack") {
    return {
      code: `${base}${clean}\n\nint main() {\n  Stack s;\n  s.push(1); s.push(2); s.push(3);\n  cout << s.top() << "\\n";\n  cout << s.pop() << "\\n";\n  cout << s.top() << "\\n";\n  cout << (s.empty() ? "true" : "false") << "\\n";\n  s.pop(); s.pop();\n  cout << (s.empty() ? "true" : "false") << "\\n";\n  return 0;\n}`,
      fileName: "main.cpp", expected: "3\n3\n2\nfalse\ntrue",
    };
  }
  if (slug === "queue") {
    return {
      code: `${base}${clean}\n\nint main() {\n  Queue q;\n  q.enqueue(1); q.enqueue(2); q.enqueue(3);\n  cout << q.front() << "\\n";\n  cout << q.dequeue() << "\\n";\n  cout << q.front() << "\\n";\n  cout << (q.empty() ? "true" : "false") << "\\n";\n  q.dequeue(); q.dequeue();\n  cout << (q.empty() ? "true" : "false") << "\\n";\n  return 0;\n}`,
      fileName: "main.cpp", expected: "1\n1\n2\nfalse\ntrue",
    };
  }
  return { code: userCode, fileName: "main.cpp", expected: sorted.join(" ") };
}

function buildGo(slug: string, userCode: string, input: number[]): Built {
  const sorted = [...input].sort((a, b) => a - b);

  if (slug in SORT_FN) {
    const fn = SORT_FN[slug].go;
    return {
      code: `package main\n\nimport (\n    "fmt"\n    "strconv"\n    "strings"\n)\n\n${userCode}\n\nfunc main() {\n    arr := []int{${input.join(",")}}\n    result := ${fn}(arr)\n    parts := make([]string, len(result))\n    for i, v := range result { parts[i] = strconv.Itoa(v) }\n    fmt.Println(strings.Join(parts, " "))\n}`,
      fileName: "main.go", expected: sorted.join(" "),
    };
  }
  if (slug === "binary-search") {
    const midIdx = Math.floor(sorted.length / 2);
    return {
      code: `package main\n\nimport "fmt"\n\n${userCode}\n\nfunc main() {\n    arr := []int{${sorted.join(",")}}\n    fmt.Println(binarySearch(arr, ${sorted[midIdx]}))\n}`,
      fileName: "main.go", expected: String(midIdx),
    };
  }
  if (slug === "stack") {
    return {
      code: `package main\n\nimport "fmt"\n\n${userCode}\n\nfunc main() {\n    s := &Stack{}\n    s.Push(1); s.Push(2); s.Push(3)\n    fmt.Println(s.Peek())\n    fmt.Println(s.Pop())\n    fmt.Println(s.Peek())\n    fmt.Println(s.IsEmpty())\n    s.Pop(); s.Pop()\n    fmt.Println(s.IsEmpty())\n}`,
      fileName: "main.go", expected: "3\n3\n2\nfalse\ntrue",
    };
  }
  if (slug === "queue") {
    return {
      code: `package main\n\nimport "fmt"\n\n${userCode}\n\nfunc main() {\n    q := &Queue{}\n    q.Enqueue(1); q.Enqueue(2); q.Enqueue(3)\n    fmt.Println(q.Front())\n    fmt.Println(q.Dequeue())\n    fmt.Println(q.Front())\n    fmt.Println(q.IsEmpty())\n    q.Dequeue(); q.Dequeue()\n    fmt.Println(q.IsEmpty())\n}`,
      fileName: "main.go", expected: "1\n1\n2\nfalse\ntrue",
    };
  }
  return { code: userCode, fileName: "main.go", expected: sorted.join(" ") };
}

function buildJava(slug: string, userCode: string, input: number[]): Built {
  const sorted = [...input].sort((a, b) => a - b);

  const userImports = (userCode.match(/^import\s+[^;]+;/gm) ?? []).join("\n");
  const codeBody = userCode
    .replace(/^import\s+[^;]+;\s*/gm, "")
    .replace(/public\s+class\s+\w+(<[^>]+>)?/, "class UserCode")
    .trim();
  const header = `import java.util.*;\nimport java.util.stream.*;\n${userImports ? userImports + "\n" : ""}`;

  if (slug in SORT_FN) {
    const fn = SORT_FN[slug].java;
    const main = `public class Main {\n    public static void main(String[] args) {\n        int[] arr = {${input.join(",")}};\n        int[] result = UserCode.${fn}(arr);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < result.length; i++) { if (i > 0) sb.append(" "); sb.append(result[i]); }\n        System.out.println(sb);\n    }\n}`;
    return { code: `${header}\n${codeBody}\n\n${main}`, fileName: "Main.java", expected: sorted.join(" ") };
  }
  if (slug === "binary-search") {
    const midIdx = Math.floor(sorted.length / 2);
    const main = `public class Main {\n    public static void main(String[] args) {\n        int[] arr = {${sorted.join(",")}};\n        System.out.println(UserCode.binarySearch(arr, ${sorted[midIdx]}));\n    }\n}`;
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

// ── Controller ────────────────────────────────────────────────────────────────
export class ExecuteController {
  run = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { language, code, input, slug } = req.body as {
        language: string; code: string; input?: number[]; slug?: string;
      };

      if (!language || !code) throw new BadRequestError("language и code обязательны");
      if (language === "javascript") {
        res.status(400).json({ data: { output: "JavaScript выполняется в браузере", runtime: 0, passed: false, error: null, signal: null } });
        return;
      }

      const inputArr: number[] = Array.isArray(input) ? input : [5, 2, 8, 1, 9, 3];
      const slugStr: string = slug || "bubble-sort";
      const built = buildCode(slugStr, language, code, inputArr);

      logger.info(`[Execute] lang=${language} slug=${slugStr}`);

      const result = await runLocally(language, built.code, built.fileName);

      const NOT_INSTALLED_PATTERNS = ["is not recognized", "not found", "command not found", "No such file", "cannot find", "не найден"];
      const isNotInstalled = (s: string) => NOT_INSTALLED_PATTERNS.some((p) => s.toLowerCase().includes(p.toLowerCase()));
      const LANG_INSTALL: Record<string, string> = {
        python: "Python (python.org)", java: "JDK — Java Development Kit (adoptium.net)",
        cpp: "MinGW/GCC — компилятор g++ (winlibs.com или mingw-w64.org)", go: "Go (go.dev)",
      };

      if (result.compileErr) {
        const msg = isNotInstalled(result.compileErr)
          ? `Компилятор не установлен: ${LANG_INSTALL[language] ?? language}. Установите и перезапустите сервер.`
          : result.compileErr;
        res.json({ data: { output: msg, runtime: 0, passed: false, error: msg, signal: null, expected: built.expected } });
        return;
      }

      const stderr = result.stderr.trim();
      if (stderr && isNotInstalled(stderr)) {
        const msg = `Компилятор не установлен: ${LANG_INSTALL[language] ?? language}. Установите и перезапустите сервер.`;
        res.json({ data: { output: msg, runtime: 0, passed: false, error: msg, signal: null, expected: built.expected } });
        return;
      }

      const stdout = result.stdout.trim();
      const passed = normalize(stdout) === normalize(built.expected);

      res.json({
        data: { output: stderr || stdout, runtime: result.runtime, passed, error: stderr || null, signal: null, expected: built.expected },
      });
    } catch (e: any) {
      if (e instanceof BadRequestError) { next(e); return; }
      // Language not installed on this machine
      if (e?.code === "ENOENT" || (e?.message && (e.message.includes("not found") || e.message.includes("не найден") || e.message.includes("is not recognized")))) {
        res.status(503).json({
          data: {
            output: `Компилятор для выбранного языка не установлен на сервере. Убедитесь что Python/Java/g++/Go есть в PATH.`,
            runtime: 0, passed: false, error: "Компилятор не найден", signal: null,
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
