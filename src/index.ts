import express, { Request, Response } from "express";
import {
  initBybitClient,
  placeFuturesOrder,
  parseOrderString,
  cancelOppositeOrders,
} from "./utils/bybit";
import "dotenv/config";
import { bybitConfigs, FuturesOrderParams } from "./data/bybitConfigs";
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware for parsing JSON and urlencoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
// Environment variables for multiple Bybit clients
app.post("/webhook", (req: Request, res: Response) => {
  console.log("Received webhook payload:", req.body);

  // Process the webhook and place a Bybit futures order
  (async () => {
    try {
      // Filter out configs with null values and get valid configs
      const validConfigs = bybitConfigs.filter(
        (config) =>
          config.apiKey !== null &&
          config.apiSecret !== null &&
          config.baseUrl !== null &&
          config.apiKey !== "" &&
          config.apiSecret !== "" &&
          config.baseUrl !== ""
      );

      if (validConfigs.length === 0) {
        console.error("No valid API configurations found");
        return res.status(500).json({
          success: false,
          error: "No valid API configurations available",
        });
      }

      console.log(`Found ${validConfigs.length} valid API configurations`);

      let orderParams: FuturesOrderParams;

      // Handle string input (either from text/plain or orderString field)
      if (
        req.headers["content-type"]?.includes("text/plain") ||
        typeof req.body === "string" ||
        req.body.orderString
      ) {
        const orderString = req.headers["content-type"]?.includes("text/plain")
          ? req.body
          : req.body.orderString || req.body;
        console.log("Received order string:", orderString);

        // Parse the comma-separated string into order parameters
        orderParams = parseOrderString(orderString as string);

        console.log("Parsed order parameters:", orderParams);
      } else {
        // Extract order parameters from the webhook payload (JSON format)
        const {
          symbol,
          side,
          orderType,
          qty,
          price,
          timeInForce,
          positionIdx,
          reduceOnly,
          closeOnTrigger,
          takeProfit,
          stopLoss,
          tpTriggerBy,
          slTriggerBy,
          orderLinkId,
        } = req.body;

        // Validate required parameters
        if (!symbol || !side || !orderType || !qty) {
          console.error("Missing required parameters in webhook payload");
          return res.status(400).json({
            success: false,
            error:
              "Missing required parameters. Please provide symbol, side, orderType, and qty.",
          });
        }

        // Validate order type and price
        if (orderType === "Limit" && !price) {
          console.error("Price is required for Limit orders");
          return res.status(400).json({
            success: false,
            error: "Price is required for Limit orders.",
          });
        }

        // Prepare order parameters
        orderParams = {
          symbol,
          side,
          orderType,
          qty,
        };

        // Add optional parameters if provided
        if (price) orderParams.price = price;
        if (timeInForce) orderParams.timeInForce = timeInForce;
        if (positionIdx !== undefined) orderParams.positionIdx = positionIdx;
        if (reduceOnly !== undefined) orderParams.reduceOnly = reduceOnly;
        if (closeOnTrigger !== undefined)
          orderParams.closeOnTrigger = closeOnTrigger;
        if (takeProfit) orderParams.takeProfit = takeProfit;
        if (stopLoss) orderParams.stopLoss = stopLoss;
        if (tpTriggerBy) orderParams.tpTriggerBy = tpTriggerBy;
        if (slTriggerBy) orderParams.slTriggerBy = slTriggerBy;
        if (orderLinkId) orderParams.orderLinkId = orderLinkId;
      }

      // Validate the required parameters are present after parsing
      if (
        !orderParams.symbol ||
        !orderParams.side ||
        !orderParams.orderType ||
        !orderParams.qty
      ) {
        console.error("Missing required parameters after parsing");
        return res.status(400).json({
          success: false,
          error: "Missing required parameters after parsing the input.",
        });
      }

      // Validate order type and price for parsed parameters
      if (orderParams.orderType === "Limit" && !orderParams.price) {
        console.error("Price is required for Limit orders");
        return res.status(400).json({
          success: false,
          error: "Price is required for Limit orders.",
        });
      }

      // Initialize only valid Bybit clients
      const clients = validConfigs.map((config) => initBybitClient(config));

      // Process orders in parallel for all clients
      const orderPromises = clients.map(async (client) => {
        try {
          // First try to close any existing position
          console.log(
            `[${client.name}] Checking for existing positions to close...`
          );
          const cancelRes = await cancelOppositeOrders(
            client,
            orderParams.symbol,
            orderParams.side
          );

          if (!cancelRes.success) {
            console.error(
              `[${client.name}] Failed to close existing position:`,
              cancelRes.message
            );
            return {
              client: client.name,
              success: false,
              error: cancelRes.message,
            };
          }

          console.log(`[${client.name}] ${cancelRes.message}`);

          // Place the new order
          console.log(
            `[${client.name}] Placing ${orderParams.orderType} order for ${orderParams.symbol}...`
          );
          const orderResult = await placeFuturesOrder(client, orderParams);

          // Log and return the result
          console.log(`[${client.name}] Order result:`, orderResult);

          return {
            client: client.name,
            ...orderResult,
          };
        } catch (error) {
          console.error(`[${client.name}] Error processing order:`, error);
          return {
            client: client.name,
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      });

      // Wait for all orders to complete
      const results = await Promise.all(orderPromises);

      // Check if any orders were successful
      const anySuccess = results.some((result) => result.success);

      if (anySuccess) {
        return res.status(200).json({
          status: "success",
          message: "Webhook processed with some successful orders",
          results,
        });
      } else {
        return res.status(400).json({
          status: "error",
          message: "All orders failed",
          results,
        });
      }
    } catch (error) {
      console.error(
        "Error processing webhook and placing Bybit futures order:",
        error
      );
      return res.status(500).json({
        status: "error",
        message: "Error processing webhook",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  })();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
