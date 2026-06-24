import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./ru.json";

// Интерфейс только на русском языке.
i18n
  .use(initReactI18next)
  .init({
    resources: { ru: { translation: ru } },
    lng: "ru",
    fallbackLng: "ru",
    supportedLngs: ["ru"],
    interpolation: { escapeValue: false },
  });

document.documentElement.lang = "ru";

export default i18n;
