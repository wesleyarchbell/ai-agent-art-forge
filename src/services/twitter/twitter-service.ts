import { TwitterApi } from 'twitter-api-v2';
import * as fs from 'fs';

/**
 * Service for interacting with Twitter/X platform API
 * Handles posting NFTs and tracking engagement on X (formerly Twitter)
 */
export class TwitterService {
    private client: TwitterApi;

    constructor() {
        // Initialize Twitter/X API client
        this.client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY!,
            appSecret: process.env.TWITTER_API_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessSecret: process.env.TWITTER_ACCESS_SECRET!,
        });
    }

    /**
     * Posts a new NFT mint announcement to Twitter/X
     * @param artPath Local path to the NFT image
     * @param imageUrl IPFS URL of the image
     * @param contractAddress NFT contract address
     * @param style Art style description
     * @param network Blockchain network
     * @returns Tweet/post ID
     */
    async postNFTMint(
        artPath: string,
        imageUrl: string,
        contractAddress: string,
        style: string,
        network: string
    ): Promise<string> {
        try {
            // Upload media to Twitter/X
            const mediaBuffer = fs.readFileSync(artPath);
            const mediaId = await this.client.v1.uploadMedia(mediaBuffer, {
                mimeType: 'image/png'
            });

            // Create post text
            const explorerUrl = `https://sepolia.basescan.org/address/${contractAddress}`;
            const tweetText = `🎨 New AI-Generated NFT Minted!\n\n` +
                            `🖼️ Collection: AI Art Forge\n` +
                            `🏷️ Style: ${style}\n` +
                            `🔗 View: ${explorerUrl}\n\n` +
                            `#NFT #AIArt #BaseNetwork #NFTCommunity`;

            // Post to Twitter/X
            const tweet = await this.client.v2.tweet({
                text: tweetText,
                media: {
                    media_ids: [mediaId]
                }
            });

            return tweet.data.id;
        } catch (error) {
            console.error('Error posting to Twitter/X:', error);
            throw error;
        }
    }

    /**
     * Gets engagement metrics for a post on Twitter/X
     */
    async getEngagement(tweetId: string): Promise<{
        likes: number;
        retweets: number;
        replies: number;
    }> {
        try {
            const tweet = await this.client.v2.singleTweet(tweetId, {
                'tweet.fields': ['public_metrics']
            });

            return {
                likes: tweet.data.public_metrics?.like_count || 0,
                retweets: tweet.data.public_metrics?.retweet_count || 0,
                replies: tweet.data.public_metrics?.reply_count || 0
            };
        } catch (error) {
            console.error('Error getting Twitter/X engagement:', error);
            throw error;
        }
    }
} 