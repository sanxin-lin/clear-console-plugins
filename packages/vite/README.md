## 安装

```ts
// npm
npm i vite-perfect-console-plugin
// yarn
yarn add vite-perfect-console-plugin
// pnpm
pnpm i vite-perfect-console-plugin
```

## 使用

```ts
// vite.config.ts

import VitePerfectConsolePlugin from 'vite-perfect-console-plugin'

defineConfig({
  plugins: [
    //...plugins
    // tip 默认是 🐷🐷🐷🐷🐷🐷
    VitePerfectConsolePlugin({ tip: '🐷🐷🐷🐷🐷🐷' }),
  ],
})
```

## 效果

![](https://files.mdnice.com/user/23686/9b8ade75-39a8-40a6-b219-8e9b64ede039.png)
