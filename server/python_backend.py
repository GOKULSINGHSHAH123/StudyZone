import os
import asyncio
import aiohttp
import json
import base64
import io
from typing import List, Dict, Optional, TypedDict
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from PIL import Image
import dotenv

# Load environment variables
dotenv.load_dotenv()

# LangChain and LangGraph imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langgraph.graph import StateGraph, END

# Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SEARCH_ENGINE_ID = os.getenv("SEARCH_ENGINE_ID")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
NUM_IMAGES_PER_QUERY = 5

# Initialize FastAPI app
app = FastAPI(title="Educational Content Generator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLMs
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=GEMINI_API_KEY,
    streaming=True,
    temperature=0.7
)

vision_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=GEMINI_API_KEY,
    temperature=0.3
)

# Pydantic models for request/response
class LessonRequest(BaseModel):
    topic: str
    age_group: str
    knowledge_level: str

class ContentStreamRequest(BaseModel):
    point: Dict
    topic: str
    age_group: str
    knowledge_level: str
    analyzed_description: str = ""

# State Definition
class LessonState(TypedDict):
    topic: str
    age_group: str
    knowledge_level: str
    lesson_plan: Optional[Dict]
    key_points: List[Dict]
    images_data: Dict[str, Dict]
    analyzed_descriptions: Dict[str, str]
    content_data: Dict[str, str]
    quiz: Optional[str]
    current_processing: str
    completed_points: List[str]
    errors: List[str]


# Async Image Processor
class AsyncImageProcessor:
    def __init__(self):
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15),
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def search_images(self, query: str) -> List[str]:
        """Search for images using Google Custom Search API"""
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                "key": GOOGLE_API_KEY,
                "cx": SEARCH_ENGINE_ID,
                "q": query,
                "searchType": "image",
                "num": NUM_IMAGES_PER_QUERY
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    items = data.get("items", [])
                    return [item.get("link", "") for item in items if item.get("link")]
                else:
                    print(f"Search API error: {response.status}")
                    return []
        except Exception as e:
            print(f"Image search error: {e}")
            return []
    
    async def download_image(self, url: str) -> Optional[Image.Image]:
        """Download and process image"""
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    image_data = await response.read()
                    img = Image.open(io.BytesIO(image_data)).convert("RGB")
                    max_size = (800, 800)
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                    return img
        except Exception as e:
            print(f"Download error for {url}: {e}")
            return None
        return None


# Vision Analysis
async def analyze_image_with_vision(image: Image.Image, point_title: str, visual_description: str) -> str:
    """Analyze actual image using vision model"""
    try:
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        analysis_prompt = f"""You are analyzing an educational image for the concept: "{point_title}"

Expected visual type: {visual_description}

Provide an EXTREMELY DETAILED description of what is ACTUALLY visible in this image:

**1. Overall Structure:**
- What type of visual is this? (diagram, flowchart, photograph, illustration, graph, etc.)
- What is the general layout and organization?

**2. Specific Elements:**
- List ALL visible text, labels, and annotations
- Describe shapes, symbols, and graphical elements
- Note colors and their significance
- Identify arrows, lines, connections

**3. Spatial Organization:**
- What's on the left, right, top, bottom?
- How are elements arranged?

**4. Key Visual Features:**
- What are the most prominent elements?
- What patterns or relationships are visible?

Be exhaustive and precise."""

        message = HumanMessage(
            content=[
                {"type": "text", "text": analysis_prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_base64}"}}
            ]
        )
        
        response = await vision_llm.ainvoke([message])
        return response.content
        
    except Exception as e:
        return f"Error analyzing image: {str(e)}"


# LangChain Chains
def create_lesson_planner_chain():
    """Create lesson planning chain"""
    prompt = ChatPromptTemplate.from_template("""
    Act as an expert instructional designer. Create a lesson plan for teaching: '{topic}'
    
    Audience: {age_group} with {knowledge_level} knowledge level.
    
    Provide a JSON response with this structure:
    {{
      "overview": "Brief description of the overall approach",
      "key_points": [
        {{
          "point_title": "Title of key concept",
          "explanation": "Brief description of what needs to be explained",
          "visual_type": "Type of image needed",
          "visual_description": "Detailed description of the ideal visual",
          "search_query": "Specific search query to find this visual"
        }}
      ]
    }}
    
    Create exactly 5 key points for comprehensive coverage.
    """)
    
    return prompt | llm | JsonOutputParser()


