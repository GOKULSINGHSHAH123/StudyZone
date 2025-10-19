import streamlit as st
import asyncio
import aiohttp
import re
import json
import time
from typing import List, Dict, Optional, AsyncIterator, TypedDict
from dataclasses import dataclass
from PIL import Image
import io
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib

# LangChain and LangGraph imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langgraph.graph import StateGraph, END


# ---------- CONFIG ----------
GOOGLE_API_KEY = st.secrets.get("GOOGLE_API_KEY", "your_google_api_key")
SEARCH_ENGINE_ID = st.secrets.get("SEARCH_ENGINE_ID", "your_search_engine_id")
GEMINI_API_KEY = st.secrets.get("GEMINI_API_KEY", "your_gemini_api_key")
NUM_IMAGES_PER_QUERY = 5
MAX_CONCURRENT_REQUESTS = 8


# Initialize LLMs
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-exp",
    google_api_key=GEMINI_API_KEY,
    streaming=True,
    temperature=0.7
)

# Vision-capable LLM for image analysis
vision_llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-exp",
    google_api_key=GEMINI_API_KEY,
    temperature=0.3
)


# ---------- STATE DEFINITIONS ----------
class LessonState(TypedDict):
    topic: str
    age_group: str
    knowledge_level: str
    lesson_plan: Optional[Dict]
    key_points: List[Dict]
    images_data: Dict[str, Dict]
    analyzed_descriptions: Dict[str, str]  # NEW: Actual image descriptions
    content_data: Dict[str, str]
    quiz: Optional[str]
    current_processing: str
    completed_points: List[str]
    errors: List[str]


@dataclass
class ImageData:
    image: Image.Image
    url: str
    score: int
    evaluation: Dict


# ---------- ASYNC UTILITIES ----------
class AsyncImageProcessor:
    def __init__(self):
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15),
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
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
                return []
        except Exception as e:
            return []
    
    async def download_image(self, url: str) -> Optional[Image.Image]:
        """Download and process image"""
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    image_data = await response.read()
                    img = Image.open(io.BytesIO(image_data)).convert("RGB")
                    # Optimize image
                    max_size = (800, 800)
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                    return img
        except Exception:
            return None
        return None


# ---------- VISION ANALYSIS ----------
async def analyze_image_with_vision(image: Image.Image, point_title: str, visual_description: str) -> str:
    """Analyze actual image using vision model and create accurate description"""
    try:
        # Convert image to base64
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Create vision analysis prompt
        analysis_prompt = f"""You are analyzing an educational image for the concept: "{point_title}"

Expected visual type: {visual_description}

Your task is to provide an EXTREMELY DETAILED description of what is ACTUALLY visible in this image. This description will be used to create educational content that teaches students to read and interpret this specific visual.

Provide a comprehensive analysis covering:

**1. Overall Structure:**
- What type of visual is this? (diagram, flowchart, photograph, illustration, graph, etc.)
- What is the general layout and organization?

**2. Specific Elements (BE VERY DETAILED):**
- List ALL visible text, labels, and annotations
- Describe shapes, symbols, and graphical elements
- Note colors and their significance
- Identify arrows, lines, connections and what they show
- Describe any legends, keys, or scales

**3. Spatial Organization:**
- What's on the left, right, top, bottom?
- How are elements arranged relative to each other?
- What is the flow or sequence shown?

**4. Key Visual Features:**
- What are the most prominent elements?
- What patterns or relationships are visible?
- What makes this visual effective for teaching?

**5. Specific Details Students Should Notice:**
- What should students look at first?
- What details are easy to miss but important?
- What visual cues help understanding?

Be exhaustive and precise. If you see "X₁, X₂, X₃", write exactly that - don't generalize as "inputs."
If arrows point from A to B, specify the exact starting and ending points.
Describe colors specifically (not "dark color" but "dark blue" or "navy").

This description must enable someone who cannot see the image to understand it completely and accurately."""

        # Create message with image
        message = HumanMessage(
            content=[
                {"type": "text", "text": analysis_prompt},
                {
                    "type": "image_url", 
                    "image_url": {
                        "url": f"data:image/png;base64,{img_base64}"
                    }
                }
            ]
        )
        
        # Get analysis from vision model
        response = await vision_llm.ainvoke([message])
        return response.content
        
    except Exception as e:
        return f"Error analyzing image: {str(e)}. Using generic description: {visual_description}"


