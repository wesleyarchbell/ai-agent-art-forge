import { IPFSService } from '../../src/services/ipfs/ipfs-service';
import { ArtGenerator } from '../../src/services/art/art-generator';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function testIPFSIntegration() {
    try {
        console.log('Testing IPFS Integration...');
        
        // Initialize services
        const ipfsService = new IPFSService();
        const artGenerator = new ArtGenerator();
        
        // Test authentication
        console.log('Testing Pinata authentication...');
        const isAuthenticated = await ipfsService.testAuthentication();
        if (!isAuthenticated) {
            throw new Error('Authentication failed');
        }
        console.log('✅ Authentication successful');

        // Generate test image
        console.log('\nGenerating test image...');
        const imagePrompt = 'A digital artwork of a cosmic tree with glowing leaves against a starry background';
        const imagePath = await artGenerator.generateArt();
        console.log('✅ Test image generated successfully');

        // Test image upload
        console.log('\nTesting image upload...');
        const imageIpfsUrl = await ipfsService.uploadImage(imagePath.filePath);
        console.log('✅ Image uploaded successfully');
        console.log('Image IPFS URL:', imageIpfsUrl);

        // Test metadata upload
        console.log('\nTesting metadata upload...');
        const metadataUrl = await ipfsService.createAndUploadMetadata(
            'Cosmic Tree',
            'A mesmerizing digital artwork featuring a cosmic tree with glowing leaves set against a backdrop of stars',
            imageIpfsUrl,
            [
                { trait_type: 'Style', value: 'Digital Art' },
                { trait_type: 'Theme', value: 'Cosmic Nature' },
                { trait_type: 'Artist', value: 'AI Art Forge' }
            ]
        );
        console.log('✅ Metadata uploaded successfully');
        console.log('Metadata IPFS URL:', metadataUrl);

        console.log('\n🎉 All tests passed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testIPFSIntegration(); 