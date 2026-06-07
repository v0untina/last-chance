import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/stores/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { extractErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string }>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (username.length < 3) errs.username = t("auth.validation.username_min");
    if (!email) errs.email = t("auth.validation.email_required");
    if (password.length < 8) errs.password = t("auth.validation.password_min");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await register(username, email, password);
      toast.success("Аккаунт создан!");
      navigate("/catalog");
    } catch (e) {
      toast.error(extractErrorMessage(e, "Не удалось создать аккаунт"));
    }
  };

  return (
    <div className="max-w-md mx-auto pt-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("auth.register_title")}</CardTitle>
          <CardDescription>Создайте бесплатный аккаунт</CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input label={t("auth.username")} value={username} onChange={(e) => setUsername(e.target.value)} error={errors.username} required />
            <Input label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
            <Input label={t("auth.password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
            <Button type="submit" loading={loading} className="w-full">{t("auth.submit_register")}</Button>
          </form>
          <p className="text-sm text-fg-muted mt-4 text-center">
            {t("auth.have_account")}{" "}
            <Link to="/login" className="text-accent hover:underline">{t("nav.login")}</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
