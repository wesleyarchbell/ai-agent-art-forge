import * as dotenv from 'dotenv';
import { generateArt, verifyUniqueness } from './art-generator';

// Load environment variables
dotenv.config();

async function testArtGeneration() {
  try {
    console.log('Starting art generation test...');
    
    // Generate first artwork
    const metadata = await generateArt();
    console.log('Generated artwork metadata:', metadata);
    
    // Verify uniqueness
    const isUnique = verifyUniqueness(
      `generated-art/${metadata.uniqueHash}.png`,
      metadata.prompt
    );
    console.log('Artwork is unique:', isUnique);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testArtGeneration(); 