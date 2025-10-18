import { useState, useEffect, useRef } from "react";
import type { LessonInput, LessonState, ProgressUpdate, ContentChunk } from "@shared/schema";

export function useLesson() {
  const [lessonState, setLessonState] = useState<LessonState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const startLesson = async (input: LessonInput) => {
    // Initialize state
    const initialState: LessonState = {
      topic: input.topic,
      age_group: input.age_group,
      knowledge_level: input.knowledge_level,
      key_points: [],
      images_data: {},
      analyzed_descriptions: {},
      content_data: {},
      current_processing: "initializing",
      completed_points: [],
      errors: []
    };
    
    setLessonState(initialState);

    // Connect to WebSocket for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/lesson-stream`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send lesson generation request
      ws.send(JSON.stringify({
        type: "generate_lesson",
        data: input
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === "progress") {
        const update: ProgressUpdate = message.data;
        setLessonState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            current_processing: update.stage,
            ...update.data
          };
        });
      } else if (message.type === "content_chunk") {
        const chunk: ContentChunk = message.data;
        setLessonState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            content_data: {
              ...prev.content_data,
              [chunk.point_title]: (prev.content_data[chunk.point_title] || "") + chunk.chunk
            }
          };
        });
      } else if (message.type === "complete") {
        setLessonState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            current_processing: "complete"
          };
        });
      } else if (message.type === "error") {
        setLessonState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            errors: [...prev.errors, message.data.message]
          };
        });
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setLessonState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          errors: [...prev.errors, "Connection error occurred"]
        };
      });
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  };

  const clearLesson = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    setLessonState(null);
  };

  useEffect(() => {
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    lessonState,
    startLesson,
    clearLesson
  };
}
