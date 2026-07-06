import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/croo_hub'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
  },
  croo: {
    apiUrl: process.env.CROO_API_URL ?? 'https://api.croo.network',
    wsUrl: process.env.CROO_WS_URL ?? 'wss://api.croo.network/ws',
    sdkKey: process.env.CROO_SDK_KEY ?? '',
    rpcUrl: process.env.CROO_RPC_URL ?? 'https://mainnet.base.org',
    get isConfigured() {
      return this.sdkKey.length > 0;
    },
  },
  isProduction: process.env.NODE_ENV === 'production',
};
