// Environment variables utilities for renderer process

// Vite exposes environment variables through import.meta.env
// These types are extended in types/vite-env.d.ts

const getEnv = (key: keyof ImportMetaEnv, defaultValue: string = ''): string => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
};

const getEnvNumber = (key: keyof ImportMetaEnv, defaultValue: number = 0): number => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvBoolean = (key: keyof ImportMetaEnv, defaultValue: boolean = false): boolean => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === '1';
};

export const env = {
  api: {
    baseUrl: getEnv('VITE_API_BASE_URL', '/api'),
    timeout: getEnvNumber('VITE_API_TIMEOUT', 30000),
  },
  app: {
    name: getEnv('VITE_APP_NAME', '法律文书智能生成器'),
    version: getEnv('VITE_APP_VERSION', '1.0.0'),
  },
  features: {
    logging: getEnvBoolean('VITE_ENABLE_LOGGING', true),
  },
};

export type Env = typeof env;
