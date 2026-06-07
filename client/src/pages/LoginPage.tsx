import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/stores/auth";
import { Input } from "@/components/ui/Input";
import { Button, Spinner } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { extractErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/catalog";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email) errs.email = t("auth.validation.email_required");
    if (password.length < 8) errs.password = t("auth.validation.password_min");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await login(email, password);
      toast.success(`Добро пожаловать!`);
      navigate(next);
    } catch (e) {
      toast.error(extractErrorMessage(e, t("auth.invalid_credentials")));
    }
  };

  return (
    <div className="max-w-md mx-auto pt-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("auth.login_title")}</CardTitle>
          <CardDescription>Войдите, чтобы продолжить обучение</CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input
              label={t("auth.email")}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
            />
            <Input
              label={t("auth.password")}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              {loading ? <Spinner size="sm" /> : t("auth.submit_login")}
            </Button>
          </form>
          <p className="text-sm text-fg-muted mt-4 text-center">
            {t("auth.no_account")}{" "}
            <Link to="/register" className="text-accent hover:underline">Регистрация</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