# ---------- LANGCHAIN CHAINS ----------
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
          "visual_type": "Type of image needed (diagram, flowchart, illustration, photograph, etc.)",
          "visual_description": "Detailed description of the ideal visual with specific elements that should be present (labels, colors, components, structure)",
          "search_query": "Specific search query to find this visual"
        }}
      ]
    }}
    
    Create exactly 5 key points for comprehensive coverage.
    Make sure the visual_description is VERY detailed and specific about what elements the image should contain.
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


# ---------- LANGGRAPH NODES ----------
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
            "errors": state["errors"] + [f"Lesson planning error: {e}"]
        }


async def image_search_node(state: LessonState) -> LessonState:
    """Node 2: Search for images in parallel"""
    if not state["key_points"]:
        return state
        
    try:
        async with AsyncImageProcessor() as processor:
            search_tasks = []
            for point in state["key_points"]:
                search_tasks.append(
                    processor.search_images(point["search_query"])
                )
            
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
            "errors": state["errors"] + [f"Image search error: {e}"]
        }


async def image_processing_node(state: LessonState) -> LessonState:
    """Node 3: Download, process AND ANALYZE images with vision"""
    if not state["images_data"]:
        return state
        
    try:
        async with AsyncImageProcessor() as processor:
            processing_tasks = []
            url_to_point = {}
            
            for point_title, image_info in state["images_data"].items():
                urls = image_info.get("urls", [])
                for url in urls[:2]:
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
                        "image": img,
                        "url": url,
                        "score": 85
                    })
                    
                    if not updated_images_data[point_title].get("best_image"):
                        updated_images_data[point_title]["best_image"] = {
                            "image": img,
                            "url": url,
                            "score": 85
                        }
        
        # NEW: Analyze each image with vision model
        analyzed_descriptions = {}
        analysis_tasks = []
        
        for point in state["key_points"]:
            point_title = point["point_title"]
            if point_title in updated_images_data and updated_images_data[point_title].get("best_image"):
                analysis_tasks.append(
                    analyze_image_with_vision(
                        updated_images_data[point_title]["best_image"]["image"],
                        point_title,
                        point["visual_description"]
                    )
                )
            else:
                analysis_tasks.append(asyncio.sleep(0))  # Placeholder
        
        # Analyze all images in parallel
        analysis_results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
        
        for i, point in enumerate(state["key_points"]):
            point_title = point["point_title"]
            if i < len(analysis_results) and not isinstance(analysis_results[i], Exception):
                if isinstance(analysis_results[i], str) and analysis_results[i]:
                    analyzed_descriptions[point_title] = analysis_results[i]
        
        return {
            **state,
            "images_data": updated_images_data,
            "analyzed_descriptions": analyzed_descriptions,  # NEW!
            "current_processing": "image_processing_complete"
        }
    except Exception as e:
        return {
            **state,
            "errors": state["errors"] + [f"Image processing error: {e}"]
        }


async def content_generation_node(state: LessonState) -> LessonState:
    """Node 4: Placeholder - actual streaming happens in UI with analyzed images"""
    return {
        **state,
        "current_processing": "content_generation_complete"
    }


async def quiz_generation_node(state: LessonState) -> LessonState:
    """Node 5: Generate quiz"""
    if not state["key_points"]:
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
            "errors": state["errors"] + [f"Quiz generation error: {e}"]
        }


