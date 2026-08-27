/**
 * Minimal type declarations for WeChat Mini Program APIs.
 * This file allows TypeScript type-checking of page files that use wx.*
 * without requiring the full @types/miniprogram-api package.
 */

declare const wx: any;
declare const App: any;
declare const Page: any;
declare const Component: any;
declare const getApp: () => any;
declare const getCurrentPages: () => any[];

declare namespace WechatMiniprogram {
  interface PickerChange {
    detail: { value: string | number };
  }
}
