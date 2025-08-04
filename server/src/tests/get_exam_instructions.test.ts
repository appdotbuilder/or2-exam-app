
import { describe, expect, it } from 'bun:test';
import { getExamInstructions, type ExamInstructions } from '../handlers/get_exam_instructions';

describe('getExamInstructions', () => {
  it('should return exam instructions with correct duration', async () => {
    const result = await getExamInstructions();

    expect(result.duration_minutes).toBe(30);
    expect(typeof result.duration_minutes).toBe('number');
  });

  it('should return array of instruction strings', async () => {
    const result = await getExamInstructions();

    expect(Array.isArray(result.instructions)).toBe(true);
    expect(result.instructions.length).toBeGreaterThan(0);
    
    // Verify all instructions are strings
    result.instructions.forEach(instruction => {
      expect(typeof instruction).toBe('string');
      expect(instruction.length).toBeGreaterThan(0);
    });
  });

  it('should include essential exam information', async () => {
    const result = await getExamInstructions();

    const instructionsText = result.instructions.join(' ').toLowerCase();
    
    // Check for key exam concepts
    expect(instructionsText).toMatch(/duration|time/);
    expect(instructionsText).toMatch(/timer|start/);
    expect(instructionsText).toMatch(/internet|connection/);
    expect(instructionsText).toMatch(/save|answer/);
    expect(instructionsText).toMatch(/attach|file/);
  });

  it('should match ExamInstructions interface structure', async () => {
    const result = await getExamInstructions();

    // Verify required properties exist
    expect(result).toHaveProperty('duration_minutes');
    expect(result).toHaveProperty('instructions');
    
    // Verify types match interface
    expect(typeof result.duration_minutes).toBe('number');
    expect(Array.isArray(result.instructions)).toBe(true);
  });

  it('should return consistent results on multiple calls', async () => {
    const result1 = await getExamInstructions();
    const result2 = await getExamInstructions();

    expect(result1.duration_minutes).toBe(result2.duration_minutes);
    expect(result1.instructions).toEqual(result2.instructions);
  });
});
