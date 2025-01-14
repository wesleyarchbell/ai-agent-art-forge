# AI NFT Creator & Promoter

An autonomous AI agent that creates, publishes, and promotes NFT artwork using AI generation and social media integration.

## Features

- **AI Art Generation**
  - Creates unique artwork using stable diffusion or similar AI models
  - Generates varied art styles and themes
  - Ensures uniqueness and originality of each piece

- **NFT Publishing**
  - Automatically mints NFTs on selected blockchain (Ethereum/Base)
  - Handles metadata creation and IPFS storage
  - Sets pricing based on market analysis
  - Manages gas fees and transaction timing

- **Social Media Integration**
  - Automated Twitter posting of new NFT releases
  - Engagement with NFT community
  - Analytics tracking for social performance
  - Hashtag optimization

## Requirements

- Node.js v18 or higher
- OpenAI API key (for art generation)
- Twitter Developer API credentials
- Ethereum/Base wallet with funds for minting
- IPFS account (e.g., Pinata) for metadata storage

## Environment Variables

Create a `.env` file with the following:

```env
# API Keys
OPENAI_API_KEY=your_openai_api_key
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret

# Blockchain Configuration
NETWORK_ID=base-sepolia  # or ethereum, base for mainnet
WALLET_PRIVATE_KEY=your_wallet_private_key

# IPFS Configuration
IPFS_API_KEY=your_ipfs_api_key
IPFS_API_SECRET=your_ipfs_api_secret
```

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

```bash
# Start the NFT creator in autonomous mode
npm start

# Or run in interactive mode
npm run interactive
```

## Modes

1. **Autonomous Mode**
   - Continuously generates and publishes NFTs
   - Handles social media promotion
   - Monitors sales and engagement

2. **Interactive Mode**
   - Manual control over art generation
   - Preview before publishing
   - Custom social media messages

## Configuration

Adjust settings in `config.json`:
- Art generation parameters
- NFT pricing strategy
- Publishing frequency
- Social media posting schedule

## Safety Features

- Rate limiting for API calls
- Gas price monitoring
- Duplicate art detection
- Content moderation
- Error handling and recovery

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for art generation capabilities
- Twitter API for social integration
- Ethereum/Base network for NFT functionality
- IPFS/Pinata for decentralized storage
