import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create WebSocket server on /api/lesson-stream path
  const wss = new WebSocketServer({ server: httpServer, path: '/api/lesson-stream' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'generate_lesson') {
          await handleLessonGeneration(ws, data.data);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Failed to process request' }
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Add roadmap generation endpoint
  app.post("/api/roadmap/generate", async (req, res) => {
    try {
      const { topic } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      console.log(`Generating roadmap for: ${topic}`);

      const pythonScript = path.join(process.cwd(), 'server', 'roadmap_generator.py');
      
      // Create environment object with all current env vars plus ROADMAP_TOPIC
      const pythonEnv = {
        ...process.env,
        ROADMAP_TOPIC: topic,
        // Ensure these are passed through
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        PYTHONUNBUFFERED: '1' // Ensure output is not buffered
      };

      console.log(`Python script path: ${pythonScript}`);
      console.log(`GEMINI_API_KEY set: ${!!pythonEnv.GEMINI_API_KEY}`);
      
      const python = spawn('python', [pythonScript], {
        env: pythonEnv,
        cwd: process.cwd(),
        shell: true // Use shell to ensure proper env var passing on Windows
      });

      let outputData = '';
      let errorData = '';

      python.stdout.on('data', (data) => {
        const chunk = data.toString();
        outputData += chunk;
      });

      python.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorData += chunk;
        console.error('Python stderr:', chunk);
      });

      python.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        
        if (code !== 0) {
          console.error('Python error output:', errorData);
          return res.status(500).json({
            error: "Failed to generate roadmap",
            details: errorData || "Python process exited with error",
            exitCode: code
          });
        }

        try {
          // Clean output - remove any extra whitespace or newlines
          const cleanOutput = outputData.trim();
          const result = JSON.parse(cleanOutput);
          
          if (result.success) {
            console.log('Roadmap generated successfully');
            res.json({ roadmap: result.roadmap });
          } else {
            console.error('Roadmap generation failed:', result.error);
            res.status(500).json({
              error: result.error || "Failed to generate roadmap"
            });
          }
        } catch (parseError: any) {
          console.error('JSON parse error:', parseError.message);
          console.error('Raw output:', outputData);
          res.status(500).json({
            error: "Failed to parse roadmap response",
            details: parseError.message,
            rawOutput: outputData.substring(0, 500)
          });
        }
      });

      python.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        res.status(500).json({
          error: "Failed to start Python process",
          details: err.message
        });
      });

    } catch (error: any) {
      console.error("Roadmap generation error:", error);
      res.status(500).json({
        error: "Failed to generate roadmap",
        details: error.message
      });
    }
  });
  
  return httpServer;
}

async function handleLessonGeneration(ws: WebSocket, input: any) {
  const pythonScript = path.join(process.cwd(), 'server', 'workflow_runner.py');
  
  const python = spawn('python', [pythonScript], {
    env: {
      ...process.env,
      LESSON_INPUT: JSON.stringify(input)
    }
  });
  
  let currentState: any = {};
  
  python.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter((line: string) => line.trim());
    
    for (const line of lines) {
      try {
        const message = JSON.parse(line);
        
        if (message.type === 'progress') {
          currentState = { ...currentState, ...message.data };
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'progress',
              data: {
                stage: message.stage,
                progress: message.progress || 0,
                message: message.message || '',
                data: message.data
              }
            }));
          }
        } else if (message.type === 'content_chunk') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'content_chunk',
              data: message.data
            }));
          }
        } else if (message.type === 'complete') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'complete',
              data: currentState
            }));
          }
        }
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  });
  
  python.stderr.on('data', (data) => {
    console.error('Python error:', data.toString());
  });
  
  python.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    if (code !== 0 && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Workflow execution failed' }
      }));
    }
  });
}
