import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/stores/auth";
import { extractErrorMessage } from "@/lib/api";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Пароль должен быть минимум 8 символов");
      return;
    }
    setSubmitting(true);
    try {
      await register(username, email, password);
      navigate("/progress");
    } catch (err) {
      setError(extractErrorMessage(err, "Ошибка регистрации"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1">Регистрация</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</div>
            )}
            <div>
              <label className="text-sm font-medium block mb-1">Имя пользователя</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Пароль</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Регистрация…" : "Зарегистрироваться"}
            </Button>
            <p className="text-sm text-center text-fg-muted">
              Уже есть аккаунт?{" "}
              <Link to="/login" className="text-accent hover:underline">
                Войти
              </Link>
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
