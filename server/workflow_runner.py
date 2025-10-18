#!/usr/bin/env python3
"""
Workflow runner that executes the LangGraph workflow and streams progress
"""
import os
import sys
import json
import asyncio
from python_backend import (
    create_workflow,
    StreamingContentGenerator,
    LessonState
)


async def run_workflow():
    """Run the complete workflow with progress updates"""
    # Get input from environment
    input_json = os.getenv('LESSON_INPUT', '{}')
    input_data = json.loads(input_json)
    
    # Create workflow
    app = create_workflow()
    
    # Initial state
    initial_state: LessonState = {
        "topic": input_data["topic"],
        "age_group": input_data["age_group"],
        "knowledge_level": input_data["knowledge_level"],
        "lesson_plan": None,
        "key_points": [],
        "images_data": {},
        "analyzed_descriptions": {},
        "content_data": {},
        "quiz": None,
        "current_processing": "initializing",
        "completed_points": [],
        "errors": []
    }
    
    # Progress mapping
    progress_map = {
        "lesson_planning": (15, "📋 Planning Lesson..."),
        "image_search": (30, "🔍 Searching Images..."),
        "image_processing": (60, "🔬 Analyzing Images with Vision AI..."),
        "content_generation": (75, "✍️ Generating Content..."),
        "quiz_generation": (95, "📝 Creating Quiz...")
    }
    
    final_state = None
    
    # Execute workflow
    async for state in app.astream(initial_state):
        current_stage = list(state.keys())[0] if state else "unknown"
        current_state = list(state.values())[0] if state else {}
        
        # Send progress update
        if current_stage in progress_map:
            progress, message = progress_map[current_stage]
            print(json.dumps({
                "type": "progress",
                "stage": current_stage,
                "progress": progress,
                "message": message,
                "data": {
                    "lesson_plan": current_state.get("lesson_plan"),
                    "key_points": current_state.get("key_points", []),
                    "images_data": current_state.get("images_data", {}),
                    "analyzed_descriptions": current_state.get("analyzed_descriptions", {}),
                    "quiz": current_state.get("quiz"),
                    "current_processing": current_state.get("current_processing")
                }
            }), flush=True)
        
        final_state = current_state
    
    # Stream content for each point
    if final_state and final_state.get("key_points"):
        print(json.dumps({
            "type": "progress",
            "stage": "content_generation",
            "progress": 80,
            "message": "✨ Streaming Content...",
            "data": {}
        }), flush=True)
        
        # Stream content for all points
        generator = StreamingContentGenerator()
        for point in final_state["key_points"]:
            point_title = point["point_title"]
            analyzed_desc = final_state.get("analyzed_descriptions", {}).get(point_title, "")
            
            content = ""
            async for chunk in generator.stream_content_for_point(
                point,
                final_state["topic"],
                final_state["age_group"],
                final_state["knowledge_level"],
                analyzed_desc
            ):
                content += chunk
                print(json.dumps({
                    "type": "content_chunk",
                    "data": {
                        "point_title": point_title,
                        "chunk": chunk,
                        "complete": False
                    }
                }), flush=True)
            
            # Mark point complete
            print(json.dumps({
                "type": "content_chunk",
                "data": {
                    "point_title": point_title,
                    "chunk": "",
                    "complete": True
                }
            }), flush=True)
    
    # Send completion
    print(json.dumps({
        "type": "complete",
        "data": final_state
    }), flush=True)


if __name__ == "__main__":
    asyncio.run(run_workflow())
