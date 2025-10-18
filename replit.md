# Visual Learning Assistant

## Overview
An investor-ready AI-powered visual learning assistant that generates comprehensive lesson plans with vision-analyzed images and interactive quizzes. Built with React TypeScript frontend and Python backend using LangGraph for workflow orchestration.

## Purpose
This prototype demonstrates:
- Real-time AI lesson generation with LangGraph workflow
- Vision AI analysis of educational images for accurate explanations
- Interactive quiz generation
- Professional dark-themed educational UI
- WebSocket-powered real-time progress updates

## Current State
**Phase 1 Complete**: All React components and UI built with dark theme
- Dashboard with topic input form
- Workflow visualizer with animated progress nodes
- Lesson display with vision-analyzed images
- Interactive quiz component
- Beautiful loading states and animations

**In Progress**: Backend Python implementation with LangGraph

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript, Wouter routing
- **Styling**: Tailwind CSS with dark theme, Shadcn UI components
- **State**: React Query for API state, custom hooks for WebSocket
- **Real-time**: WebSocket client for progress streaming

### Backend (Python - To be implemented)
- **Framework**: Flask/FastAPI with WebSocket support
- **AI**: Google Gemini API for lesson planning and vision analysis
- **Workflow**: LangGraph for orchestrating parallel image search and analysis
- **Search**: Google Custom Search API for educational images

### Key Features
1. **AI Lesson Planning**: Gemini generates structured lessons with 5 key points
2. **Parallel Image Search**: Searches for relevant educational visuals
3. **Vision Analysis**: AI analyzes actual images to create accurate descriptions
4. **Content Streaming**: Real-time content generation via WebSocket
5. **Interactive Quiz**: AI-generated questions with explanations

## Project Structure
```
client/src/
  ├── pages/
  │   └── Dashboard.tsx         # Main learning interface
  ├── components/
  │   ├── WorkflowVisualizer.tsx # Animated progress nodes
  │   ├── LessonDisplay.tsx      # Key points with images
  │   └── QuizDisplay.tsx        # Interactive assessment
  ├── hooks/
  │   └── useLesson.ts          # WebSocket lesson generation
  └── App.tsx

shared/
  └── schema.ts                 # TypeScript interfaces for lesson data

server/ (To be implemented)
  ├── routes.ts                 # WebSocket and API endpoints
  └── python/                   # LangGraph workflow
```

## Design System
- **Theme**: Dark mode with educational aesthetics
- **Colors**: Primary (indigo), Secondary (purple), Success (green), Warning (amber)
- **Typography**: Inter for interface, JetBrains Mono for code
- **Animations**: Subtle pulse for processing, smooth transitions
- **Spacing**: Consistent 8px grid system

## API Keys Required
- `GEMINI_API_KEY`: Google AI Studio for Gemini models
- `GOOGLE_API_KEY`: Google Cloud for Custom Search
- `SEARCH_ENGINE_ID`: Custom Search Engine ID

## User Preferences
- Dark theme preferred for extended learning sessions
- Professional, investor-ready appearance
- Smooth animations and real-time feedback
- Focus on visual quality and polish

## Recent Changes
- January 2025: Complete frontend implementation with dark theme
- All React components built following design guidelines
- WebSocket hook prepared for backend integration
