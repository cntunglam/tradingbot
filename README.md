# DemoWebhook with Bybit Futures Trading Integration

A simple Express.js server with a webhook endpoint that triggers Bybit futures orders when called.

## Features

- Webhook endpoint that automatically places Bybit futures orders when triggered
- Complete integration with Bybit API for futures trading
- TypeScript support for better type safety and developer experience

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Bybit API credentials (API key and secret)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the TypeScript code:

```bash
npm run build
```

## Configuration

Set the following environment variables:

- `PORT`: Server port (default: 3001)
- `BYBIT_API_KEY`: Your Bybit API key
- `BYBIT_API_SECRET`: Your Bybit API secret

You can set these environment variables in a `.env` file (not included in this repository for security reasons) or directly in your environment.

Example `.env` file:

```
PORT=3001
BYBIT_API_KEY=your_api_key_here
BYBIT_API_SECRET=your_api_secret_here
```

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## API Endpoints

### Webhook Endpoint

```
POST /webhook
```

Receives webhook payloads, processes them, and places a Bybit futures order based on the payload content.

#### Request Body Parameters

| Parameter      | Type    | Required               | Description                                                                       |
| -------------- | ------- | ---------------------- | --------------------------------------------------------------------------------- |
| symbol         | string  | Yes                    | Trading pair symbol (e.g., 'BTCUSDT')                                             |
| side           | string  | Yes                    | Order side ('Buy' or 'Sell')                                                      |
| orderType      | string  | Yes                    | Order type ('Market' or 'Limit')                                                  |
| qty            | string  | Yes                    | Order quantity                                                                    |
| price          | string  | Yes (for Limit orders) | Order price                                                                       |
| timeInForce    | string  | No                     | Time in force (e.g., 'GTC', 'IOC', 'FOK')                                         |
| positionIdx    | number  | No                     | Position index (0: one-way mode, 1: hedge mode buy side, 2: hedge mode sell side) |
| reduceOnly     | boolean | No                     | Whether to close position only                                                    |
| closeOnTrigger | boolean | No                     | Whether to close position on trigger                                              |
| takeProfit     | string  | No                     | Take profit price                                                                 |
| stopLoss       | string  | No                     | Stop loss price                                                                   |
| tpTriggerBy    | string  | No                     | Take profit trigger price type                                                    |
| slTriggerBy    | string  | No                     | Stop loss trigger price type                                                      |
| orderLinkId    | string  | No                     | Custom order ID                                                                   |

#### Webhook Payload Format (Market Order)

```json
{
  "symbol": "BTCUSDT",
  "side": "Buy",
  "orderType": "Market",
  "qty": "0.001"
}
```

#### Webhook Payload Format (Limit Order)

```json
{
  "symbol": "BTCUSDT",
  "side": "Buy",
  "orderType": "Limit",
  "qty": "0.001",
  "price": "30000",
  "timeInForce": "GTC"
}
```

#### Webhook Response (Success)

```json
{
  "status": "success",
  "message": "Webhook received and order placed successfully",
  "orderResult": {
    "success": true,
    "data": {
      "orderId": "1234567890",
      "symbol": "BTCUSDT",
      "side": "Buy",
      "orderType": "Market",
      "price": "0",
      "qty": "0.001",
      "timeInForce": "GTC",
      "orderStatus": "Created",
      "createTime": "1633517746000",
      "orderLinkId": ""
    },
    "message": "Order placed successfully"
  }
}
```

#### Webhook Response (Error)

```json
{
  "status": "error",
  "message": "Webhook received but order placement failed",
  "orderResult": {
    "success": false,
    "error": "API keys not configured. Please set BYBIT_API_KEY and BYBIT_API_SECRET environment variables."
  }
}
```

## Example Usage

Check the `src/examples` directory for example scripts demonstrating how to trigger the webhook.

To run the example script:

```bash
# Make sure the server is running with API keys configured
npm run dev

# In a separate terminal, run the example script
npx ts-node src/examples/place-futures-order.ts
```

You can also trigger the webhook from any external system by sending a POST request to the webhook endpoint with the appropriate payload.

### Using cURL

```bash
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "Buy",
    "orderType": "Market",
    "qty": "0.001"
  }'
```

### Using a Trading Platform

You can configure your trading platform (like TradingView, MetaTrader, etc.) to send alerts to this webhook with the appropriate JSON payload to automatically execute trades based on your trading signals.

## Development

### Project Structure

- `src/index.ts`: Main application file with Express server and webhook handler
- `src/utils/bybit.ts`: Bybit API client and utility functions
- `src/examples/`: Example scripts demonstrating webhook usage

### Available Scripts

- `npm run build`: Build the TypeScript code
- `npm start`: Run the built application
- `npm run dev`: Run the application in development mode with hot reloading

## License

ISC
