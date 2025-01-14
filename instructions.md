# Instructions

## Goal: Create a simple trading chatbox AI Agent using AgentKit by Coinbase with goals aligned with trading ETH.

## Requirements:

- The agent should be able to trade ETH onchain using the Coinbase Developer Platform AgentKit.
- The agent should be able to respond to messages in a chatbox.
- The agent should be able to use the AgentKit tools to trade ETH.
- The agent should be able to use the AgentKit tools to check the price of ETH.
- The agent should be able to use the AgentKit tools to check the balance of ETH.

1. Create a github repo for the project. ✅ 
2. Set the remote origin to the new repo. ✅ 
3. README.md should be updated with the instructions for the project. ✅ 
4. Update the project so `/` root project is the code from `trading-ai-agent` folder. ✅ 
5. Delete unused directories and files
    1. /cdp-agentkit-core
    2. /cdp-langchain
    3. /twitter-langchain
6. Generate instructions - find out where autonomous instructions are stored
    - The autonomous instructions are stored in the `messageModifier` parameter in the `chatbot.ts` file. Here's the relevant section
    - The current instructions focus on more genetal CDP AgentKit instructions.
    - Next step would be to update the instructions to focus on trading ETH Ai AgentKit instructions.
7. Update `messageModifier` to focus on trading ETH Ai AgentKit instructions.
8. Update trading ai agent to that it can use ETH mainnet or base mainnet.


