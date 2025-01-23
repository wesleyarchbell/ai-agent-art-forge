import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit } from "@coinbase/cdp-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import { IPFSService } from './services/ipfs/ipfs-service';
import { ArtGenerator } from './services/art/art-generator';
import { TwitterService } from './services/twitter/twitter-service';

dotenv.config();

/**
 * Validates that required environment variables are set
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  const requiredVars = [
    "OPENAI_API_KEY", 
    "CDP_API_KEY_NAME", 
    "CDP_API_KEY_PRIVATE_KEY",
    "TWITTER_API_KEY",
    "TWITTER_API_SECRET",
    "TWITTER_ACCESS_TOKEN",
    "TWITTER_ACCESS_SECRET"
  ];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach(varName => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  const validNetworks = ["base", "base-sepolia"];
  if (process.env.NETWORK_ID && !validNetworks.includes(process.env.NETWORK_ID)) {
    console.error(`Error: NETWORK_ID must be one of: ${validNetworks.join(", ")}`);
    process.exit(1);
  }

  if (!process.env.NETWORK_ID) {
    console.warn("Warning: NETWORK_ID not set, defaulting to base-sepolia testnet");
    console.log("To use mainnet, set NETWORK_ID to 'ethereum' or 'base'");
  }
}

validateEnvironment();

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

// Initialize services
const artGenerator = new ArtGenerator();
const ipfsService = new IPFSService();
const twitterService = new TwitterService();

/**
 * Initialize the agent with CDP Agentkit
 */
async function initializeAgent() {
  try {
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
    });

    let walletDataStr: string | null = null;

    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
      }
    }

    console.log(`Configuring agent with network: ${process.env.NETWORK_ID || "base-sepolia"}`);
    
    const config = {
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    console.log("\nNetwork configuration:");
    console.log("- Environment NETWORK_ID:", process.env.NETWORK_ID);
    console.log("- Config networkId:", config.networkId);

    const agentkit = await CdpAgentkit.configureWithWallet(config);
    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();

    console.log("- CDP Toolkit initialized with network:", config.networkId, "\n");

    const memory = new MemorySaver();
    const agentConfig = { configurable: { thread_id: "CDP AgentKit NFT Agent" } };

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `You are an AI assistant powered by the Coinbase Developer Platform AgentKit, focused on NFT operations on the Base network.

CAPABILITIES:
1. Deploy and mint NFTs on Base
2. Manage NFT metadata and token URIs
3. Handle wallet operations and transaction signing
4. Monitor NFT contract events and status

CURRENT CONFIGURATION:
- Network: ${process.env.NETWORK_ID || "base-sepolia"}
- Environment: ${process.env.NETWORK_ID === "base-sepolia" ? "Testnet (safe for testing)" : "MAINNET (real funds)"}

GUIDELINES:
1. Always verify:
   - Current wallet balance before operations
   - Contract addresses are valid
   - Network is correct (${process.env.NETWORK_ID || "base-sepolia"})
   - Transaction details before signing

2. For NFT operations:
   - Validate metadata format
   - Confirm token URI is accessible
   - Check gas fees and wallet balance
   - Monitor transaction status
   - Report deployment/minting results

3. Error handling:
   - Provide clear error messages
   - Suggest solutions for common issues
   - Retry failed transactions when appropriate

4. Security:
   - Never expose private keys or sensitive data
   - Verify all contract interactions
   - Double-check destination addresses

RESPONSE FORMAT:
1. Keep responses clear and concise
2. For errors, explain:
   - What went wrong
   - Why it happened
   - How to fix it
3. For successful operations:
   - Confirm the action completed
   - Provide relevant transaction details
   - Next steps if applicable

Remember: You are on ${process.env.NETWORK_ID === "base-sepolia" ? "testnet - perfect for testing" : "MAINNET - use real funds with caution"}!`,
    });

    const exportedWallet = await agentkit.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, exportedWallet);

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Run the agent autonomously to handle NFT operations
 */
async function runAutonomousMode() {
  console.log("Starting autonomous NFT mode...");
  let isRunning = true;
  let iterationCount = 0;

  try {
    const { agent, config } = await initializeAgent();
    const agentkit = await CdpAgentkit.configureWithWallet({
      networkId: process.env.NETWORK_ID || "base-sepolia",
    });
    const cdpToolkit = new CdpToolkit(agentkit);
    
    console.log("Agent and toolkit initialized successfully");

    // Only set up raw mode if we're in an interactive terminal
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      process.stdin.on('data', (key: Buffer) => {
        try {
          const keyStr = key.toString();
          if (keyStr === 'q') {
            console.log("\nStopping autonomous mode...");
            isRunning = false;
            process.exit(0);
          } else {
            console.log("Invalid command. Use 'q' to quit.");
          }
        } catch (error) {
          console.error("Error handling input:", error);
        }
      });

      console.log("\nPress 'q' to quit");
    }

    while (isRunning) {
      try {
        iterationCount++;
        console.log(`\n=== NFT Operation ${iterationCount} ===`);
        
        const success = await executeNFTOperation(agent, config, cdpToolkit);
        if (success) {
          console.log("NFT operation completed successfully");
        } else {
          console.log("NFT operation failed, will retry in next iteration");
        }
        
        console.log(`\nWaiting 5 minutes before next operation...`);
        await new Promise(resolve => setTimeout(resolve, 300000));
      } catch (error) {
        console.error("Error in autonomous mode:", error);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  } catch (error) {
    console.error("Failed to initialize:", error);
    process.exit(1);
  }
}

/**
 * Run the agent in interactive chat mode
 */
async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  try {
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      const stream = await agent.stream({ messages: [new HumanMessage(userInput)] }, config);

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Choose whether to run in autonomous or chat mode
 */
async function chooseMode(): Promise<"chat" | "auto"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat    - Interactive chat mode");
    console.log("2. auto    - Autonomous action mode");

    const choice = (await question("\nChoose a mode (enter number or name): "))
      .toLowerCase()
      .trim();

    if (choice === "1" || choice === "chat") {
      rl.close();
      return "chat";
    } else if (choice === "2" || choice === "auto") {
      rl.close();
      return "auto";
    }
    console.log("Invalid choice. Please try again.");
  }
}