# ---------- STREAMING CONTENT GENERATOR WITH VISION-ANALYZED DESCRIPTIONS ----------
class StreamingContentGenerator:
    """Handle streaming content generation with actual image analysis"""
    
    async def stream_content_for_point(self, point: Dict, topic: str, age_group: str, 
                                      knowledge_level: str, actual_image_description: str = ""):
        """Stream content generation with ACTUAL image details from vision analysis"""
        try:
            # Use actual image description if available, otherwise fall back to expected description
            visual_info = actual_image_description if actual_image_description else point["visual_description"]
            
            prompt = ChatPromptTemplate.from_template("""
            You are creating educational content that teaches students to understand concepts by READING AND INTERPRETING the ACTUAL VISUAL SHOWN.
            
            Topic: {topic}
            Key Concept: {point_title}
            Audience: {age_group} with {knowledge_level} knowledge level
            
            ACTUAL VISUAL PRESENT (analyzed by vision AI):
            {visual_info}
            
            ⚠️ CRITICAL REQUIREMENTS - FOLLOW STRICTLY:
            
            1. The description above is what is ACTUALLY in the image the student is seeing
            2. Reference ONLY elements that are described in the actual visual
            3. Use the EXACT labels, colors, and elements mentioned in the visual description
            4. If specific labels like "X₁, X₂" are mentioned, use those exact labels
            5. If colors are specified, reference those exact colors
            6. If positions are described, use those spatial references
            7. Guide students through the ACTUAL visual elements present
            8. DO NOT make up or imagine elements not mentioned in the visual description
            
            Structure your response EXACTLY as follows:
            
            **🎯 Explanation**
            
            Provide 2-3 engaging paragraphs introducing the concept for {age_group} with {knowledge_level} knowledge.
            Set up why this visual representation helps understanding.
            
            **👁️ Visual Guidance**
            
            THIS IS THE MOST IMPORTANT SECTION. Guide students through the ACTUAL visual:
            
            - Start with "Look at the [specific type mentioned in visual]..."
            - Reference ONLY the elements described in the visual analysis
            - Use the EXACT labels and terminology from the visual description
            - Walk through spatial relationships as described (left, right, top, bottom)
            - Point out the specific colors, shapes, and connections mentioned
            - Explain what each ACTUAL element represents
            - Use phrases like:
              * "Notice the [specific element from description]..."
              * "See the label that says [exact label]? This represents..."
              * "Follow the [specific connection described]..."
              * "The [exact color mentioned] section shows..."
            - Guide step-by-step through the visual flow as described
            
            **💡 Key Takeaways**
            
            Provide 3-4 bullet points that:
            • Reference the actual visual elements students just learned about
            • Connect those specific visual patterns to conceptual understanding
            • Highlight what students should remember from THIS specific visual
            
            **🌍 Real-world Connection**
            
            Provide 1-2 paragraphs showing:
            - How this concept applies in real life
            - Examples appropriate for {age_group}
            - Why understanding visual representations like this one matters
            
            Remember: Be ACCURATE. Only describe what's actually in the visual description provided!
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


# ---------- LANGGRAPH WORKFLOW ----------
def create_workflow():
    """Create the LangGraph workflow"""
    workflow = StateGraph(LessonState)
    
    workflow.add_node("lesson_planning", lesson_planning_node)
    workflow.add_node("image_search", image_search_node)
    workflow.add_node("image_processing", image_processing_node)  # Now includes vision analysis
    workflow.add_node("content_generation", content_generation_node)
    workflow.add_node("quiz_generation", quiz_generation_node)
    
    # Updated flow: analyze images BEFORE generating content
    workflow.set_entry_point("lesson_planning")
    workflow.add_edge("lesson_planning", "image_search")
    workflow.add_edge("image_search", "image_processing")  # Process & analyze images
    workflow.add_edge("image_processing", "content_generation")  # Then create content with analyzed data
    workflow.add_edge("content_generation", "quiz_generation")
    workflow.add_edge("quiz_generation", END)
    
    return workflow.compile()


# ---------- STREAMLIT APP ----------
st.set_page_config(
    page_title="LangGraph Visual Learning Assistant",
    page_icon="🚀",
    layout="wide"
)


# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
        font-weight: bold;
    }
    .sub-header {
        text-align: center;
        color: #6c757d;
        margin-bottom: 2rem;
    }
    .content-box {
        background-color: #f8f9fa;
        border-radius: 10px;
        padding: 1.5rem;
        min-height: 400px;
        border-left: 5px solid #007bff;
    }
    .image-container {
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        background-color: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
    }
    .status-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 25px;
        font-size: 0.9rem;
        font-weight: bold;
        display: inline-block;
        margin: 0.5rem 0;
    }
    .overview-box {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 15px;
        padding: 2rem;
        margin: 2rem 0;
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    .quiz-container {
        background-color: #fff3cd;
        border-radius: 15px;
        padding: 2rem;
        border-left: 6px solid #ffc107;
        margin-top: 2rem;
    }
    .vision-badge {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 0.3rem 0.8rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: bold;
        display: inline-block;
        margin-left: 0.5rem;
    }
</style>
""", unsafe_allow_html=True)


# Initialize session state
if "workflow_state" not in st.session_state:
    st.session_state.workflow_state = None


# Header
st.markdown('<h1 class="main-header">🚀 LangGraph Visual Learning Assistant</h1>', unsafe_allow_html=True)
st.markdown("""
<div class='sub-header'>
    <p style='font-size: 1.2rem;'><strong>Powered by LangGraph & LangChain</strong> <span class='vision-badge'>🔍 Vision AI</span></p>
    <p>Real-time parallel streaming • Vision-analyzed visuals • AI-powered content</p>
</div>
""", unsafe_allow_html=True)


