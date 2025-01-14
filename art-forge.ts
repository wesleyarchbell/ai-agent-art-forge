import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit } from "@coinbase/cdp-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import axios from 'axios';

dotenv.config();

/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  // Check required variables
  const requiredVars = ["OPENAI_API_KEY", "CDP_API_KEY_NAME", "CDP_API_KEY_PRIVATE_KEY"];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Exit if any required variables are missing
  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach(varName => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  // Validate NETWORK_ID if provided
  const validNetworks = ["ethereum", "base", "base-sepolia"];
  if (process.env.NETWORK_ID && !validNetworks.includes(process.env.NETWORK_ID)) {
    console.error(`Error: NETWORK_ID must be one of: ${validNetworks.join(", ")}`);
    process.exit(1);
  }

  // Set default network with warning
  if (!process.env.NETWORK_ID) {
    console.warn("Warning: NETWORK_ID not set, defaulting to base-sepolia testnet");
    console.log("To use mainnet, set NETWORK_ID to 'ethereum' or 'base'");
  }
}

// Add this right after imports and before any other code
validateEnvironment();

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

// Add price tracking interface and functions before initializeAgent
interface PriceData {
  price: number;
  timestamp: number;
}

async function getETHPrice(): Promise<PriceData> {
  try {
    const response = await axios.get('https://api.coinbase.com/v2/prices/ETH-USD/spot');
    return {
      price: parseFloat(response.data.data.amount),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    throw error;
  }
}

// Add new interface for strategy state
interface TradingState {
  activeStrategy: string | null;
  parameters: Record<string, any>;
  lastExecution: number;
}

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
  try {
    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
    });

    let walletDataStr: string | null = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
        // Continue without wallet data
      }
    }

    // Log network configuration
    console.log(`Configuring agent with network: ${process.env.NETWORK_ID || "base-sepolia"}`);
    
    // Configure CDP AgentKit
    const config = {
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    // Log detailed configuration
    console.log("\nNetwork configuration:");
    console.log("- Environment NETWORK_ID:", process.env.NETWORK_ID);
    console.log("- Config networkId:", config.networkId);

    // Initialize CDP AgentKit
    const agentkit = await CdpAgentkit.configureWithWallet(config);

    // Initialize CDP AgentKit Toolkit and get tools
    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();

    // Log toolkit initialization
    console.log("- CDP Toolkit initialized with network:", config.networkId, "\n");

    // Store buffered conversation history in memory
    const memory = new MemorySaver();
    const agentConfig = { configurable: { thread_id: "CDP AgentKit Chatbot Example!" } };

    // Create React Agent using the LLM and CDP AgentKit tools
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are a specialized ETH trading agent powered by the Coinbase Developer Platform AgentKit. Your primary functions are:
        1. Trading ETH on-chain
        2. Checking ETH prices
        3. Monitoring ETH balances
        4. Executing ETH trades
        5. Testing trading strategies

        Current Network: ${process.env.NETWORK_ID || "base-sepolia"}
        ${process.env.NETWORK_ID === "base-sepolia" 
          ? "You are on a testnet - perfect for testing trading strategies without risk."
          : "WARNING: You are on mainnet - all operations will use real funds!"}

        Available Trading Strategies:
        1. Dollar Cost Averaging (DCA)
           - Buy fixed amounts at regular intervals
           - Test different interval periods
           - Simulate long-term accumulation

        2. Range Trading
           - Set upper and lower price bounds
           - Buy near support levels
           - Sell near resistance levels

        3. Momentum Trading
           - Track price movements
           - Enter positions on upward trends
           - Exit positions on downward trends

        4. Rebalancing
           - Maintain target portfolio ratios
           - Adjust positions based on price changes
           - Test different rebalancing thresholds

        5. Grid Trading
           - Define price grid levels
           - Place orders at each level
           - Simulate grid profit/loss

        Before any trading action:
        - Always check the current ETH balance first
        - Verify the current ETH price
        - Confirm the current network (${process.env.NETWORK_ID || "base-sepolia"})
        ${process.env.NETWORK_ID === "base-sepolia"
          ? "- Use test funds to simulate different strategies"
          : "- Warn users that real funds will be used for trading"}

        Trading Guidelines:
        - Never trade more than 50% of available ETH balance in a single transaction
        - Always verify transaction details before execution
        - Report price and balance before and after trades
        - Track performance metrics for each strategy
        - Document entry and exit points
        - Calculate simulated profit/loss
        - If there's a 5XX error, advise the user to try again later
        ${process.env.NETWORK_ID === "base-sepolia"
          ? "- Use this testnet environment to experiment with different strategies"
          : "- Emphasize that real funds are being used for trades"}

        Strategy Testing Framework:
        1. Strategy Selection
           - Choose a trading strategy to test
           - Define parameters (amounts, intervals, thresholds)
           - Set test duration

        2. Execution
           - Simulate trades according to strategy rules
           - Record all actions and decisions
           - Track test balances separately

        3. Analysis
           - Calculate performance metrics
           - Compare results between strategies
           - Document lessons learned

        4. Optimization
           - Identify improvement areas
           - Adjust parameters based on results
           - Test modified strategies

        Network-Specific Behavior:
        ${process.env.NETWORK_ID === "base-sepolia"
          ? "- Perfect environment for strategy testing and development"
          : process.env.NETWORK_ID === "base"
            ? "- Real trading environment - use tested strategies only"
            : "- Real trading environment - use tested strategies only"}
        - Always confirm the network before executing trades
        ${process.env.NETWORK_ID !== "base-sepolia" 
          ? "- Double-check with users before executing trades with real funds"
          : ""}

        If asked to perform actions beyond ETH trading, balance checking, or price monitoring, explain that you're 
        specialized in ETH trading operations. Direct users to docs.cdp.coinbase.com for implementing additional features.

        Be concise and precise with trading information. Always confirm user intentions before executing trades.
        `,
    });

    // Save wallet data
    const exportedWallet = await agentkit.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, exportedWallet);

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error; // Re-throw to be handled by caller
  }
}

async function getRawInput(prompt: string, timeout = 10000): Promise<string | null> {
  return new Promise((resolve) => {
    let input = '';
    let timeoutId: NodeJS.Timeout;

    // Print the prompt
    process.stdout.write(prompt);

    // Set up raw mode
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    // Handle input
    const onData = (key: string) => {
      // Ctrl+C
      if (key === '\u0003') {
        process.stdout.write('\n');
        process.exit();
      }

      // Enter key
      if (key === '\r' || key === '\n') {
        process.stdout.write('\n');
        cleanup();
        resolve(input);
        return;
      }

      // Backspace
      if (key === '\b' || key === '\x7f') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }

      // Regular character
      if (key >= ' ' && key <= '~') {
        input += key;
        process.stdout.write(key);
      }
    };

    // Clean up function
    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      if (timeoutId) clearTimeout(timeoutId);
    };

    // Set timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        process.stdout.write('\n');
        resolve(null);
      }, timeout);
    }

    // Start listening
    process.stdin.on('data', onData);
  });
}

async function executeStrategy(strategy: string, parameters: Record<string, any>) {
  // Get current ETH price and balance
  const price = await getETHPrice();
  console.log(`Current ETH Price: $${price.price.toFixed(2)}`);
  
  // Execute strategy-specific logic
  switch(strategy) {
    case "Rebalancing":
      console.log(`Executing Rebalancing strategy with target ratio: ${parameters.targetRatio}`);
      // Add rebalancing logic here
      break;
    case "DCA":
      console.log("Executing DCA strategy");
      // Add DCA logic here
      break;
    case "Grid":
      console.log("Executing Grid strategy");
      // Add grid trading logic here
      break;
    default:
      console.log("Unknown strategy");
  }
}

/**
 * Run the agent autonomously with specified intervals
 *
 * @param agent - The agent executor
 * @param config - Agent configuration
 * @param interval - Time interval between actions in seconds
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runAutonomousMode() {
  console.log("Starting autonomous mode...");
  let currentStrategy = "Rebalancing";
  let parameters = { targetRatio: 0.4 };
  let isRunning = true;
  let iterationCount = 0;
  let inputBuffer = '';
  let isAcceptingInput = false;

  // Set up raw input handling
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key: Buffer) => {
    try {
      const keyStr = key.toString();

      if (isAcceptingInput) {
        // Already in input mode, let the readline interface handle it
        return;
      }

      // Clear any buffered input
      process.stdin.pause();
      process.stdin.setRawMode(false);

      if (keyStr === 's') {
        isAcceptingInput = true;
        console.log("\nSelect strategy (1: Rebalancing, 2: DCA, 3: Grid):");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const timeout = setTimeout(() => {
          console.log("\nStrategy selection timed out. Continuing with current strategy.");
          rl.close();
          isAcceptingInput = false;
          process.stdin.setRawMode(true);
          process.stdin.resume();
        }, 10000);

        rl.question('', (answer) => {
          clearTimeout(timeout);
          switch(answer.trim()) {
            case '1': currentStrategy = "Rebalancing"; break;
            case '2': currentStrategy = "DCA"; break;
            case '3': currentStrategy = "Grid"; break;
            default: console.log("Invalid selection. Keeping current strategy.");
          }
          console.log(`Strategy updated to: ${currentStrategy}`);
          rl.close();
          isAcceptingInput = false;
          process.stdin.setRawMode(true);
          process.stdin.resume();
        });
      } else if (keyStr === 'p') {
        isAcceptingInput = true;
        console.log("\nEnter new target ratio (0.1-0.9):");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const timeout = setTimeout(() => {
          console.log("\nParameter update timed out. Continuing with current parameters.");
          rl.close();
          isAcceptingInput = false;
          process.stdin.setRawMode(true);
          process.stdin.resume();
        }, 10000);

        rl.question('', (answer) => {
          clearTimeout(timeout);
          const ratio = parseFloat(answer);
          if (!isNaN(ratio) && ratio >= 0.1 && ratio <= 0.9) {
            parameters.targetRatio = ratio;
            console.log(`Target ratio updated to ${ratio}`);
          } else {
            console.log("Invalid ratio. Keeping current parameters.");
          }
          rl.close();
          isAcceptingInput = false;
          process.stdin.setRawMode(true);
          process.stdin.resume();
        });
      } else if (keyStr === 'q') {
        console.log("\nStopping autonomous mode...");
        isRunning = false;
        process.exit(0);
      } else if (!isAcceptingInput) {
        console.log("Invalid command. Use 's' for strategy, 'p' for parameters, or 'q' to quit.");
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }
    } catch (error) {
      console.error("Error handling input:", error);
      isAcceptingInput = false;
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }
  });

  console.log("\nPress 's' to change strategy");
  console.log("Press 'p' to change parameters");
  console.log("Press 'q' to quit");

  while (isRunning) {
    try {
      iterationCount++;
      console.log(`\n=== Iteration ${iterationCount} ===`);
      console.log(`Current Strategy: ${currentStrategy}`);
      console.log(`Current Parameters: ${JSON.stringify(parameters)}`);
      
      // Execute strategy logic here
      await executeStrategy(currentStrategy, parameters);
      
      console.log(`\nWaiting 5 minutes before next iteration...`);
      await new Promise(resolve => setTimeout(resolve, 300000));
    } catch (error) {
      console.error("Error in autonomous mode:", error);
      console.log("Waiting 1 minute before retry...");
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
}

/**
 * Run the agent interactively based on user input
 *
 * @param agent - The agent executor
 * @param config - Agent configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  try {
    // eslint-disable-next-line no-constant-condition
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
 * Choose whether to run in autonomous or chat mode based on user input
 *
 * @returns Selected mode
 */
async function chooseMode(): Promise<"chat" | "auto"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  // eslint-disable-next-line no-constant-condition
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
 * Start the chatbot agent
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
