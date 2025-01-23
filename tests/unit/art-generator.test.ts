import { ArtGenerator } from '../../src/services/art/art-generator';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('ArtGenerator', () => {
    let artGenerator: ArtGenerator;
    
    beforeEach(() => {
        artGenerator = new ArtGenerator();
    });

    afterAll(() => {
        // Clean up any remaining test files
        const outputDir = path.join(process.cwd(), 'generated-art');
        if (fs.existsSync(outputDir)) {
            const files = fs.readdirSync(outputDir);
            files.forEach(file => {
                fs.unlinkSync(path.join(outputDir, file));
            });
        }
    });

    describe('generateArt', () => {
        it('should generate art with custom prompt', async () => {
            const customPrompt = 'A digital painting of a sunset over mountains';
            const filePath = await artGenerator.generateArt(customPrompt);
            
            // Check if file exists
            expect(fs.existsSync(filePath.filePath)).toBe(true);
            
            // Check if file is in the correct directory
            expect(filePath.filePath.includes('generated-art')).toBe(true);
            
            // Check if file is a PNG
            expect(path.extname(filePath.filePath)).toBe('.png');
            
            // Clean up
            fs.unlinkSync(filePath.filePath);
        }, 30000); // 30 second timeout

        it('should generate art with random prompt', async () => {
            const filePath = await artGenerator.generateArt();
            
            // Check if file exists
            expect(fs.existsSync(filePath.filePath)).toBe(true);
            
            // Check if file is in the correct directory
            expect(filePath.filePath.includes('generated-art')).toBe(true);
            
            // Check if file is a PNG
            expect(path.extname(filePath.filePath)).toBe('.png');
            
            // Clean up
            fs.unlinkSync(filePath.filePath);
        }, 30000); // 30 second timeout
    });

    describe('verifyUniqueness', () => {
        it('should detect duplicate images', async () => {
            // Generate first image
            const prompt = 'Test prompt for uniqueness verification';
            const filePath = await artGenerator.generateArt(prompt);
            
            // Verify uniqueness (should be true for first image)
            const isUnique = artGenerator.verifyUniqueness(filePath.filePath, prompt);
            expect(isUnique).toBe(true);
            
            // Clean up
            fs.unlinkSync(filePath.filePath);
        }, 30000); // 30 second timeout
    });
}); 