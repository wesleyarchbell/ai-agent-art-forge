import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import sharp from 'sharp';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Art styles and themes for generation
const artStyles = [
  'digital art',
  'oil painting',
  'watercolor',
  'abstract',
  'minimalist',
  'surrealist',
  'pixel art',
  'cyberpunk',
  'geometric'
];

const artThemes = [
  'nature',
  'space',
  'technology',
  'fantasy',
  'architecture',
  'emotions',
  'mythology',
  'abstract concepts'
];

interface ArtMetadata {
  prompt: string;
  style: string;
  theme: string;
  uniqueHash: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export class ArtGenerator {
  async generateArt(customPrompt?: string): Promise<string> {
    try {
      const { prompt, style, theme } = customPrompt ? 
        { prompt: customPrompt, style: 'custom', theme: 'custom' } : 
        this.generateArtPrompt();

      console.log('Generating art with prompt:', prompt);

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: 'b64_json'
      });

      if (!response.data[0].b64_json) {
        throw new Error('No image data received from DALL-E');
      }

      // Convert base64 to buffer
      const imageData = Buffer.from(response.data[0].b64_json, 'base64');

      // Create output directory if it doesn't exist
      const outputDir = path.join(process.cwd(), 'generated-art');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Calculate uniqueness hash
      const uniqueHash = this.calculateUniquenessHash(prompt, imageData);
      const fileName = `${uniqueHash}.png`;
      const filePath = path.join(outputDir, fileName);

      // Optimize and save the image
      const optimizedImage = await this.optimizeImage(imageData);
      fs.writeFileSync(filePath, optimizedImage);

      console.log('Art generated successfully:', filePath);
      return filePath;
    } catch (error) {
      console.error('Error generating art:', error);
      throw error;
    }
  }

  private generateArtPrompt(): { prompt: string; style: string; theme: string } {
    const style = artStyles[Math.floor(Math.random() * artStyles.length)];
    const theme = artThemes[Math.floor(Math.random() * artThemes.length)];
    
    const prompts = [
      `A ${style} masterpiece exploring ${theme}, with intricate details and vibrant colors`,
      `An imaginative ${style} interpretation of ${theme}, featuring dynamic composition`,
      `A stunning ${style} piece showcasing the essence of ${theme}, with unique perspective`,
      `A mesmerizing ${style} creation centered around ${theme}, with ethereal elements`
    ];
    
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    return { prompt, style, theme };
  }

  private calculateUniquenessHash(prompt: string, imageData: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(prompt);
    hash.update(imageData);
    return hash.digest('hex').substring(0, 16); // Use first 16 chars for shorter filenames
  }

  private async optimizeImage(imageData: Buffer): Promise<Buffer> {
    try {
      const image = sharp(imageData);
      const metadata = await image.metadata();

      // Standardize dimensions to 1024x1024 if needed
      if (metadata.width !== 1024 || metadata.height !== 1024) {
        image.resize(1024, 1024, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        });
      }

      // Optimize the image
      const optimized = await image
        .png({
          compressionLevel: 9,    // Maximum compression
          quality: 90,           // High quality
          effort: 10            // Maximum effort
        })
        .toBuffer();

      return optimized;
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw error;
    }
  }

  verifyUniqueness(filePath: string, prompt: string): boolean {
    try {
      const imageData = fs.readFileSync(filePath);
      const newHash = this.calculateUniquenessHash(prompt, imageData);
      
      // Check against existing hashes in the output directory
      const outputDir = path.join(process.cwd(), 'generated-art');
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
          if (file === `${newHash}.png`) {
            return false; // Duplicate found
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying uniqueness:', error);
      throw error;
    }
  }
} 