## 安装

```ts
// npm
npm i babel-plugin-perfect-console
// yarn
yarn add babel-plugin-perfect-console
// pnpm
pnpm i babel-plugin-perfect-console
```

## 使用

```ts
// babel.config.js

module.exports = {
  plugins: [
    // ...plugins
    [
      'perfect-console',
      // tip 默认是 🐷🐷🐷🐷🐷🐷
      {
        tip: '🐷🐷🐷🐷🐷🐷',
      },
    ],
  ],
}
```

## 效果

![](https://files.mdnice.com/user/23686/9b8ade75-39a8-40a6-b219-8e9b64ede039.png)
