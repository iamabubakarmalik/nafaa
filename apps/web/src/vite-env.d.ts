/// <reference types="vite/client" />

declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.svg' {
  const content: string;
  export default content;
}
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
