import { RestClientV5 } from "bybit-api";

// Initialize Bybit API client
export const initBybitClient = (apiKey: string, apiSecret: string) => {
  return new RestClientV5({
    key: apiKey,
    secret: apiSecret,
    testnet: false, // Set to true for testnet
  });
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
  client: RestClientV5,
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
