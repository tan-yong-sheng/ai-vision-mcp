
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
    // Removed ensureTempDir() call from constructor to avoid unawaited promise
  }

  private async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  async processVideo(inputPath: string, options: VideoProcessingOptions): Promise<string> {
    // Ensure temp directory exists before processing
    await this.ensureTempDir();

    if (!options.startTime && !options.endTime && !options.resolution) {
      return inputPath;
    }

    const extension = path.extname(inputPath);
    const outputPath = path.join(this.tempDir, `processed_${uuidv4()}${extension}`);
    
    // Construct ffmpeg arguments safely
    const args = ['-i', inputPath];
    
    if (options.startTime) {
      // Simple validation for time format could be added here
      args.push('-ss', options.startTime);
    }
    
    if (options.endTime) {
      args.push('-to', options.endTime);
    }

    if (options.resolution) {
        // e.g., "1280x720"
        // Basic validation for resolution format (WxH)
        if (/^\d+x\d+$/.test(options.resolution)) {
             args.push('-vf', `scale=${options.resolution}`);
        } else {
             console.warn(`[VideoProcessor] Invalid resolution format: ${options.resolution}. Using default scaling.`);
             args.push('-vf', "scale=trunc(iw/2)*2:trunc(ih/2)*2");
        }
    } else {
        // Ensure even dimensions if not resizing, to avoid libx264 errors with odd dimensions
        args.push('-vf', "scale=trunc(iw/2)*2:trunc(ih/2)*2");
    }
    
    // Use copy for audio to avoid re-encoding if possible, but video needs re-encoding for trim/scale
    args.push('-c:a', 'copy', outputPath);

    try {
      console.log(`[VideoProcessor] Executing ffmpeg with args: ${args.join(' ')}`);
      // Use execFile instead of exec to avoid shell injection
      const { execFile } = await import('child_process');
      const execFileAsync = promisify(execFile);
      
      await execFileAsync('ffmpeg', args, {
          timeout: 300000, // 5 minutes timeout
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
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
