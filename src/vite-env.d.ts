/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_CHAT_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module '*.vue' {
    import type { DefineComponent } from 'vue';

    const component: DefineComponent<{}, {}, any>;
    export default component;
}

declare module "*.json" {
    const value: any;
    export default value;
}

declare module "*.jsonl?raw" {
    const value: string;
    export default value;
}
