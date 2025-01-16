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

dotenv.config();

/**
 * Validates that required environment variables are set
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  const requiredVars = [
    "OPENAI_API_KEY", 
    "CDP_API_KEY_NAME", 
    "CDP_API_KEY_PRIVATE_KEY"
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

// Initialize directories
const GENERATED_ART_DIR = "generated-art";
if (!fs.existsSync(GENERATED_ART_DIR)) {
  fs.mkdirSync(GENERATED_ART_DIR);
} else {
  // Clean up any leftover files from previous runs
  const files = fs.readdirSync(GENERATED_ART_DIR);
  for (const file of files) {
    fs.unlinkSync(`${GENERATED_ART_DIR}/${file}`);
  }
}

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

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
          process.stdin.setRawMode(true);
          process.stdin.resume();
        }
      } catch (error) {
        console.error("Error handling input:", error);
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }
    });

    console.log("\nPress 'q' to quit");

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
async function executeNFTOperation(agent: any, config: any, toolkit: CdpToolkit) {
  try {
    const networkId = process.env.NETWORK_ID || 'base-sepolia';
    const network = getNetworkConfig(networkId);
    
    console.log(`Starting NFT operation on ${networkId}...`);
    if (networkId === 'base-sepolia') {
      console.log('Note: Base Sepolia is not supported on OpenSea. Use Basescan to verify NFTs.');
      console.log('For selling NFTs, deploy to Base or Ethereum mainnet.');
    }
    
    // Initialize our services
    const ipfsService = new IPFSService();
    const artGenerator = new ArtGenerator();

    // 1. Generate Art
    console.log('\nGenerating artwork...');
    const artPath = await artGenerator.generateArt();
    console.log('Art generated successfully at:', artPath);

    // 2. Upload to IPFS
    console.log('\nUploading artwork to IPFS...');
    const imageIpfsUrl = await ipfsService.uploadImage(artPath);
    const imageHttpUrl = imageIpfsUrl.replace('ipfs://', 'https://nftstorage.link/ipfs/');
    console.log('Image uploaded to IPFS:', imageIpfsUrl);
    console.log('HTTP URL:', imageHttpUrl);

    // 3. Create metadata
    console.log('\nCreating NFT metadata...');
    const metadata = await createNFTMetadata(imageHttpUrl, 'A mesmerizing digital artwork exploring the intersection of technology and art');
    console.log('Metadata created');

    // 4. Use the agent to deploy contract and mint NFT
    const message = `Please help me mint an NFT using these steps:
1. Check my wallet balance
2. If balance is less than 0.01 ETH, request faucet funds
3. Use the mint_nft tool with these parameters:
   - name: "AI Art Forge"
   - symbol: "AIAF"
   - description: "AI-generated artwork collection"
   - recipient: my current wallet address
   - contract_type: "ERC721"
   - image_uri: "${imageIpfsUrl}"
   - token_id: "1"

Please execute each step in sequence and provide transaction links. Skip the faucet request if balance is sufficient.`;

    const stream = await agent.stream({ messages: [new HumanMessage(message)] }, config);
    let mintingConfirmed = false;

    for await (const chunk of stream) {
      if ("agent" in chunk) {
        console.log("Agent:", chunk.agent.messages[0].content);
      } else if ("tools" in chunk) {
        const toolOutput = chunk.tools.messages[0].content;
        console.log("Tool Output:", toolOutput);
        
        // Check for successful minting
        if (toolOutput.includes("Minted NFT from contract")) {
          const contractMatch = toolOutput.match(/contract\s+(0x[0-9a-fA-F]{40})/);
          if (contractMatch) {
            const contractAddress = contractMatch[1];
            console.log(`\nNFT Contract Address: ${contractAddress}`);
            console.log(`Block Explorer: ${network.explorer}/address/${contractAddress}`);
            
            if (networkId === 'base-sepolia') {
              console.log('\nNote: OpenSea does not currently support Base Sepolia.');
              console.log('To view your NFT on OpenSea, you will need to deploy to Base mainnet.');
              console.log('For now, you can verify your NFT on Basescan.');
            } else if (network.opensea) {
              console.log(`OpenSea Link: ${network.opensea}/${contractAddress}/1`);
            }
            mintingConfirmed = true;
            break;
          }
        }

        // Check for errors and break if encountered
        if (toolOutput.toLowerCase().includes("error") && !toolOutput.includes("Error: Tool")) {
          console.error("Error detected in tool output:", toolOutput);
          break;
        }
      }
    }

    // Only consider it successful if minting is confirmed
    if (mintingConfirmed) {
      console.log("\nNFT minted successfully. Waiting for indexing...");
      console.log("Note: It may take up to 5 minutes for the NFT to appear on OpenSea");
      
      // Clean up generated art file
      try {
        console.log("\nCleaning up generated art file...");
        await fs.promises.unlink(artPath);
        console.log("Cleanup successful");
      } catch (error) {
        console.warn("Warning: Could not delete generated art file:", error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minute delay
      return true;
    } else {
      console.error("\nNFT operation failed - minting not confirmed");
      return false;
    }
  } catch (error) {
    console.error("Error in NFT operation:", error);
    return false;
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
