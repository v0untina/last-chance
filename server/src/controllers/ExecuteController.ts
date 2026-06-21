import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { BadRequestError } from "../utils/errors";
import { logger } from "../config/logger";
import { simulate, type TraceOp } from "../utils/algoSimulator";

// Канонический публичный Piston. Можно переопределить своим инстансом через PISTON_URL.
const PISTON_URL = process.env.PISTON_URL || "https://emkc.org/api/v2/piston/execute";

const LANG_MAP: Record<string, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  go: { language: "go", version: "1.19.2" },
};

export class ExecuteController {
  run = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { language, code, input } = req.body;

      const langConfig = LANG_MAP[language as string];
      if (!langConfig) {
        throw new BadRequestError(`Язык "${language}" не поддерживается`);
      }

      let wrappedCode = code;
      if (language === "javascript") {
        const fnName = code.match(/function\s+(\w+)/)?.[1] ?? "bubbleSort";
        wrappedCode = `${code}\n\nconst arr = ${JSON.stringify(input)};\nconsole.log(JSON.stringify(${fnName}(arr)));`;
      } else if (language === "python") {
        const fnName = code.match(/def\s+(\w+)/)?.[1] ?? "bubble_sort";
        wrappedCode = `${code}\n\narr = ${JSON.stringify(input)}\nprint(json.dumps(${fnName}(arr)))`;
      } else if (language === "cpp") {
        const fnName = code.match(/\w+\s+(\w+)\(/)?.[1] ?? "bubbleSort";
        wrappedCode = `${code.replace("#include <vector>", "#include <vector>\n#include <iostream>\n#include <string>")}\n\nint main() {\n  vector<int> arr = {${(input as number[]).join(",")}};\n  auto result = ${fnName}(arr);\n  for (int x : result) cout << x << " ";\n  return 0;\n}`;
      } else if (language === "go") {
        const fnName = code.match(/func\s+(\w+)/)?.[1] ?? "bubbleSort";
        wrappedCode = `package main\n\nimport "fmt"\n\n${code}\n\nfunc main() {\n  arr := []int{${(input as number[]).join(",")}}\n  fmt.Println(${fnName}(arr))\n}`;
      } else if (language === "java") {
        wrappedCode = code;
      }

      const { data } = await axios.post(PISTON_URL, {
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: "main", content: wrappedCode }],
        stdin: "",
        args: [],
        compile_timeout: 15000,
        run_timeout: 10000,
      }, { timeout: 20000 });

      const output = (data.run?.stdout ?? data.run?.stderr ?? "").trim();
      const runtime = Math.round((data.run?.time ?? 0) * 1000);

      res.json({
        data: {
          output,
          runtime,
          passed: !data.run?.stderr,
          error: data.run?.stderr || null,
          signal: data.run?.signal || null,
        },
      });
    } catch (e: any) {
      const netCode = e?.code === "ENOTFOUND" || e?.code === "ECONNREFUSED" || e?.code === "ETIMEDOUT";
      const httpErr = e?.response?.status; // внешний Piston вернул HTTP-ошибку (напр. 401 whitelist, 429, 5xx)
      if (netCode || httpErr) {
        res.status(503).json({
          data: {
            output: `Внешний сервис выполнения кода (Piston) недоступен${httpErr ? ` (HTTP ${httpErr})` : ` (${e?.code})`}. Выполнение на ${"JavaScript"} доступно локально без внешних сервисов.`,
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
      if (!slug || !Array.isArray(input)) {
        throw new BadRequestError("slug и input обязательны");
      }
      if (input.length > 50) {
        throw new BadRequestError("input слишком большой (макс. 50 элементов)");
      }
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
