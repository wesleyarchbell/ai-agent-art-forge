# ETH Trading AI Agent Chatbot

This project demonstrates an AI trading agent built using Coinbase's CDP AgentKit, specifically focused on ETH trading capabilities.

## Features

- Trade ETH onchain using Coinbase Developer Platform AgentKit
- Interactive chatbox interface for trading commands
- Real-time ETH price checking
- ETH balance monitoring
- Automated trading decisions based on user input

## Example Commands

- "What's the current price of ETH?"
- "Check my ETH balance"
- "Execute a trade of 0.1 ETH"
- "Monitor ETH price movements"

## Requirements

- Node.js 18+
- [CDP API Key](https://portal.cdp.coinbase.com/access/api)
- [OpenAI API Key](https://platform.openai.com/docs/quickstart#create-and-export-an-api-key)

### Checking Node Version

Before using the example, ensure that you have the correct version of Node.js installed. The example requires Node.js 18 or higher. You can check your Node version by running:

```bash
node --version
npm --version
```

## Installation

```bash
npm install
```

## Configuration

### Set Environment Variables

Create a `.env` file with the following variables:
- CDP_API_KEY_NAME
- CDP_API_KEY_PRIVATE_KEY
- OPENAI_API_KEY
- NETWORK_ID (Defaults to `base-sepolia`)

## Running the Trading Agent

```bash
npm start
```

## Development

To run in development mode with auto-reload:
```bash
npm run dev
```

## License

Apache-2.0