/**
 * Execute NFT operations using the CDP toolkit
 */
async function executeNFTOperation(agent: any, config: any, cdpToolkit: any): Promise<boolean> {
  try {
    // Generate art
    console.log("Generating new artwork...");
    const { filePath, prompt, style, theme } = await artGenerator.generateArt();
    
    // Upload to IPFS
    console.log("Uploading to IPFS...");
    const imageUrl = await ipfsService.uploadImage(filePath);
    const metadataUrl = await ipfsService.createAndUploadMetadata(
      "AI Art Forge NFT",
      prompt,
      imageUrl,
      [
        { trait_type: "Style", value: style },
        { trait_type: "Theme", value: theme },
        { trait_type: "Generator", value: "DALL-E 3" }
      ]
    );
    
    // Mint NFT using CDP Agent
    console.log("Minting NFT...");
    const stream = await agent.stream(
      {
        messages: [
          new HumanMessage(
            `I want to mint an NFT with these parameters:
            - Token URI: ${metadataUrl}
            - Name: AI Art Forge
            - Symbol: AIAF
            - Description: AI-generated artwork collection
            
            Please:
            1. Check my wallet balance
            2. Deploy the NFT contract if needed
            3. Mint the NFT
            4. Provide the contract address and transaction details`
          )
        ]
      },
      config
    );

    let contractAddress: string | null = null;
    let mintingConfirmed = false;

    for await (const chunk of stream) {
      if ("agent" in chunk) {
        console.log("Agent:", chunk.agent.messages[0].content);
      } else if ("tools" in chunk) {
        const toolOutput = chunk.tools.messages[0].content;
        console.log("Tool Output:", toolOutput);
        
        // Extract contract address if minting is successful
        if (toolOutput.includes("Minted NFT") || toolOutput.includes("contract address")) {
          const match = toolOutput.match(/0x[a-fA-F0-9]{40}/);
          if (match) {
            contractAddress = match[0];
            mintingConfirmed = true;
          }
        }
      }
    }

    // Post to Twitter if minting was successful
    if (mintingConfirmed && contractAddress) {
      console.log("Posting to Twitter/X...");
      const tweetId = await twitterService.postNFTMint(
        filePath,
        imageUrl,
        contractAddress,
        style,
        process.env.NETWORK_ID || "base-sepolia"
      );
      
      // Wait a minute then get engagement metrics
      setTimeout(async () => {
        try {
          const engagement = await twitterService.getEngagement(tweetId);
          console.log("Twitter/X Post Engagement:", engagement);
        } catch (error) {
          console.error("Error getting engagement metrics:", error);
        }
      }, 60000);

      return true;
    }

    return false;
  } catch (error) {
    console.error("Error in NFT operation:", error);
    return false;
  }
}

// Helper function to extract contract address from mint result
function extractContractAddress(mintResult: any): string | null {
  try {
    // This is a simple example - you'll need to adjust based on your actual mint result format
    const resultStr = mintResult.toString();
    const match = resultStr.match(/0x[a-fA-F0-9]{40}/);
    return match ? match[0] : null;
  } catch (error) {
    console.error("Error extracting contract address:", error);
    return null;
  }
}

/**
 * Start the NFT agent
 */
async function main() {
  try {
    const { agent, config } = await initializeAgent();
    const mode = await chooseMode();

    if (mode === "chat") {
      await runChatMode(agent, config);
    } else {
      await runAutonomousMode();
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  console.log("Starting Agent...");
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    external_url: string;
    background_color: string;
    attributes: {
        trait_type: string;
        value: string;
    }[];
}

async function createNFTMetadata(imageUrl: string, prompt: string): Promise<NFTMetadata> {
    // Extract CID from the full URL
    const cid = imageUrl.split('/').pop() || '';
    
    // Extract meaningful style from prompt
    const styleWords = prompt.split(' ')
        .filter(word => word.length > 3)
        .slice(0, 2)
        .join(' ');
    
    // Simplified metadata structure that matches CDP Agent Kit's expectations
    return {
        name: "AI Art Forge #1",
        description: `A unique piece of AI-generated artwork inspired by: ${prompt}`,
        image: imageUrl, // Use the full IPFS URL
        external_url: "https://github.com/wesleyarchbell/ai-agent-art-forge",
        background_color: "FFFFFF",
        attributes: [
            { trait_type: "Collection", value: "AI Art Forge" },
            { trait_type: "Artist", value: "AI Generated" },
            { trait_type: "Style", value: styleWords },
            { trait_type: "Generation", value: "1" },
            { trait_type: "Series", value: "Genesis" }
        ]
    };
}

function getNetworkConfig(networkId: string) {
  const networks = {
    'base-sepolia': {
      explorer: 'https://sepolia.basescan.org',
      opensea: null, // OpenSea does not support Base Sepolia
      faucet: true
    },
    'base': {
      explorer: 'https://basescan.org',
      opensea: 'https://opensea.io/assets/base',
      faucet: false
    }
  };
  return networks[networkId] || networks['base-sepolia'];
}
