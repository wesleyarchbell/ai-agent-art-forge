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
  'urban',
  'mythology',
  'futuristic',
  'abstract concepts',
  'emotions'
];

interface ArtMetadata {
  name: string;
  description: string;
  style: string;
  theme: string;
  prompt: string;
  uniqueHash: string;
  imageUrl?: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

/**
 * Generate a unique art prompt
 */
function generateArtPrompt(): { prompt: string; style: string; theme: string } {
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

/**
 * Calculate uniqueness hash for the artwork
 */
function calculateUniquenessHash(prompt: string, imageData: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(prompt);
  hash.update(imageData);
  return hash.digest('hex');
}

/**
 * Generate art using DALL-E
 */
export async function generateArt(): Promise<ArtMetadata> {
  try {
    // Generate unique prompt
    const { prompt, style, theme } = generateArtPrompt();
    console.log('Generating art with prompt:', prompt);

    // Generate image using DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json"
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
    const uniqueHash = calculateUniquenessHash(prompt, imageData);
    const fileName = `${uniqueHash}.png`;
    const filePath = path.join(outputDir, fileName);

    // Save the image
    fs.writeFileSync(filePath, imageData);
    console.log('Original art saved to:', filePath);

    // Optimize the image
    console.log('Optimizing image...');
    const optimizedData = await optimizeImage(filePath);
    const optimizedPath = path.join(outputDir, `${uniqueHash}_optimized.png`);
    fs.writeFileSync(optimizedPath, optimizedData);
    console.log('Optimized art saved to:', optimizedPath);

    // Create metadata
    const metadata: ArtMetadata = {
      name: `ArtForge #${uniqueHash.slice(0, 6)}`,
      description: `A unique piece of AI-generated art. Style: ${style}, Theme: ${theme}`,
      style,
      theme,
      prompt,
      uniqueHash,
      attributes: [
        { trait_type: 'Style', value: style },
        { trait_type: 'Theme', value: theme }
      ]
    };

    return metadata;
  } catch (error) {
    console.error('Error generating art:', error);
    throw error;
  }
}

/**
 * Verify artwork uniqueness
 */
export function verifyUniqueness(filePath: string, prompt: string): boolean {
  try {
    const imageData = fs.readFileSync(filePath);
    const newHash = calculateUniquenessHash(prompt, imageData);
    
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

/**
 * Optimize image for NFT storage
 * @param filePath Path to the original image
 * @returns Promise<Buffer> Optimized image buffer
 */
export async function optimizeImage(filePath: string): Promise<Buffer> {
  try {
    const image = sharp(filePath);
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
        palette: true,         // Use palette-based quantization
        colors: 256           // Maximum colors for palette
      })
      .toBuffer();

    // Get original and optimized sizes
    const originalSize = fs.statSync(filePath).size;
    const optimizedSize = optimized.length;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);

    console.log(`Image optimization results:
- Original size: ${(originalSize / 1024).toFixed(2)} KB
- Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB
- Size reduction: ${savings}%`);

    return optimized;
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Fallback to original image if optimization fails
    return fs.readFileSync(filePath);
  }
} 