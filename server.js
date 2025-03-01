// Import dependencies
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { spawn } from 'child_process';

// Setup paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Determine the correct build directory
const BUILD_DIR = existsSync('./build') ? './build' : './dist';
console.log(`Using static files from ${BUILD_DIR} directory`);

// Function to find an available port by testing connections
async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    try {
      // Try to create a temporary server on the port
      const server = Bun.serve({
        port,
        fetch: () => new Response("Port test"),
      });
      
      // If we got here, the port is available, so close and return it
      server.stop();
      return port;
    } catch (error) {
      console.log(`Port ${startPort + attempt} is in use, trying next port...`);
    }
  }
  
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

// Function to convert audio to WAV format using ffmpeg
async function convertToWav(inputPath) {
  return new Promise((resolve, reject) => {
    // Always create a new filename with 'converted_' prefix to avoid in-place editing
    const outputPath = `${inputPath.substring(0, inputPath.lastIndexOf('.'))}_converted.wav`;
    
    console.log(`Converting audio to WAV format: ${inputPath} -> ${outputPath}`);
    
    // Use ffmpeg to convert the file to 16kHz, 16-bit, mono WAV
    const ffmpegProcess = spawn('ffmpeg', [
      '-y',                   // Overwrite output file if it exists
      '-i', inputPath,        // Input file
      '-acodec', 'pcm_s16le', // 16-bit PCM codec
      '-ar', '16000',         // 16kHz sample rate
      '-ac', '1',             // mono
      outputPath              // Output file
    ]);
    
    let stderrData = '';
    
    ffmpegProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.log('FFmpeg stderr:', data.toString());
    });
    
    ffmpegProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('FFmpeg process exited with code', code);
        console.error('FFmpeg stderr:', stderrData);
        reject(new Error(`FFmpeg process failed with exit code ${code}`));
      } else {
        console.log(`Successfully converted audio to WAV format: ${outputPath}`);
        resolve(outputPath);
      }
    });
  });
}

// Function to transcribe audio using whisper command line
async function transcribeWithWhisper(audioPath, language) {
  return new Promise((resolve, reject) => {
    // Get whisper settings from environment variables
    const WHISPER_MODELS_PATH = process.env.WHISPER_MODELS_PATH || './models';
    const WHISPER_MODEL = process.env.WHISPER_MODEL || 'small';
    const TEMP_DIR = join(process.env.TEMP || '/tmp', 'whisper-audio');
    
    // Check if the audio file exists
    if (!existsSync(audioPath)) {
      console.error(`Audio file does not exist: ${audioPath}`);
      return reject(new Error(`Audio file does not exist: ${audioPath}`));
    }
    
    // Log file info
    try {
      const stats = Bun.file(audioPath).stat();
      console.log(`Audio file: ${audioPath}, size: ${stats.size} bytes`);
    } catch (error) {
      console.error(`Error checking audio file: ${error}`);
    }
    
    // Command to run Whisper-CLI
    const modelPath = join(WHISPER_MODELS_PATH, `${WHISPER_MODEL}.bin`);
    
    // Check if model file exists
    if (!existsSync(modelPath)) {
      console.error(`Model file does not exist: ${modelPath}`);
      return reject(new Error(`Model file does not exist: ${modelPath}`));
    }
    
    // Define output file without extension - whisper-cli will add .txt extension
    const outputFileBase = `${audioPath}`;
    
    // Add file format options
    const args = [
      '-m', modelPath,           // Path to the model file
      '-l', language || 'ru',    // Language setting
      '-otxt',                   // Output text format
      '-of', outputFileBase,     // Output file base (whisper-cli will add .txt)
      audioPath                  // Input audio file
    ];
    
    console.log('Running whisper command:', 'whisper-cli', args.join(' '));
    
    const whisperProcess = spawn('whisper-cli', args);
    let stdoutData = '';
    let stderrData = '';
    
    // Set a timeout - in case process hangs
    const timeout = setTimeout(() => {
      whisperProcess.kill();
      console.error('Whisper process timed out after 30 seconds');
      reject(new Error('Transcription timed out'));
    }, 30000);
    
    whisperProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log('Whisper stdout:', data.toString());
    });
    
    whisperProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.log('Whisper stderr:', data.toString());
    });
    
    whisperProcess.on('close', async (code) => {
      clearTimeout(timeout);
      
      if (code !== 0) {
        console.error('Whisper process exited with code', code);
        console.error('Stderr:', stderrData);
        return reject(new Error(`Whisper process failed with exit code ${code}`));
      }
      
      try {
        // Read the output text file, checking both possible file names
        const expectedOutputFile = `${outputFileBase}.txt`;
        const alternateOutputFile = `${expectedOutputFile}.txt`; // In case whisper adds double extension
        
        let outputFile = expectedOutputFile;
        if (!existsSync(expectedOutputFile) && existsSync(alternateOutputFile)) {
          outputFile = alternateOutputFile;
          console.log(`Using alternate output file: ${alternateOutputFile}`);
        }
        
        if (existsSync(outputFile)) {
          const transcriptionText = readFileSync(outputFile, 'utf8');
          resolve({ text: transcriptionText.trim() });
        } else {
          console.error('Output file not found. Checked paths:', expectedOutputFile, alternateOutputFile);
          reject(new Error('Output file not found'));
        }
      } catch (error) {
        console.error('Error reading Whisper output:', error);
        reject(error);
      }
    });
  });
}