def create_quiz_generator_chain():
    """Create quiz generation chain"""
    prompt = ChatPromptTemplate.from_template("""
    Create a quiz for the topic: '{topic}'
    
    Key points covered: {key_points}
    
    Generate 5 multiple-choice questions that cover the main concepts. Format as:
    
    **Question 1:** [Question text]
    
    A) [Option A]
    B) [Option B] 
    C) [Option C]
    D) [Option D]
    
    **Correct Answer:** [Letter]
    **Explanation:** [Brief explanation]
    
    ---
    
    Continue for all 5 questions...
    """)
    
    return prompt | llm | StrOutputParser()

# Add this new chain function after create_quiz_generator_chain()
def create_roadmap_generator_chain():
    """Create roadmap generation chain"""
    prompt = ChatPromptTemplate.from_template("""
    Create a comprehensive learning roadmap for: '{topic}'
    
    Return a JSON object with this exact structure:
    {{
      "topic": "{topic}",
      "description": "Brief overview of what this learning path covers (2-3 sentences)",
      "totalDuration": "Estimated total time (e.g., '6-8 months')",
      "prerequisites": ["prerequisite 1", "prerequisite 2", "prerequisite 3"],
      "phases": [
        {{
          "phase": "Phase 1",
          "title": "Phase title describing what will be learned",
          "duration": "Time needed for this phase (e.g., '4-6 weeks')",
          "topics": [
            "Specific topic or skill 1",
            "Specific topic or skill 2",
            "Specific topic or skill 3",
            "Specific topic or skill 4",
            "Specific topic or skill 5"
          ],
          "resources": ["Resource type 1", "Resource type 2", "Resource type 3"]
        }}
      ],
      "careerPaths": [
        "Career option 1",
        "Career option 2",
        "Career option 3",
        "Career option 4"
      ]
    }}
    
    Guidelines:
    - Create 4-6 phases that progress from beginner to advanced
    - Each phase should have 5-8 specific, actionable topics
    - Include practical skills and theoretical knowledge
    - Suggest 2-4 resource types per phase (courses, books, projects, etc.)
    - List 4-6 realistic career opportunities
    - Make the roadmap comprehensive but achievable
    - Ensure topics within each phase are logically sequenced
    
    Return ONLY valid JSON, no markdown formatting or code blocks.
    """)
    
    return prompt | llm | JsonOutputParser()


# Add this new Pydantic model after ContentStreamRequest
class RoadmapRequest(BaseModel):
    topic: str



# LangGraph Nodes
async def lesson_planning_node(state: LessonState) -> LessonState:
    """Node 1: Plan the lesson structure"""
    try:
        planner_chain = create_lesson_planner_chain()
        lesson_plan = await planner_chain.ainvoke({
            "topic": state["topic"],
            "age_group": state["age_group"], 
            "knowledge_level": state["knowledge_level"]
        })
        
        return {
            **state,
            "lesson_plan": lesson_plan,
            "key_points": lesson_plan.get("key_points", []),
            "current_processing": "lesson_planning_complete"
        }
    except Exception as e:
        return {
            **state,
            "errors": state.get("errors", []) + [f"Lesson planning error: {e}"]
        }


async def image_search_node(state: LessonState) -> LessonState:
    """Node 2: Search for images in parallel"""
    if not state.get("key_points"):
        return state
        
    try:
        async with AsyncImageProcessor() as processor:
            search_tasks = []
            for point in state["key_points"]:
                search_tasks.append(processor.search_images(point["search_query"]))
            
            search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            images_data = {}
            for i, point in enumerate(state["key_points"]):
                if i < len(search_results) and not isinstance(search_results[i], Exception):
                    images_data[point["point_title"]] = {
                        "urls": search_results[i],
                        "images": [],
                        "best_image": None
                    }
        
        return {
            **state,
            "images_data": images_data,
            "current_processing": "image_search_complete"
        }
    except Exception as e:
        return {
            **state,
            "errors": state.get("errors", []) + [f"Image search error: {e}"]
        }


