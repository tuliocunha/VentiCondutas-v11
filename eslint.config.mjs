// Configuração ESLint do VentiCondutas (npm run lint)
import globals from "globals";
import js from "@eslint/js";

export default [
  { ignores: ["**/*.bak", "node_modules/**", "exemplos/**", "tests/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js", "conhecimento/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, XLSX: "readonly", jspdf: "readonly", VC: "writable", VC6: "writable" }
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "no-empty": "off",
      "no-prototype-builtins": "off",
      "no-inner-declarations": "off",
      "no-useless-escape": "off",
      "no-misleading-character-class": "off",
      "no-irregular-whitespace": "off"
    }
  },
  {
    files: ["tools/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: { ...globals.node, ...globals.browser, VC: "readonly", VC6: "readonly", XLSX: "readonly" } }
  }
];
