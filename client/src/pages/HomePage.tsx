import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInView } from "@/hooks/useInView";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  BookOpen, Code2, Sparkles, Trophy, ArrowRight, BarChart3,
  Braces, Search, Shuffle, Layers, Rocket,
  ChevronDown, CheckCircle2, GraduationCap, Play,
  Eye, Zap, Cpu, Gauge, ArrowLeftRight, ArrowUpDown,
} from "lucide-react";

const floatingShapes = [
  { size: 300, x: "10%", y: "15%", delay: "0s", duration: "7s", color: "var(--accent)" },
  { size: 200, x: "75%", y: "20%", delay: "1s", duration: "9s", color: "var(--info)" },
  { size: 150, x: "85%", y: "60%", delay: "2s", duration: "8s", color: "var(--success)" },
  { size: 250, x: "5%", y: "65%", delay: "0.5s", duration: "10s", color: "var(--warning)" },
  { size: 100, x: "50%", y: "10%", delay: "3s", duration: "6s", color: "var(--accent)" },
];

const features = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Структурированная теория",
    desc: "Материал разбит на блоки с последовательным освоением. Изучайте алгоритмы шаг за шагом с текстовыми и визуальными пояснениями.",
    color: "from-indigo-500/20 to-indigo-500/5",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: "Пошаговая визуализация",
    desc: "Наблюдайте работу алгоритмов в реальном времени. Замедляйте, ускоряйте и перематывайте анимацию для полного понимания каждого шага.",
    color: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "AI-помощник",
    desc: "Получите объяснение любого алгоритма от нейросети. Задавайте вопросы, просите подсказки и анализируйте свой код с помощью OpenAI / GigaChat.",
    color: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: <Code2 className="h-6 w-6" />,
    title: "Практика с проверкой",
    desc: "Пишите код прямо в браузере. Запускайте тесты, проверяйте решения и получайте мгновенную обратную связь. 29 задач с автоматической проверкой.",
    color: "from-rose-500/20 to-rose-500/5",
  },
];

const algorithms = [
  {
    icon: <Shuffle className="h-8 w-8" />,
    name: "Сортировка пузырьком",
    slug: "bubble-sort",
    difficulty: "easy" as const,
    desc: "Простой алгоритм, многократно проходящий по массиву и меняющий соседние элементы местами, если они в неправильном порядке.",
    complexity: "O(n²)",
  },
  {
    icon: <Layers className="h-8 w-8" />,
    name: "Сортировка вставками",
    slug: "insertion-sort",
    difficulty: "easy" as const,
    desc: "Строит отсортированный массив по одному элементу, последовательно вставляя каждый элемент в правильную позицию.",
    complexity: "O(n²)",
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    name: "Сортировка выбором",
    slug: "selection-sort",
    difficulty: "easy" as const,
    desc: "Делит массив на отсортированную и неотсортированную части, на каждом шаге выбирая минимальный элемент из неотсортированной части.",
    complexity: "O(n²)",
  },
  {
    icon: <Search className="h-8 w-8" />,
    name: "Бинарный поиск",
    slug: "binary-search",
    difficulty: "medium" as const,
    desc: "Эффективный алгоритм поиска элемента в отсортированном массиве путём последовательного деления диапазона поиска пополам.",
    complexity: "O(log n)",
  },
  {
    icon: <Zap className="h-8 w-8" />,
    name: "Быстрая сортировка",
    slug: "quick-sort",
    difficulty: "medium" as const,
    desc: "Эффективный алгоритм, использующий принцип «разделяй и властвуй». Выбирает опорный элемент и разделяет массив на две части.",
    complexity: "O(n log n)",
  },
  {
    icon: <Layers className="h-8 w-8" />,
    name: "Сортировка слиянием",
    slug: "merge-sort",
    difficulty: "medium" as const,
    desc: "Стабильный алгоритм с гарантированной сложностью O(n log n). Рекурсивно делит массив пополам и сливает отсортированные половины.",
    complexity: "O(n log n)",
  },
  {
    icon: <Braces className="h-8 w-8" />,
    name: "Пирамидальная сортировка",
    slug: "heap-sort",
    difficulty: "hard" as const,
    desc: "Сортирует с помощью структуры «куча». Строит max-кучу, затем извлекает максимальные элементы один за другим.",
    complexity: "O(n log n)",
  },
  {
    icon: <ArrowUpDown className="h-8 w-8" />,
    name: "Стек",
    slug: "stack",
    difficulty: "easy" as const,
    desc: "Структура данных LIFO. Элементы добавляются и удаляются с одного конца (вершины). Используется в системных вызовах, обходе деревьев.",
    complexity: "O(1)",
  },
  {
    icon: <ArrowLeftRight className="h-8 w-8" />,
    name: "Очередь",
    slug: "queue",
    difficulty: "easy" as const,
    desc: "Структура данных FIFO. Элементы добавляются в конец и извлекаются из начала. Основа BFS, планировщиков задач, буферизации.",
    complexity: "O(1)",
  },
];

