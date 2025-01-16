import pinataSDK from '@pinata/sdk';
import fs from 'fs';
import path from 'path';

interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string;
    }>;
}

interface IPFSResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
}

export class IPFSService {
    private pinata: any;
    private initialized: boolean = false;

    constructor() {
        const apiKey = process.env.PINATA_API_KEY;
        const apiSecret = process.env.PINATA_API_SECRET;
        
        if (!apiKey || !apiSecret) {
            throw new Error('Pinata API credentials not found in environment variables');
        }

        this.pinata = new pinataSDK(apiKey, apiSecret);
        this.initialized = true;
    }

    async testAuthentication(): Promise<boolean> {
        try {
            await this.pinata.testAuthentication();
            return true;
        } catch (error) {
            console.error('Pinata authentication failed:', error);
            return false;
        }
    }

    async uploadImage(imagePath: string): Promise<string> {
        if (!this.initialized) throw new Error('IPFS Service not initialized');
        
        try {
            const readableStreamForFile = fs.createReadStream(imagePath);
            const options = {
                pinataMetadata: {
                    name: path.basename(imagePath),
                },
            };

            const result: IPFSResponse = await this.pinata.pinFileToIPFS(readableStreamForFile, options);
            return `ipfs://${result.IpfsHash}`;
        } catch (error) {
            console.error('Failed to upload image to IPFS:', error);
            throw error;
        }
    }

    async uploadMetadata(metadata: NFTMetadata): Promise<string> {
        if (!this.initialized) throw new Error('IPFS Service not initialized');

        try {
            const options = {
                pinataMetadata: {
                    name: `metadata_${metadata.name}`,
                },
            };

            const result: IPFSResponse = await this.pinata.pinJSONToIPFS(metadata, options);
            return `ipfs://${result.IpfsHash}`;
        } catch (error) {
            console.error('Failed to upload metadata to IPFS:', error);
            throw error;
        }
    }

    async createAndUploadMetadata(
        name: string,
        description: string,
        imageIpfsUrl: string,
        attributes: Array<{ trait_type: string; value: string }>
    ): Promise<string> {
        const metadata: NFTMetadata = {
            name,
            description,
            image: imageIpfsUrl,
            attributes,
        };

        return this.uploadMetadata(metadata);
    }
} 