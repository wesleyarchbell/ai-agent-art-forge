# AI NFT Creator & Promoter AI Agent

An autonomous AI agent that creates, publishes, and promotes NFT artwork using AI generation and social media integration.

## Features

- **AI Art Generation**
  - Creates unique artwork using DALL-E 3
  - Dynamic art styles and themes generation
  - SHA-256 based uniqueness verification
  - Optimized image processing (60%+ size reduction)

- **NFT Operations**
  - Automated NFT contract deployment on Base
  - Built-in CDP Agent Kit integration
  - Intelligent wallet management
  - Automated faucet fund requests

- **Marketplace Integration**
  - OpenSea API integration for analytics
  - Real-time sales tracking
  - Price monitoring and analysis
  - Ownership transfer tracking
  - Performance analytics reporting

- **Social Media Integration**
  - Automated Twitter posting of new NFT releases
  - Engagement with NFT community
  - Analytics tracking for social performance
  - Hashtag optimization

## Requirements

- Node.js v18 or higher
- OpenAI API key (for DALL-E and CDP Agent Kit)
- CDP Agent Kit credentials
- Twitter Developer API credentials 
- IPFS account (e.g., Pinata) 

## Environment Variables

Create a `.env` file with the following:

```env
# CDP Agent Kit Configuration
CDP_API_KEY_NAME=your_cdp_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_private_key

# OpenAI Configuration (for DALL-E and CDP Agent Kit)
OPENAI_API_KEY=your_openai_api_key

# Network Configuration
NETWORK_ID=base-sepolia  # or ethereum, base for mainnet

# Model Configuration
MODEL_NAME=gpt-4o-mini
```

## Installation

```bash
# Install dependencies
npm install

# Run the agent
npm start
```

## Modes

1. **Autonomous Mode**
   - Continuous NFT creation and minting
   - Automated art generation with DALL-E 3
   - Smart contract deployment and management
   - Marketplace monitoring and analytics

2. **Interactive Mode (Chat)**
   - Manual control over operations
   - Direct interaction with CDP Agent
   - Custom NFT deployment options
   - Real-time status monitoring

## Features in Development

- IPFS integration for decentralized storage
- Twitter integration for social promotion
- Advanced marketplace analytics
- Enhanced autonomous operations
- Safety features and rate limiting

## Technical Details

- **Art Generation**: Uses DALL-E 3 with dynamic prompts
- **Image Processing**: Sharp for optimization
- **Blockchain**: Base Sepolia testnet (upgradable to mainnet)
- **Smart Contracts**: CDP Agent Kit for deployment
- **Storage**: Local with IPFS integration coming soon

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for DALL-E and LLM capabilities
- Coinbase for CDP Agent Kit
- Base network for NFT infrastructure
- Sharp for image optimization
