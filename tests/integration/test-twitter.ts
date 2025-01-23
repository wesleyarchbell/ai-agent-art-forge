import { TwitterApi } from 'twitter-api-v2';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { ArtGenerator } from '../../src/services/art/art-generator';
import { IPFSService } from '../../src/services/ipfs/ipfs-service';

// Load environment variables
dotenv.config();

async function testTwitter() {
    try {
        // Initialize services
        const artGenerator = new ArtGenerator();
        const ipfsService = new IPFSService();
        const client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY!,
            appSecret: process.env.TWITTER_API_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessSecret: process.env.TWITTER_ACCESS_SECRET!,
        });

        // Generate test art
        console.log('Generating test artwork...');
        const { filePath, prompt, style, theme } = await artGenerator.generateArt();
        
        // Upload to IPFS
        console.log('Uploading to IPFS...');
        const imageUrl = await ipfsService.uploadImage(filePath);
        
        // Upload media to Twitter
        console.log('Uploading media to Twitter...');
        const mediaBuffer = fs.readFileSync(filePath);
        const mediaId = await client.v1.uploadMedia(mediaBuffer, { mimeType: 'image/png' });

        // Create tweet text with timestamp to avoid duplication
        const timestamp = new Date().toISOString();
        const tweetText = `🎨 AI Art Forge Test (${timestamp})\n\n` +
                         `Style: ${style}\n` +
                         `Theme: ${theme}\n` +
                         `IPFS: ${imageUrl}\n\n` +
                         `#NFT #AIArt #Testing`;

        // Post tweet with media
        console.log('Posting tweet...');
        const tweet = await client.v2.tweet({
            text: tweetText,
            media: { media_ids: [mediaId] }
        });
        
        console.log('Tweet posted successfully!');
        console.log('Tweet ID:', tweet.data.id);
        console.log('Tweet URL:', `https://twitter.com/user/status/${tweet.data.id}`);
        
        // Get engagement after a delay
        console.log('\nWaiting 30 seconds to check engagement...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        const engagement = await client.v2.singleTweet(tweet.data.id, {
            'tweet.fields': ['public_metrics']
        });
        
        console.log('\nTweet Engagement:');
        console.log('Likes:', engagement.data.public_metrics?.like_count || 0);
        console.log('Retweets:', engagement.data.public_metrics?.retweet_count || 0);
        console.log('Replies:', engagement.data.public_metrics?.reply_count || 0);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the test
testTwitter(); 