async def image_processing_node(state: LessonState) -> LessonState:
    """Node 3: Download, process AND ANALYZE images with vision"""
    if not state.get("images_data"):
        return state
        
    try:
        async with AsyncImageProcessor() as processor:
            processing_tasks = []
            url_to_point = {}
            
            for point_title, image_info in state["images_data"].items():
                urls = image_info.get("urls", [])
                for url in urls[:2]:  # Limit to 2 URLs per point
                    processing_tasks.append(processor.download_image(url))
                    url_to_point[len(processing_tasks) - 1] = (point_title, url)
            
            downloaded_images = await asyncio.gather(*processing_tasks, return_exceptions=True)
            
            updated_images_data = state["images_data"].copy()
            
            for idx, img in enumerate(downloaded_images):
                if idx in url_to_point and img and not isinstance(img, Exception):
                    point_title, url = url_to_point[idx]
                    
                    if point_title not in updated_images_data:
                        continue
                        
                    if "images" not in updated_images_data[point_title]:
                        updated_images_data[point_title]["images"] = []
                    
                    updated_images_data[point_title]["images"].append({
                        "url": url,
                        "score": 85
                    })
                    
                    if not updated_images_data[point_title].get("best_image"):
                        updated_images_data[point_title]["best_image"] = {
                            "url": url,
                            "score": 85,
                            "image": img  # Temporary for analysis
                        }
        
        # Analyze images with vision model
        analyzed_descriptions = {}
        analysis_tasks = []
        
        for point in state["key_points"]:
            point_title = point["point_title"]
            if (point_title in updated_images_data and 
                updated_images_data[point_title].get("best_image") and 
                updated_images_data[point_title]["best_image"].get("image")):
                analysis_tasks.append(
                    analyze_image_with_vision(
                        updated_images_data[point_title]["best_image"]["image"],
                        point_title,
                        point["visual_description"]
                    )
                )
            else:
                analysis_tasks.append(asyncio.sleep(0))
        
        analysis_results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
        
        for i, point in enumerate(state["key_points"]):
            point_title = point["point_title"]
            if i < len(analysis_results) and not isinstance(analysis_results[i], Exception):
                if isinstance(analysis_results[i], str) and analysis_results[i]:
                    analyzed_descriptions[point_title] = analysis_results[i]
        
        # Remove image objects before returning (can't serialize PIL images)
        for point_title in updated_images_data:
            if updated_images_data[point_title].get("best_image"):
                updated_images_data[point_title]["best_image"].pop("image", None)
        
        return {
            **state,
            "images_data": updated_images_data,
            "analyzed_descriptions": analyzed_descriptions,
            "current_processing": "image_processing_complete"
        }
    except Exception as e:
        return {
            **state,
            "errors": state.get("errors", []) + [f"Image processing error: {e}"]
        }


async def content_generation_node(state: LessonState) -> LessonState:
    """Node 4: Content generation placeholder (streaming happens separately)"""
    return {
        **state,
        "current_processing": "content_generation_complete"
    }


async def quiz_generation_node(state: LessonState) -> LessonState:
    """Node 5: Generate quiz"""
    if not state.get("key_points"):
        return state
        
    try:
        quiz_chain = create_quiz_generator_chain()
        key_points_text = ", ".join([point["point_title"] for point in state["key_points"]])
        
        quiz = await quiz_chain.ainvoke({
            "topic": state["topic"],
            "key_points": key_points_text
        })
        
        return {
            **state,
            "quiz": quiz,
            "current_processing": "quiz_complete"
        }
    except Exception as e:
        return {
            **state,
            "errors": state.get("errors", []) + [f"Quiz generation error: {e}"]
        }


# Create Workflow
def create_workflow():
    """Create the LangGraph workflow"""
    workflow = StateGraph(LessonState)
    
    workflow.add_node("lesson_planning", lesson_planning_node)
    workflow.add_node("image_search", image_search_node)
    workflow.add_node("image_processing", image_processing_node)
    workflow.add_node("content_generation", content_generation_node)
    workflow.add_node("quiz_generation", quiz_generation_node)
    
    workflow.set_entry_point("lesson_planning")
    workflow.add_edge("lesson_planning", "image_search")
    workflow.add_edge("image_search", "image_processing")
    workflow.add_edge("image_processing", "content_generation")
    workflow.add_edge("content_generation", "quiz_generation")
    workflow.add_edge("quiz_generation", END)
    
    return workflow.compile()


