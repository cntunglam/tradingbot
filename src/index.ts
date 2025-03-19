import express, { Request, Response } from "express";
import {
  initBybitClient,
  placeFuturesOrder,
  parseOrderString,
  FuturesOrderParams,
} from "./utils/bybit";
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware for parsing JSON and urlencoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
// Environment variables for API keys (should be set in production environment)
const BYBIT_API_KEY = process.env.BYBIT_API_KEY || "5eOiL3UHTvzMNZIeJk";
const BYBIT_API_SECRET =
  process.env.BYBIT_API_SECRET || "eKeWOdh5nAoDA5HGz4JcmbHdI1sPJQANxxg6";
app.post("/webhook", (req: Request, res: Response) => {
  console.log("Received webhook payload:", req.body);

  // Process the webhook and place a Bybit futures order
  (async () => {
    try {
      // Check if API keys are configured
      if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
        console.error(
          "API keys not configured. Please set BYBIT_API_KEY and BYBIT_API_SECRET environment variables."
        );
        return res.status(500).json({
          success: false,
          error:
            "API keys not configured. Please set BYBIT_API_KEY and BYBIT_API_SECRET environment variables.",
        });
      }

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

      // Initialize Bybit client
      const client = initBybitClient(BYBIT_API_KEY, BYBIT_API_SECRET);

      // Place the order
      console.log(
        `Placing ${orderParams.orderType} order for ${orderParams.symbol}...`
      );
      const orderResult = await placeFuturesOrder(client, orderParams);

      // Log and return the result
      console.log("Order result:", orderResult);

      if (orderResult.success) {
        return res.status(200).json({
          status: "success",
          message: "Webhook received and order placed successfully",
          orderResult,
        });
      } else {
        return res.status(400).json({
          status: "error",
          message: "Webhook received but order placement failed",
          orderResult,
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
