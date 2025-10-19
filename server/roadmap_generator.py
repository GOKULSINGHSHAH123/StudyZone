import os
import sys
import json
import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import dotenv

dotenv.load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=GEMINI_API_KEY,
    temperature=0.7,
    streaming=True  # Enable streaming
)

def create_phase_generator_chain():
    """Create chain to generate one phase at a time"""
    prompt = ChatPromptTemplate.from_template("""
    Create phase {phase_number} for a learning roadmap on '{topic}'.
    This is phase {phase_number} of {total_phases}.
    
    Previous phases context: {previous_context}
    
    Return a JSON object:
    {{
      "phase": "Phase {phase_number}",
      "title": "Clear title for this phase",
      "duration": "Time needed (e.g., '4-6 weeks')",
      "topics": ["topic 1", "topic 2", "topic 3", "topic 4", "topic 5"],
      "resources": ["resource type 1", "resource type 2"]
    }}
    
    Return ONLY valid JSON.
    """)
    return prompt | llm | JsonOutputParser()

async def generate_roadmap_metadata(topic: str):
    """Generate roadmap header info first"""
    prompt = ChatPromptTemplate.from_template("""
    For the topic '{topic}', provide:
    {{
      "topic": "{topic}",
      "description": "Brief 2-3 sentence overview",
      "totalDuration": "Total time estimate",
      "prerequisites": ["prereq 1", "prereq 2", "prereq 3"],
      "totalPhases": 5,
      "careerPaths": ["career 1", "career 2", "career 3", "career 4"]
    }}
    Return ONLY valid JSON.
    """)
    chain = prompt | llm | JsonOutputParser()
    return await chain.ainvoke({"topic": topic})

async def stream_roadmap_phases(topic: str):
    """Stream roadmap phases one by one"""
    try:
        # First, send metadata
        metadata = await generate_roadmap_metadata(topic)
        yield json.dumps({"type": "metadata", "data": metadata}) + "\n"
        
        # Generate and stream each phase
        phase_chain = create_phase_generator_chain()
        total_phases = metadata.get("totalPhases", 5)
        previous_context = ""
        
        for phase_num in range(1, total_phases + 1):
            phase = await phase_chain.ainvoke({
                "topic": topic,
                "phase_number": phase_num,
                "total_phases": total_phases,
                "previous_context": previous_context
            })
            
            yield json.dumps({"type": "phase", "data": phase}) + "\n"
            
            # Update context for next phase
            previous_context += f"Phase {phase_num}: {phase.get('title', '')}\n"
            
            # Small delay for smooth streaming
            await asyncio.sleep(0.5)
            
    except Exception as e:
        yield json.dumps({"type": "error", "error": str(e)}) + "\n"

if __name__ == "__main__":
    topic = os.getenv("ROADMAP_TOPIC")
    
    if not topic:
        print(json.dumps({"error": "No topic provided"}))
        sys.exit(1)
    
    async def main():
        async for chunk in stream_roadmap_phases(topic):
            print(chunk, end="", flush=True)
    
    asyncio.run(main())
