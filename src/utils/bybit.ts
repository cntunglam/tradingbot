import axios, { AxiosInstance } from "axios";
import crypto from "crypto";

// Interface for the Bybit client
export interface BybitClient {
  submitOrder: (params: any) => Promise<any>;
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

  // Return client object with methods
  return {
    submitOrder: async (params: any) => {
      return await submitOrder(axiosInstance, apiKey, apiSecret, params);
    },
  };
};

// Generate signature for Bybit API authentication
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

// Submit order to Bybit API
const submitOrder = async (
  axiosInstance: AxiosInstance,
  apiKey: string,
  apiSecret: string,
  params: any
): Promise<any> => {
  try {
    const endpoint = "/v5/order/create";
    const timestamp = Date.now().toString();

    // Create request payload
    const payload = JSON.stringify(params);

    // Generate signature
    const signature = generateSignature(apiKey, apiSecret, timestamp, payload);

    // Make API request
    const response = await axiosInstance.post(endpoint, payload, {
      headers: {
        "X-BAPI-API-KEY": apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": recvWindow,
        "X-BAPI-SIGN": signature,
      },
    });

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

/**
 * Convert a comma-separated string to a JSON object for Bybit API
 * Expected format: "symbol,side,orderType,qty,price,timeInForce,..."
 *
 * @param csvString - Comma-separated string with order parameters
 * @returns FuturesOrderParams object
 */
export const parseOrderString = (csvString: string): FuturesOrderParams => {
  // Split the string by commas
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

    // Add optional parameters if provided
    if (params.price && params.orderType === "Limit") {
      orderParams.price = params.price;
    }

    if (params.timeInForce) {
      orderParams.timeInForce = params.timeInForce;
    } else if (params.orderType === "Limit") {
      // Default time in force for limit orders
      orderParams.timeInForce = "GTC"; // Good Till Cancelled
    }

    if (params.positionIdx !== undefined) {
      orderParams.positionIdx = params.positionIdx;
    }

    if (params.reduceOnly !== undefined) {
      orderParams.reduceOnly = params.reduceOnly;
    }

    if (params.closeOnTrigger !== undefined) {
      orderParams.closeOnTrigger = params.closeOnTrigger;
    }

    if (params.takeProfit) {
      orderParams.takeProfit = params.takeProfit;
    }

    if (params.stopLoss) {
      orderParams.stopLoss = params.stopLoss;
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
