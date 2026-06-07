import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<FileQuestion className="h-16 w-16" />}
      title={t("common.not_found_title")}
      description={t("common.not_found_desc")}
      action={<Link to="/"><Button>{t("common.back_home")}</Button></Link>}
    />
  );
}
