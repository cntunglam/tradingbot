import { AxiosInstance } from "axios";

// Helper function to create a config if all required values are present
const createConfig = (index: number): BybitClientConfig | null => {
  const apiKey = process.env[`BYBIT_API_KEY_${index}`];
  const apiSecret = process.env[`BYBIT_API_SECRET_${index}`];
  const baseUrl = process.env[`BASE_URL_${index}`];

  // Return null if any required value is missing or null
  if (
    !apiKey ||
    !apiSecret ||
    !baseUrl ||
    apiKey === "null" ||
    apiSecret === "null" ||
    baseUrl === "null"
  ) {
    return null;
  }

  return {
    apiKey,
    apiSecret,
    baseUrl,
    name: `bybit${index}`,
  };
};

// Generate configs for 10 possible instances
const configs: (BybitClientConfig | null)[] = Array.from(
  { length: 10 },
  (_, i) => createConfig(i + 1)
);

// Filter out null configs
export const bybitConfigs: BybitClientConfig[] = configs.filter(
  (config): config is BybitClientConfig => config !== null
);

export interface FuturesOrderParams {
  symbol: string; // Trading pair symbol (e.g., 'BTCUSDT')
  side: "Buy" | "Sell"; // Order side
  orderType: "Market" | "Limit"; // Order type
  qty: string; // Order quantity
  price?: string; // Order price (required for Limit orders)
  timeInForce?: string; // Time in force (e.g., 'GTC', 'IOC', 'FOK')
  positionIdx?: number; // Position index (0: one-way mode, 1: hedge mode buy side, 2: hedge mode sell side)
  reduceOnly?: boolean; // Whether to close position only
  closeOnTrigger?: boolean; // Whether to close position on trigger
  takeProfit?: string; // Take profit price
  stopLoss?: string; // Stop loss price
  tpTriggerBy?: string; // Take profit trigger price type
  slTriggerBy?: string; // Stop loss trigger price type
  orderLinkId?: string; // Custom order ID
}

export interface BybitClientConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  name: string;
}

export interface BybitClient {
  axiosInstance: AxiosInstance;
  apiKey: string;
  apiSecret: string;
  name: string;
  submitOrder: (params: any) => Promise<any>;
  getPositionData: (params: { symbol: string; category: string }) => Promise<{
    entryPrice: string;
    markPrice: string;
    size: string;
    leverage: string;
  } | null>;
  getMarketData: (params: { symbol: string; category: string }) => Promise<{
    lastPrice: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    fundingRate: string;
  } | null>;
}
