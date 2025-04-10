import axios, { AxiosInstance } from "axios";
import crypto from "crypto";

// Interface for the Bybit client
export interface BybitClient {
  axiosInstance: AxiosInstance;
  apiKey: string;
  apiSecret: string;
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

// Initialize Bybit API client
export const initBybitClient = (
  apiKey: string,
  apiSecret: string,
  baseUrl: string
): BybitClient => {
  // Create axios instance for Bybit testnet
  const axiosInstance = axios.create({
    baseURL: baseUrl,
    headers: {
      "X-BAPI-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
  });

  // Return client object with properties and methods
  return {
    axiosInstance,
    apiKey,
    apiSecret,
    submitOrder: async (params: any) => {
      return await submitOrder(axiosInstance, apiKey, apiSecret, params);
    },
    getPositionData: async (params: { symbol: string; category: string }) => {
      const response = await getPositionInfo(axiosInstance, apiKey, apiSecret, {
        category: "linear",
        symbol: params.symbol,
      });

      if (response.retCode !== 0) {
        throw new Error(response.retMsg || "Failed to get position data");
      }

      const position = response.result.list.find(
        (p: any) => p.symbol === params.symbol
      );
      if (!position) {
        throw new Error("No position found for symbol");
      }

      return {
        entryPrice: position.avgPrice,
        markPrice: position.markPrice,
        size: position.size,
        leverage: position.leverage,
      };
    },

    getMarketData: async (params: { symbol: string; category: string }) => {
      const response = await getMarketTickers(
        axiosInstance,
        apiKey,
        apiSecret,
        {
          category: "linear",
          symbol: params.symbol,
        }
      );

      if (response.retCode !== 0) {
        throw new Error(response.retMsg || "Failed to get market data");
      }

      const ticker = response.result.list.find(
        (t: any) => t.symbol === params.symbol
      );
      if (!ticker) {
        throw new Error("No market data found for symbol");
      }

      return {
        lastPrice: ticker.lastPrice,
        highPrice: ticker.highPrice24h,
        lowPrice: ticker.lowPrice24h,
        volume: ticker.volume24h,
        fundingRate: ticker.fundingRate,
      };
    },
  };
};

// Generate signature for Bybit API authentication
// Helper to create properly sorted query string
const getQueryString = (params: any): string => {
  return Object.keys(params)
    .sort()
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    )
    .join("&");
};

const generateSignature = (
  apiKey: string,
  apiSecret: string,
  timestamp: string,
  payload: string
): string => {
  return crypto
    .createHmac("sha256", apiSecret)
    .update(timestamp + apiKey + recvWindow + payload)
    .digest("hex");
};

// Default recv window for API requests
const recvWindow = "5000";

// Generic API request handler
export const handleApiRequest = async (
  axiosInstance: AxiosInstance,
  apiKey: string,
  apiSecret: string,
  endpoint: string,
  method: "GET" | "POST",
  params: any
): Promise<any> => {
  try {
    const timestamp = Date.now().toString();
    let payload: string;
    let queryString = "";

    if (method === "POST") {
      payload = JSON.stringify(params);
    } else {
      queryString = getQueryString(params);
      payload = queryString;
    }

    const signature = generateSignature(apiKey, apiSecret, timestamp, payload);

    const requestConfig = {
      headers: {
        "X-BAPI-API-KEY": apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": recvWindow,
        "X-BAPI-SIGN": signature,
      },
    };

    let response;
    if (method === "POST") {
      response = await axiosInstance.post(endpoint, payload, requestConfig);
    } else {
      response = await axiosInstance.get(
        `${endpoint}?${queryString}`,
        requestConfig
      );
    }

    // Return response in the same format as bybit-api
    return {
      retCode: response.data.retCode,
      retMsg: response.data.retMsg,
      result: response.data.result,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        retCode: error.response.data.retCode || -1,
        retMsg: error.response.data.retMsg || error.message,
        result: {},
      };
    }

    return {
      retCode: -1,
      retMsg: error instanceof Error ? error.message : "Unknown error",
      result: {},
    };
  }
};

// Submit order to Bybit API
const submitOrder = async (
  axiosInstance: AxiosInstance,
  apiKey: string,
  apiSecret: string,
  params: any
): Promise<any> => {
  return handleApiRequest(
    axiosInstance,
    apiKey,
    apiSecret,
    "/v5/order/create",
    "POST",
    params
  );
};