const steps = [
  { icon: <BookOpen className="h-5 w-5" />, title: "Изучите теорию", desc: "Начните с теоретических материалов по каждому алгоритму. Закрепляйте знания с помощью встроенных викторин." },
  { icon: <Eye className="h-5 w-5" />, title: "Посмотрите визуализацию", desc: "Увидьте, как алгоритм работает на практике. Управляйте анимацией, наблюдайте за изменениями массива пошагово." },
  { icon: <Code2 className="h-5 w-5" />, title: "Напишите код", desc: "Реализуйте алгоритм во встроенном редакторе кода. Используйте AI-подсказки при затруднениях." },
  { icon: <Trophy className="h-5 w-5" />, title: "Пройдите тест", desc: "Проверьте свои знания с помощью тестовых заданий. Соревнуйтесь с собой и отслеживайте прогресс." },
];

function AnimatedCounter({ end, suffix = "", inView }: { end: number; suffix?: string; inView: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [end, inView]);
  return <>{count}{suffix}</>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={`text-center mb-12 ${inView ? "animate-fade-in-up" : "opacity-0"}`}>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-fg-muted max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const { ref: heroRef, inView: heroInView } = useInView({ threshold: 0.1, once: true });
  const { ref: featuresRef, inView: featuresInView } = useInView({ threshold: 0.1, once: true });
  const { ref: algoRef, inView: algoInView } = useInView({ threshold: 0.1, once: true });
  const { ref: statsRef, inView: statsInView } = useInView({ threshold: 0.3, once: true });
  const { ref: stepsRef, inView: stepsInView } = useInView({ threshold: 0.1, once: true });
  const { ref: ctaRef, inView: ctaInView } = useInView({ threshold: 0.1, once: true });

  const difficultyBadge = (d: "easy" | "medium" | "hard") => {
    const labels = { easy: "Начальный", medium: "Средний", hard: "Сложный" };
    const tones = { easy: "success" as const, medium: "warning" as const, hard: "danger" as const };
    return <Badge tone={tones[d]}>{labels[d]}</Badge>;
  };

  return (
    <div className="overflow-hidden">
      <section className="relative min-h-[90vh] flex items-center justify-center px-4">
        {floatingShapes.map((s, i) => (
          <div
            key={i}
            className="floating-shape"
            style={{
              width: s.size,
              height: s.size,
              left: s.x,
              top: s.y,
              background: `radial-gradient(circle, ${s.color} 0%, transparent 70%)`,
              animation: `float ${s.duration} ${s.delay} ease-in-out infinite`,
            }}
          />
        ))}
        <div className="hero-gradient absolute inset-0 opacity-30 dark:opacity-20 animate-gradient-shift" />
        <div
          ref={heroRef}
          className={`relative text-center max-w-4xl mx-auto ${heroInView ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Дипломный проект · ИСПк-402-52-00
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Изучайте{" "}
            <span className="gradient-text">алгоритмы</span>
            <br />
            через визуализацию
          </h1>
          <p className="mt-6 text-xl text-fg-muted max-w-2xl mx-auto leading-relaxed">
            Интерактивный учебник по алгоритмам и структурам данных с пошаговой визуализацией,
            практическими задачами и AI-помощником. Всё в одном месте.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link to="/catalog">
              <Button size="lg" className="gap-2 text-base px-8 h-14">
                Начать обучение <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#algorithms">
              <Button size="lg" variant="outline" className="text-base px-8 h-14">
                Алгоритмы
              </Button>
            </a>
          </div>
          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-fg-muted">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />7 алгоритмов</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />2 структуры данных</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />AI-помощь</span>
          </div>
          <div className="mt-8 animate-bounce">
            <ChevronDown className="h-6 w-6 text-fg-muted mx-auto" />
          </div>
        </div>
      </section>

      <section ref={featuresRef} className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="Всё необходимое для изучения"
            subtitle="Платформа объединяет теорию, визуализацию, практику и AI-помощь в едином интерфейсе"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className={`card-hover relative overflow-hidden rounded-2xl border border-border bg-bg-elev p-8
                  ${featuresInView ? `animate-fade-in-up animate-delay-${(i * 100)}` : "opacity-0"}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-50`} />
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 text-accent grid place-items-center mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-fg-muted leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="algorithms" ref={algoRef} className="py-24 px-4 bg-bg-subtle">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="Изучаемые алгоритмы и структуры данных"
            subtitle="7 алгоритмов и 2 структуры данных с подробной теорией, визуализацией и практическими задачами"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {algorithms.map((a, i) => (
              <Link
                key={a.slug}
                to={`/algorithms/${a.slug}`}
                className={`card-hover group rounded-2xl border border-border bg-bg-elev p-6 flex flex-col
                  ${algoInView ? `animate-fade-in-up animate-delay-${(i * 100)}` : "opacity-0"}`}
              >
                <div className="h-14 w-14 rounded-xl bg-accent/10 text-accent grid place-items-center mb-4 group-hover:scale-110 transition-transform">
                  {a.icon}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{a.name}</h3>
                </div>
                {difficultyBadge(a.difficulty)}
                <p className="text-sm text-fg-muted mt-3 leading-relaxed flex-1">{a.desc}</p>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-mono text-fg-subtle">{a.complexity}</span>
                  <span className="text-xs text-accent group-hover:gap-2 transition-all flex items-center gap-1">
                    Изучать <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section ref={statsRef} className="py-24 px-4 relative">
        <div className="hero-gradient absolute inset-0 opacity-10 dark:opacity-5" />
        <div className="max-w-6xl mx-auto relative">
          <SectionTitle
            title="Платформа в цифрах"
            subtitle="Образовательный контент, созданный для глубокого понимания алгоритмов"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: <Braces className="h-6 w-6" />, end: 9, label: "Тем для изучения", suffix: "" },
              { icon: <BookOpen className="h-6 w-6" />, end: 111, label: "Блоков теории", suffix: "" },
              { icon: <Code2 className="h-6 w-6" />, end: 29, label: "Практических задач", suffix: "" },
              { icon: <GraduationCap className="h-6 w-6" />, end: 55, label: "Тестовых вопроса", suffix: "" },
            ].map((stat, i) => (
              <div
                key={i}
                className={`text-center ${statsInView ? `animate-scale-in animate-delay-${(i * 100)}` : "opacity-0"}`}
              >
                <div className="h-14 w-14 rounded-2xl bg-accent/10 text-accent grid place-items-center mx-auto mb-4">
                  {stat.icon}
                </div>
                <div className="text-4xl sm:text-5xl font-bold tracking-tight gradient-text">
                  <AnimatedCounter end={stat.end} inView={statsInView} />
                  {stat.suffix}
                </div>
                <div className="text-sm text-fg-muted mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={stepsRef} className="py-24 px-4 bg-bg-subtle">
        <div className="max-w-4xl mx-auto">
          <SectionTitle
            title="Как это работает"
            subtitle="Всего 4 шага для освоения любого алгоритма"
          />
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden sm:block" />
            <div className="space-y-12">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`relative pl-0 sm:pl-20
                    ${stepsInView ? `animate-fade-in-up animate-delay-${(i * 100)}` : "opacity-0"}`}
                >
                  <div className="absolute left-0 top-0 hidden sm:flex h-16 w-16 rounded-2xl bg-accent text-white items-center justify-center text-lg font-bold shadow-lg shadow-accent/20">
                    {i + 1}
                  </div>
                  <div className="sm:hidden flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-accent text-white grid place-items-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent grid place-items-center">
                      {s.icon}
                    </div>
                  </div>
                  <div className="hidden sm:flex h-10 w-10 rounded-xl bg-accent/10 text-accent items-center justify-center mb-3 ml-1">
                    {s.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="text-fg-muted mt-2 leading-relaxed max-w-xl">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section ref={ctaRef} className="py-24 px-4">
        <div
          className={`max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border border-accent/20 p-12 sm:p-16 text-center
            ${ctaInView ? "animate-scale-in" : "opacity-0"}`}
        >
          <Rocket className="h-12 w-12 text-accent mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Готовы начать?</h2>
          <p className="mt-4 text-lg text-fg-muted max-w-xl mx-auto">
            Изучайте алгоритмы через визуализацию, практикуйтесь с задачами и используйте AI-помощника.
            Всё бесплатно и без регистрации.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link to="/catalog">
              <Button size="lg" className="gap-2 text-base px-8 h-14">
                <Play className="h-5 w-5" /> Начать обучение
              </Button>
            </Link>
            <a href="#algorithms">
              <Button size="lg" variant="outline" className="text-base px-8 h-14">
                <BarChart3 className="h-5 w-5" /> Обзор алгоритмов
              </Button>
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-fg-subtle">
            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> Без регистрации</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Бесплатно</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Работает в браузере</span>
          </div>
        </div>
      </section>
    </div>
  );
}