# Sidebar
with st.sidebar:
    st.header("⚙️ Learning Preferences")
    
    age_group = st.selectbox(
        "🎓 Audience Age Group",
        ["Elementary School", "Middle School", "High School", "College", "Adult Learner"]
    )
    
    knowledge_level = st.selectbox(
        "📊 Knowledge Level", 
        ["Beginner", "Intermediate", "Advanced"]
    )
    
    st.divider()
    
    st.markdown("""
    ### 🚀 LangGraph Features
    
    ✅ **Parallel Processing**  
    All nodes run concurrently
    
    ✅ **Vision AI Analysis** 🔍  
    Images analyzed by AI before explaining
    
    ✅ **Real-time Streaming**  
    Content appears as generated
    
    ✅ **Accurate Visual Teaching**  
    References ACTUAL image elements
    
    ✅ **Async Operations**  
    Non-blocking processing
    
    ✅ **State Management**  
    Robust workflow tracking
    """)
    
    st.info("💡 **New:** Images are now analyzed by Vision AI to ensure accurate explanations!")


# Main interface
topic = st.text_input(
    "📚 Enter the topic you want to learn about:",
    placeholder="E.g., Photosynthesis, Machine Learning, Ancient Rome, Quantum Physics...",
    help="Be specific for better results"
)


