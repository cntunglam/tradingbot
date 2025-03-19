import axios from "axios";

/**
 * Example script to demonstrate triggering the webhook to place a futures order
 *
 * To run this example:
 * 1. Make sure the server is running (npm run dev)
 * 2. Set the BYBIT_API_KEY and BYBIT_API_SECRET environment variables on the server
 * 3. Run this script with: npx ts-node src/examples/place-futures-order.ts
 */

// Webhook endpoint (adjust if your server is running on a different port)
const WEBHOOK_URL = "http://localhost:3001/webhook";

// Example 1: Market order using comma-separated string
// Format: symbol,side,orderType,qty,price,timeInForce,positionIdx,reduceOnly,closeOnTrigger,takeProfit,stopLoss,tpTriggerBy,slTriggerBy,orderLinkId
const marketOrderString = "BTCUSDT,Buy,Market,0.001";

// Example 2: Limit order using comma-separated string
const limitOrderString = "BTCUSDT,Buy,Limit,0.001,30000,GTC";

// Example 3: Market order using JSON format
const marketOrderJson = {
  symbol: "BTCUSDT",
  side: "Buy",
  orderType: "Market",
  qty: "0.001", // Minimum quantity for BTC
};

// Example 4: Limit order using JSON format
const limitOrderJson = {
  symbol: "BTCUSDT",
  side: "Buy",
  orderType: "Limit",
  qty: "0.001", // Minimum quantity for BTC
  price: "30000", // Limit price
  timeInForce: "GTC", // Good Till Cancelled
};

/**
 * Trigger webhook to place a futures order
 */
async function triggerWebhook(orderParams: any) {
  try {
    // Log based on input type
    if (typeof orderParams === "string") {
      console.log("Triggering webhook with order string:", orderParams);
    } else {
      console.log(
        `Triggering webhook to place ${orderParams.orderType} order for ${orderParams.symbol}...`
      );
    }

    const response = await axios.post(WEBHOOK_URL, orderParams);

    console.log("Webhook response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error triggering webhook:", error.response.data);
    } else {
      console.error("Error:", error);
    }
    throw error;
  }
}

/**
 * Main function to run the example
 */
async function main() {
  try {
    // Uncomment one of these examples to test

    // Example 1: Trigger webhook with market order (string format)
    console.log("\nExample 1: Market order using string format");
    await triggerWebhook(marketOrderString);

    // Example 2: Trigger webhook with limit order (string format)
    // console.log("\nExample 2: Limit order using string format");
    // await triggerWebhook(limitOrderString);

    // Example 3: Trigger webhook with market order (JSON format)
    // console.log("\nExample 3: Market order using JSON format");
    // await triggerWebhook(marketOrderJson);

    // Example 4: Trigger webhook with limit order (JSON format)
    // console.log("\nExample 4: Limit order using JSON format");
    // await triggerWebhook(limitOrderJson);

    console.log("Example completed successfully");
  } catch (error) {
    console.error("Example failed with error");
  }
}

// Run the example
main();
