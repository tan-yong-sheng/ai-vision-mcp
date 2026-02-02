
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

interface VideoProcessingOptions {
  startTime?: string;
  endTime?: string;
  resolution?: string;
}

export class VideoProcessor {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  async processVideo(inputPath: string, options: VideoProcessingOptions): Promise<string> {
    if (!options.startTime && !options.endTime && !options.resolution) {
      return inputPath;
    }

    const extension = path.extname(inputPath);
    const outputPath = path.join(this.tempDir, `processed_${uuidv4()}${extension}`);
    
    let command = `ffmpeg -i "${inputPath}"`;
    
    if (options.startTime) {
      command += ` -ss ${options.startTime}`;
    }
    
    if (options.endTime) {
      command += ` -to ${options.endTime}`;
    }

    if (options.resolution) {
        // e.g., "1280x720"
        command += ` -vf scale=${options.resolution}`;
    } else {
        // Ensure even dimensions if not resizing, to avoid libx264 errors with odd dimensions
        // This is a good safety measure generally
        command += ` -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2"`; 
    }
    
    // Use copy for audio to avoid re-encoding if possible, but video needs re-encoding for trim/scale
    command += ` -c:a copy "${outputPath}"`;

    try {
      console.log(`[VideoProcessor] Executing: ${command}`);
      await execAsync(command);
      return outputPath;
    } catch (error) {
      console.error('[VideoProcessor] Error processing video:', error);
      throw error;
    }
  }

  async cleanup(filePath: string) {
      if (filePath.startsWith(this.tempDir)) {
          try {
              await fs.unlink(filePath);
          } catch (error) {
              console.warn(`[VideoProcessor] Failed to delete temp file ${filePath}:`, error);
          }
      }
  }
}