if st.button("🚀 Generate Learning Experience", type="primary", use_container_width=True) and topic:
    
    # Initialize workflow
    app = create_workflow()
    
    # Initialize state
    initial_state = {
        "topic": topic,
        "age_group": age_group,
        "knowledge_level": knowledge_level,
        "lesson_plan": None,
        "key_points": [],
        "images_data": {},
        "analyzed_descriptions": {},  # NEW
        "content_data": {},
        "quiz": None,
        "current_processing": "initializing",
        "completed_points": [],
        "errors": []
    }
    
    # Create progress tracking
    progress_col1, progress_col2 = st.columns([3, 1])
    with progress_col1:
        progress_bar = st.progress(0)
    with progress_col2:
        status_text = st.empty()
    
    # Create containers
    overview_container = st.empty()
    content_section = st.container()
    quiz_container = st.empty()
    
    async def stream_all_points_parallel(state, point_containers):
        """Stream content for all points in parallel with vision-analyzed descriptions"""
        
        async def stream_single_point(container_info):
            """Stream content for one point"""
            point = container_info['point']
            content_placeholder = container_info['content_placeholder']
            point_title = container_info['point_title']
            
            generator = StreamingContentGenerator()
            content = ""
            
            # Get actual image description from vision analysis
            actual_description = state.get("analyzed_descriptions", {}).get(point_title, "")
            
            try:
                async for chunk in generator.stream_content_for_point(
                    point, 
                    state["topic"], 
                    state["age_group"], 
                    state["knowledge_level"],
                    actual_description  # Pass actual image description!
                ):
                    content += chunk
                    content_placeholder.markdown(content)
                    await asyncio.sleep(0.001)
                    
            except Exception as e:
                content_placeholder.error(f"⚠️ Error: {str(e)}")
        
        # Stream all points in parallel
        streaming_tasks = [stream_single_point(container) for container in point_containers]
        await asyncio.gather(*streaming_tasks)
    
    async def run_workflow():
        """Run the workflow with real-time updates"""
        try:
            final_state = None
            
            # Execute workflow
            async for state in app.astream(initial_state):
                current_stage = list(state.keys())[0] if state else "unknown"
                current_state = list(state.values())[0] if state else {}
                
                # Update progress
                progress_map = {
                    "lesson_planning": (15, "📋 Planning Lesson..."),
                    "image_search": (30, "🔍 Searching Images..."),
                    "image_processing": (60, "🔬 Analyzing Images with Vision AI..."),
                    "content_generation": (75, "✍️ Generating Content..."),
                    "quiz_generation": (95, "📝 Creating Quiz...")
                }
                
                if current_stage in progress_map:
                    progress, status = progress_map[current_stage]
                    progress_bar.progress(progress)
                    status_text.markdown(f'<span class="status-badge">{status}</span>', unsafe_allow_html=True)
                
                # Display lesson overview
                if current_state.get("lesson_plan"):
                    overview = current_state["lesson_plan"]["overview"]
                    overview_container.markdown(f"""
                    <div class="overview-box">
                        <h2 style="color: white; margin-top: 0;">📋 Lesson Overview</h2>
                        <p style="font-size: 1.1rem; line-height: 1.6;">{overview}</p>
                    </div>
                    """, unsafe_allow_html=True)
                
                final_state = current_state
            
            # Create point containers and start parallel streaming
            if final_state and final_state.get("key_points"):
                with content_section:
                    st.markdown("## 📚 Learning Content")
                    
                    # Show vision analysis status
                    num_analyzed = len(final_state.get("analyzed_descriptions", {}))
                    if num_analyzed > 0:
                        st.success(f"✨ {num_analyzed} images analyzed with Vision AI for accurate explanations")
                    else:
                        st.info("✨ Generating content with available descriptions")
                    
                    st.markdown("---")
                    
                    point_containers = []
                    
                    # Create all containers first
                    for i, point in enumerate(final_state["key_points"]):
                        point_title = point["point_title"]
                        
                        # Check if this image was analyzed
                        has_vision_analysis = point_title in final_state.get("analyzed_descriptions", {})
                        vision_badge = '<span class="vision-badge">🔍 Vision Analyzed</span>' if has_vision_analysis else ''
                        
                        # Header for each point
                        st.markdown(f"""
                        <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); 
                                    padding: 1rem; border-radius: 10px; margin: 1.5rem 0;">
                            <h3 style="color: white; margin: 0;">
                                📖 {i+1}. {point_title} {vision_badge}
                            </h3>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        # Two columns: image and content
                        col1, col2 = st.columns([1, 2])
                        
                        with col1:
                            img_placeholder = st.empty()
                            with img_placeholder.container():
                                st.info("🔄 Loading visual...")
                        
                        with col2:
                            content_placeholder = st.empty()
                            with content_placeholder.container():
                                st.info("🔄 Generating accurate content...")
                        
                        point_containers.append({
                            'point': point,
                            'img_placeholder': img_placeholder,
                            'content_placeholder': content_placeholder,
                            'point_title': point_title
                        })
                        
                        st.markdown("---")
                    
                    # Stream all content in parallel
                    status_text.markdown('<span class="status-badge">✨ Streaming Vision-Accurate Content...</span>', unsafe_allow_html=True)
                    await stream_all_points_parallel(final_state, point_containers)
                    
                    # Update images after streaming
                    if final_state.get("images_data"):
                        for container in point_containers:
                            point_title = container['point_title']
                            if point_title in final_state["images_data"]:
                                image_info = final_state["images_data"][point_title]
                                if image_info.get("best_image"):
                                    container['img_placeholder'].image(
                                        image_info["best_image"]["image"],
                                        caption=f"📷 Visual for: {point_title}",
                                        use_column_width=True
                                    )
                                else:
                                    container['img_placeholder'].warning("⚠️ No image available")
            
            # Display quiz
            if final_state and final_state.get("quiz"):
                with quiz_container.container():
                    st.markdown("""
                    <div class="quiz-container">
                        <h2 style="color: #856404;">📝 Knowledge Assessment</h2>
                        <p style="color: #856404;">Test your understanding with these questions:</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    st.markdown(final_state["quiz"])
                    
                    # Download button
                    st.download_button(
                        label="📥 Download Complete Learning Package",
                        data=f"""# {topic} - Complete Learning Package

## Overview
{final_state['lesson_plan']['overview']}

## Key Concepts
{chr(10).join([f"- {point['point_title']}" for point in final_state['key_points']])}

## Assessment
{final_state['quiz']}
""",
                        file_name=f"{topic.replace(' ', '_')}_learning_package.md",
                        mime="text/markdown",
                        use_container_width=True
                    )
            
            # Final status
            progress_bar.progress(100)
            status_text.markdown('<span class="status-badge">✅ Complete!</span>', unsafe_allow_html=True)
            
            # Store state
            st.session_state.workflow_state = final_state
            
        except Exception as e:
            st.error(f"❌ Workflow error: {str(e)}")
            import traceback
            st.code(traceback.format_exc())
    
    # Run the workflow
    try:
        asyncio.run(run_workflow())
    except Exception as e:
        st.error(f"❌ Failed to run workflow: {str(e)}")
        import traceback
        st.code(traceback.format_exc())


# Footer
st.divider()
st.markdown("""
<div style='text-align: center; color: #6c757d; padding: 2rem 0;'>
    <p style='font-size: 1.1rem; margin-bottom: 0.5rem;'>
        🚀 Powered by <strong>LangGraph</strong> & <strong>LangChain</strong> <span class='vision-badge'>🔍 Vision AI</span>
    </p>
    <p style='font-size: 0.9rem; color: #999;'>
        Vision-analyzed visuals • Accurate explanations • Real-time streaming • Visual-first learning
    </p>
</div>
""", unsafe_allow_html=True)