// Find a free port and start the server
async function startServer() {
  try {
    const port = await findAvailablePort(DEFAULT_PORT);
    
    // Start the server using Bun's native HTTP server
    const server = Bun.serve({
      port,
      
      // Main request handler
      async fetch(req) {
        const url = new URL(req.url);
        const path = url.pathname;
        
        // Handle API requests
        if (path.startsWith('/api/speech-to-text') && req.method === 'POST') {
          try {
            const formData = await req.formData();
            const audioFile = formData.get('audio');
            const language = formData.get('language') || 'ru-RU';
            
            if (!audioFile) {
              return new Response(
                JSON.stringify({ error: 'No audio file provided' }), 
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              );
            }
            
            // Save the audio file
            const tempDir = join(process.env.TEMP || '/tmp', 'whisper-audio');
            if (!existsSync(tempDir)) {
              // Create the directory with recursive option to ensure it exists
              mkdirSync(tempDir, { recursive: true });
              await Bun.write(Bun.file(`${tempDir}/.keep`), '');
            }
            
            // Use a generic extension for the original file
            // We'll convert it to a proper WAV later
            const originalFilename = `recording_original_${Date.now()}`;
            const filePath = join(tempDir, originalFilename);
            
            console.log(`Audio file details - name: ${audioFile.name || 'unnamed'}, type: ${audioFile.type || 'unknown'}, size: ${audioFile.size} bytes`);
            
            // Write the audio content to a file
            if (audioFile instanceof File || audioFile instanceof Blob) {
              const audioBuffer = await audioFile.arrayBuffer();
              await Bun.write(filePath, audioBuffer);
              console.log(`Audio saved to ${filePath}, size: ${audioBuffer.byteLength} bytes`);
            } else {
              return new Response(
                JSON.stringify({ error: 'Invalid audio format' }), 
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              );
            }
            
            // Transcribe the audio
            try {
              // First convert the audio to WAV format
              const wavFilePath = await convertToWav(filePath);
              
              // Then transcribe using the converted file
              const result = await transcribeWithWhisper(wavFilePath, language.split('-')[0]);
              return new Response(
                JSON.stringify({ text: result.text }), 
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              );
            } catch (whisperError) {
              console.error('Whisper transcription failed:', whisperError);
              return new Response(
                JSON.stringify({ 
                  error: 'Ошибка распознавания речи', 
                  details: whisperError.message 
                }), 
                { status: 500, headers: { 'Content-Type': 'application/json' } }
              );
            }
          } catch (error) {
            console.error('API error:', error);
            return new Response(
              JSON.stringify({ error: error.message || 'Internal server error' }), 
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // Serve static files
        try {
          const filePath = path === '/' 
            ? join(BUILD_DIR, 'index.html') 
            : join(BUILD_DIR, path);
          
          // Check if file exists
          if (existsSync(filePath) && (await Bun.file(filePath).stat()).isFile()) {
            return new Response(Bun.file(filePath));
          }
          
          // For SPA routing, return index.html for non-API routes that don't match files
          if (!path.startsWith('/api/')) {
            return new Response(Bun.file(join(BUILD_DIR, 'index.html')));
          }
          
          // 404 for everything else
          return new Response("Not found", { status: 404 });
        } catch (error) {
          console.error('Error serving static file:', error);
          return new Response("Server error", { status: 500 });
        }
      }
    });
    
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📝 Speech-to-text API available at http://localhost:${port}/api/speech-to-text`);
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

export default await startServer(); 