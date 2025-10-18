import { z } from "zod";

// Lesson generation types
export interface KeyPoint {
  point_title: string;
  explanation: string;
  visual_type: string;
  visual_description: string;
  search_query: string;
}

export interface LessonPlan {
  overview: string;
  key_points: KeyPoint[];
}

export interface ImageInfo {
  url: string;
  score: number;
}

export interface ImagesData {
  [pointTitle: string]: {
    urls: string[];
    images: ImageInfo[];
    best_image?: ImageInfo;
  };
}

export interface AnalyzedDescriptions {
  [pointTitle: string]: string;
}

export interface LessonState {
  topic: string;
  age_group: string;
  knowledge_level: string;
  lesson_plan?: LessonPlan;
  key_points: KeyPoint[];
  images_data: ImagesData;
  analyzed_descriptions: AnalyzedDescriptions;
  content_data: { [key: string]: string };
  quiz?: string;
  current_processing: string;
  completed_points: string[];
  errors: string[];
}

// WebSocket message types
export type WorkflowStage =
  | "initializing"
  | "lesson_planning"
  | "lesson_planning_complete"
  | "image_search"
  | "image_search_complete"
  | "image_processing"
  | "image_processing_complete"
  | "content_generation"
  | "content_generation_complete"
  | "quiz_generation"
  | "quiz_complete"
  | "complete"
  | "error";

export interface ProgressUpdate {
  stage: WorkflowStage;
  progress: number;
  message: string;
  data?: Partial<LessonState>;
}

export interface ContentChunk {
  point_title: string;
  chunk: string;
  complete: boolean;
}

// Form input schemas
export const lessonInputSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  age_group: z.enum([
    "Elementary School",
    "Middle School",
    "High School",
    "College",
    "Adult Learner"
  ]),
  knowledge_level: z.enum(["Beginner", "Intermediate", "Advanced"])
});

export type LessonInput = z.infer<typeof lessonInputSchema>;

// Quiz question type
export interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}