export const getMarketTickers = async (
  axiosInstance: AxiosInstance,
  apiKey: string,
  apiSecret: string,
  params: any
): Promise<any> => {
  return handleApiRequest(
    axiosInstance,
    apiKey,
    apiSecret,
    "/v5/market/tickers",
    "GET",
    { category: "linear", symbol: params.symbol }
  );
};

export const getPositionInfo = async (
  axiosInstance: AxiosInstance,
  apiKey: string,
  apiSecret: string,
  params: any
): Promise<any> => {
  try {
    const endpointPosition = "/v5/position/list";
    const timestamp = Date.now().toString();
    // For GET requests, create sorted/encoded query string
    const queryString = getQueryString(params);
    const signature = generateSignature(
      apiKey,
      apiSecret,
      timestamp,
      queryString
    );

    const response = await axiosInstance.get(
      `${endpointPosition}?${queryString}`,
      {
        headers: {
          "X-BAPI-API-KEY": apiKey,
          "X-BAPI-TIMESTAMP": timestamp,
          "X-BAPI-RECV-WINDOW": recvWindow,
          "X-BAPI-SIGN": signature,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        retCode: error.response.data.retCode || -1,
        retMsg: error.response.data.retMsg || error.message,
        result: {},
      };
    }
    return {
      retCode: -1,
      retMsg: error instanceof Error ? error.message : "Unknown error",
      result: {},
    };
  }
};

/**
 * Convert a comma-separated string to a JSON object for Bybit API
 * Expected format: "symbol,side,orderType,qty,price,timeInForce,..."
 *
 * @param csvString - Comma-separated string with order parameters
 * @returns FuturesOrderParams object
 */
export const parseOrderString = (csvString: string): FuturesOrderParams => {
  // Split the string by comamas
  const parts = csvString.split(",").map((part) => part.trim());

  // Create the base order parameters
  const orderParams: FuturesOrderParams = {
    symbol: parts[0] || "",
    side: (parts[1] as "Buy" | "Sell") || "Buy",
    orderType: (parts[2] as "Market" | "Limit") || "Market",
    qty: parts[3] || "0",
  };

  // Add optional parameters if provided
  if (parts[4] && parts[4] !== "") orderParams.price = parts[4];
  if (parts[5] && parts[5] !== "") orderParams.timeInForce = parts[5];
  if (parts[6] && parts[6] !== "")
    orderParams.positionIdx = parseInt(parts[6], 10);
  if (parts[7] && parts[7] !== "")
    orderParams.reduceOnly = parts[7].toLowerCase() === "true";
  if (parts[8] && parts[8] !== "")
    orderParams.closeOnTrigger = parts[8].toLowerCase() === "true";
  if (parts[9] && parts[9] !== "") orderParams.takeProfit = parts[9];
  if (parts[10] && parts[10] !== "") orderParams.stopLoss = parts[10];
  if (parts[11] && parts[11] !== "") orderParams.tpTriggerBy = parts[11];
  if (parts[12] && parts[12] !== "") orderParams.slTriggerBy = parts[12];
  if (parts[13] && parts[13] !== "") orderParams.orderLinkId = parts[13];

  return orderParams;
};

// Interface for futures order parameters
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

/**
 * Place a futures order on Bybit
 *
 * @param client - Initialized Bybit API client
 * @param params - Order parameters
 * @returns Promise with the order result
 */
// Close current position and prepare for new position
export const cancelOppositeOrders = async (
  client: BybitClient,
  symbol: string,
  newOrderSide: "Buy" | "Sell"
): Promise<{ success: boolean; message: string }> => {
  try {
    // Get current position for the symbol
    const response = await handleApiRequest(
      client.axiosInstance,
      client.apiKey,
      client.apiSecret,
      "/v5/position/list",
      "GET",
      {
        category: "linear",
        symbol: symbol,
      }
    );

    if (response.retCode !== 0) {
      throw new Error(response.retMsg || "Failed to fetch positions");
    }

    // Find existing position
    const currentPosition = response.result.list.find(
      (pos: any) => pos.symbol === symbol && Math.abs(parseFloat(pos.size)) > 0
    );

    if (!currentPosition) {
      return { success: true, message: "No existing position to close" };
    }

    // Close the current position with a market order
    const closeResponse = await handleApiRequest(
      client.axiosInstance,
      client.apiKey,
      client.apiSecret,
      "/v5/order/create",
      "POST",
      {
        category: "linear",
        symbol: symbol,
        side: currentPosition.side === "Buy" ? "Sell" : "Buy",
        orderType: "Market",
        qty: currentPosition.size,
        reduceOnly: true,
      }
    );

    if (closeResponse.retCode !== 0) {
      throw new Error(closeResponse.retMsg || "Failed to close position");
    }

    // Add a small delay to ensure the position is closed before new orders
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      message: `Successfully closed ${currentPosition.side} position of ${currentPosition.size} ${symbol}`,
    };
  } catch (error) {
    console.error("Error in cancelOppositeOrders:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const placeFuturesOrder = async (
  client: BybitClient,
  params: FuturesOrderParams
) => {
  try {
    // Prepare order parameters
    const orderParams: any = {
      category: "linear", // For USDT perpetual futures
      symbol: params.symbol,
      side: params.side,
      orderType: params.orderType,
      qty: params.qty,
    };
    console.log(params.side);

    // Get position data for TP/SL calculation
    const positionData = await client.getPositionData({
      category: "linear",
      symbol: params.symbol,
    });
    const marketData = await client.getMarketData({
      category: "linear",
      symbol: params.symbol,
    });
    // Add optional parameters if provided
    if (params.price && params.orderType === "Limit") {
      orderParams.price = params.price;
    }

    if (params.timeInForce) {
      orderParams.timeInForce = params.timeInForce;
    } else if (params.orderType === "Limit") {
      orderParams.timeInForce = "GTC"; // Good Till Cancelled
    }

    if (params.positionIdx !== undefined) {
      orderParams.positionIdx = params.positionIdx;
    }

    if (params.reduceOnly !== undefined) {
      orderParams.reduceOnly = params.reduceOnly;
    } else {
      params.reduceOnly = true;
    }

    if (params.closeOnTrigger !== undefined) {
      orderParams.closeOnTrigger = params.closeOnTrigger;
    }

    // Take Profit calculation using position data
    if (positionData && marketData && params.takeProfit) {
      const entryPrice = parseFloat(positionData.entryPrice);
      const markPrice = parseFloat(marketData?.lastPrice);
      const tpPercent = Number(params.takeProfit) / 100;
      if (entryPrice > 0) {
        orderParams.takeProfit =
          params.side === "Buy"
            ? (entryPrice * (1 + tpPercent)).toFixed(5)
            : (entryPrice * (1 - tpPercent)).toFixed(5);
      } else {
        orderParams.takeProfit =
          params.side === "Buy"
            ? (markPrice * (1 + tpPercent)).toFixed(5)
            : (markPrice * (1 - tpPercent)).toFixed(5);
      }
    }

    // Stop Loss calculation using position data
    if (positionData && marketData && params.stopLoss) {
      const entryPrice = parseFloat(positionData.entryPrice);
      const markPrice = parseFloat(marketData?.lastPrice);
      const slPercent = Number(params.stopLoss) / 100;
      if (entryPrice > 0) {
        orderParams.stopLoss =
          params.side === "Buy"
            ? (entryPrice * (1 - slPercent)).toFixed(5)
            : (entryPrice * (1 + slPercent)).toFixed(5);
      } else {
        orderParams.stopLoss =
          params.side === "Buy"
            ? (markPrice * (1 - slPercent)).toFixed(5)
            : (markPrice * (1 + slPercent)).toFixed(5);
      }
    }

    if (params.tpTriggerBy) {
      orderParams.tpTriggerBy = params.tpTriggerBy;
    }

    if (params.slTriggerBy) {
      orderParams.slTriggerBy = params.slTriggerBy;
    }

    if (params.orderLinkId) {
      orderParams.orderLinkId = params.orderLinkId;
    }
    console.log(orderParams);
    // Submit the order
    const response = await client.submitOrder(orderParams);

    // Check if the order was successful
    if (response.retCode === 0) {
      return {
        success: true,
        data: response.result,
        message: "Order placed successfully",
      };
    } else {
      return {
        success: false,
        error: response.retMsg,
        code: response.retCode,
      };
    }
  } catch (error) {
    // Handle any API errors
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
