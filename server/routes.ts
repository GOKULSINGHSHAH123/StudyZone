import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import path from "path";
import * as dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

// In-memory storage (or use a database like SQLite/MongoDB)
const roadmapHistory: Map<string, any> = new Map();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
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

  // Roadmap generation endpoint
  app.post("/api/roadmap/generate", async (req, res) => {
    try {
      const { topic } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      console.log(`Generating roadmap for: ${topic}`);

      const pythonScript = path.join(process.cwd(), 'server', 'roadmap_generator.py');
      
      const pythonEnv = {
        ...process.env,
        ROADMAP_TOPIC: topic,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        PYTHONUNBUFFERED: '1'
      };

      console.log(`Python script path: ${pythonScript}`);
      console.log(`GEMINI_API_KEY set: ${!!pythonEnv.GEMINI_API_KEY}`);
      
      const python = spawn('python', [pythonScript], {
        env: pythonEnv,
        cwd: process.cwd(),
        shell: true
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
          const lines = outputData.trim().split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            throw new Error('No output received from Python script');
          }
          
          const parsedData = lines.map(line => JSON.parse(line));
          
          const metadataObj = parsedData.find(item => item.type === 'metadata');
          const phaseObjs = parsedData.filter(item => item.type === 'phase');
          
          if (!metadataObj) {
            throw new Error('No metadata found in response');
          }
          
          const roadmap = {
            ...metadataObj.data,
            phases: phaseObjs.map(p => p.data)
          };
          
          // Save to history with timestamp and unique ID
          const roadmapId = Date.now().toString();
          const historyEntry = {
            id: roadmapId,
            topic,
            roadmap,
            createdAt: new Date().toISOString()
          };
          
          roadmapHistory.set(roadmapId, historyEntry);
          
          console.log('Roadmap generated successfully');
          res.json({ roadmap, roadmapId });
          
        } catch (parseError: any) {
          console.error('JSON parse error:', parseError.message);
          console.error('Raw output:', outputData.substring(0, 1000));
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

  // NEW: Get roadmap history
  app.get("/api/roadmap/history", async (req, res) => {
    try {
      const history = Array.from(roadmapHistory.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // NEW: Get specific roadmap from history
  app.get("/api/roadmap/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const roadmapEntry = roadmapHistory.get(id);
      
      if (!roadmapEntry) {
        return res.status(404).json({ error: "Roadmap not found" });
      }
      
      res.json(roadmapEntry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // NEW: Generate detailed content for a specific topic
  app.post("/api/roadmap/generate-topic-content", async (req, res) => {
    try {
      const { topic, phase, topicTitle } = req.body;

      if (!topic || !topicTitle) {
        return res.status(400).json({ error: "Topic and topicTitle are required" });
      }

      console.log(`Generating content for: ${topicTitle} in ${phase}`);

      const pythonScript = path.join(process.cwd(), 'server', 'topic_content_generator.py');
      
      const pythonEnv = {
        ...process.env,
        ROADMAP_TOPIC: topic,
        PHASE_INFO: phase,
        TOPIC_TITLE: topicTitle,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        PYTHONUNBUFFERED: '1'
      };
      
      const python = spawn('python', [pythonScript], {
        env: pythonEnv,
        cwd: process.cwd(),
        shell: true
      });

      let outputData = '';
      let errorData = '';

      python.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          return res.status(500).json({
            error: "Failed to generate topic content",
            details: errorData
          });
        }

        try {
          const result = JSON.parse(outputData.trim());
          res.json(result);
        } catch (error: any) {
          res.status(500).json({
            error: "Failed to parse content",
            details: error.message
          });
        }
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
