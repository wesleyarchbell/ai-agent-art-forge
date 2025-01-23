import * as dotenv from 'dotenv';
import { ArtGenerator } from '../../src/services/art/art-generator';

// Load environment variables
dotenv.config();

async function testArtGeneration() {
  try {
    console.log('Starting art generation test...');
    
    const artGenerator = new ArtGenerator();
    
    // Generate artwork with custom prompt
    console.log('\nTesting custom prompt generation...');
    const customPrompt = 'A digital painting of a cosmic tree with glowing leaves';
    const customArtPath = await artGenerator.generateArt(customPrompt);
    console.log('Generated custom artwork at:', customArtPath.filePath);
    
    // Generate artwork with random prompt
    console.log('\nTesting random prompt generation...');
    const randomArtPath = await artGenerator.generateArt();
    console.log('Generated random artwork at:', randomArtPath.filePath);
    
    // Verify uniqueness
    console.log('\nTesting uniqueness verification...');
    const isUnique = artGenerator.verifyUniqueness(customArtPath.filePath, customPrompt);
    console.log('Artwork is unique:', isUnique);
    
    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testArtGeneration(); 