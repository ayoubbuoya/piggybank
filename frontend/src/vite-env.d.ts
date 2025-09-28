/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SMART_CONTRACT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}