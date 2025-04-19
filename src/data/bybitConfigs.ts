import { BybitClientConfig } from "../utils/bybit";

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
