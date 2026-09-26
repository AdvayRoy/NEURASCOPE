import next from "eslint-config-next";

const config = [
  ...next,
  {
    // Imperative three.js updates inside useFrame (textures, uniforms) are the idiomatic R3F pattern.
    files: ["src/components/brain/**/*.tsx"],
    rules: { "react-hooks/immutability": "off" },
  },
  {
    ignores: [".next/**", "node_modules/**", "public/**", "scripts/**", "test-results/**", "playwright-report/**", "next-env.d.ts"],
  },
];

export default config;
