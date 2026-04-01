# КарПас (MVP‑прототип)

## Документация
- **Техническое задание (дополнение 0.4)**: см. файл `TZ.md` (раздел “Дополнения” помечен как ✅ ВЫПОЛНЕНО).

---

## Разработка (React + Vite)
Этот проект использует React + Vite для фронтенда.

Доступны два официальных плагина:
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) использует [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) использует [SWC](https://swc.rs/)

### React Compiler
React Compiler не включён в шаблоне из‑за влияния на производительность dev/build. Инструкция: https://react.dev/learn/react-compiler/installation

### ESLint/TypeScript
Для production‑приложений рекомендуется TypeScript с type-aware правилами. См. TS template: https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts
