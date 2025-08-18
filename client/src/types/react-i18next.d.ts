/**
 * TypeScript declarations for react-i18next
 * Override strict typing to allow flexible useTranslation usage
 */

declare module 'react-i18next' {
  interface UseTranslationOptions {
    keyPrefix?: string;
  }

  export function useTranslation(
    ns?: string | string[],
    options?: UseTranslationOptions
  ): {
    t: (key: string, options?: any) => string;
    i18n: any;
    ready: boolean;
  };
}
