import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create WebSocket server on /ws path (different from Vite HMR)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
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
  
  return httpServer;
}

async function handleLessonGeneration(ws: WebSocket, input: any) {
  const pythonScript = path.join(process.cwd(), 'server', 'workflow_runner.py');
  
  // Spawn Python process to run the workflow
  const python = spawn('python3', [pythonScript], {
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