# Streaming Content Generator
class StreamingContentGenerator:
    """Handle streaming content generation"""
    
    async def stream_content_for_point(self, point: Dict, topic: str, age_group: str, 
                                      knowledge_level: str, actual_image_description: str = ""):
        """Stream content generation with vision-analyzed descriptions"""
        try:
            visual_info = actual_image_description if actual_image_description else point.get("visual_description", "")
            
            prompt = ChatPromptTemplate.from_template("""
            You are creating educational content that teaches students by reading and interpreting the actual visual shown.

            Topic: {topic}
            Key Concept: {point_title}
            Audience: {age_group} with {knowledge_level} knowledge level

            ACTUAL VISUAL PRESENT:
            {visual_info}

            Structure your response in an engaging format:

            🎯 **Explanation**
            - Use short paragraphs.
            - Include analogies or simple examples.

            👁️ **Visual Guidance**
            - Refer to specific elements in the visual.
            - Use bullet points or numbered steps to describe flow.

            💡 **Key Takeaways**
            - Provide 3-4 bullet points.
            - Highlight key words using **bold** or *italic*.

            🌍 **Real-world Connection**
            - Use 1-2 short paragraphs.
            - Include practical examples or relatable scenarios.

            ✨ Optional Tips:
            - Include emojis to make sections visually distinct.
            - Keep sentences short and easy to scan.
            """)

            
            chain = prompt | llm
            
            async for chunk in chain.astream({
                "point_title": point["point_title"],
                "topic": topic,
                "age_group": age_group,
                "knowledge_level": knowledge_level,
                "visual_info": visual_info
            }):
                if hasattr(chunk, 'content'):
                    yield chunk.content
                    
        except Exception as e:
            yield f"\n\n⚠️ Error generating content: {e}"


# FastAPI Routes
@app.get("/")
async def root():
    return {"message": "Educational Content Generator API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "educational-content-generator"}

@app.post("/generate-lesson")
async def generate_lesson(request: LessonRequest):
    """Generate complete lesson with images and quiz"""
    try:
        workflow = create_workflow()
        
        initial_state = {
            "topic": request.topic,
            "age_group": request.age_group,
            "knowledge_level": request.knowledge_level,
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
        
        final_state = None
        async for state in workflow.astream(initial_state):
            final_state = list(state.values())[0] if state else {}
        
        if not final_state:
            raise HTTPException(status_code=500, detail="Workflow failed to produce results")
        
        # Clean up the response
        response_data = {
            "topic": final_state.get("topic"),
            "age_group": final_state.get("age_group"),
            "knowledge_level": final_state.get("knowledge_level"),
            "lesson_plan": final_state.get("lesson_plan"),
            "key_points": final_state.get("key_points", []),
            "images_data": final_state.get("images_data", {}),
            "analyzed_descriptions": final_state.get("analyzed_descriptions", {}),
            "quiz": final_state.get("quiz"),
            "errors": final_state.get("errors", [])
        }
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lesson generation failed: {str(e)}")

@app.post("/stream-content")
async def stream_content(request: ContentStreamRequest):
    """Stream content generation for a specific point"""
    async def generate_content():
        generator = StreamingContentGenerator()
        async for chunk in generator.stream_content_for_point(
            request.point,
            request.topic,
            request.age_group,
            request.knowledge_level,
            request.analyzed_description
        ):
            yield chunk
    
    return StreamingResponse(generate_content(), media_type="text/plain")

# Add this new route after /stream-content
@app.post("/generate-roadmap")
async def generate_roadmap(request: RoadmapRequest):
    """Generate a learning roadmap for a specific topic"""
    try:
        roadmap_chain = create_roadmap_generator_chain()
        
        roadmap = await roadmap_chain.ainvoke({
            "topic": request.topic
        })
        
        return {
            "success": True,
            "roadmap": roadmap
        }
        
    except Exception as e:
        print(f"Roadmap generation error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate roadmap: {str(e)}"
        )

@app.post("/test-workflow")
async def test_workflow():
    """Test endpoint to verify workflow functionality"""
    try:
        test_request = LessonRequest(
            topic="Photosynthesis",
            age_group="high school",
            knowledge_level="beginner"
        )
        
        result = await generate_lesson(test_request)
        return {
            "success": True,
            "message": "Workflow test completed successfully",
            "data": {
                "topic": result["topic"],
                "key_points_count": len(result["key_points"]),
                "images_found": len(result["images_data"]),
                "errors": result["errors"]
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# Export for Node.js backend compatibility
async def run_workflow_async(input_data):
    """Run the complete workflow (for external use)"""
    workflow = create_workflow()
    
    initial_state = {
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
    
    final_state = None
    async for state in workflow.astream(initial_state):
        final_state = list(state.values())[0] if state else {}
    
    return final_state

async def stream_content_async(point, topic, age_group, knowledge_level, analyzed_desc):
    """Stream content for a single point (for external use)"""
    generator = StreamingContentGenerator()
    async for chunk in generator.stream_content_for_point(
        point, topic, age_group, knowledge_level, analyzed_desc
    ):
        yield chunk

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)