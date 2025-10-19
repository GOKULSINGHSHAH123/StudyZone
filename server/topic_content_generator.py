import os
import sys
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import dotenv

dotenv.load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=GEMINI_API_KEY,
    temperature=0.7
)

def generate_topic_content(topic: str, phase: str, topic_title: str):
    """Generate detailed educational content for a specific topic"""
    
    prompt = ChatPromptTemplate.from_template("""
    You are an expert educational content creator specializing in {topic}.
    
    Context:
    - Overall Learning Path: {topic}
    - Current Phase: {phase}
    - Specific Topic: {topic_title}
    
    Create comprehensive, engaging educational content for this topic. Structure your response with:
    
    ## 📚 Introduction
    Write 2-3 paragraphs introducing the topic and why it's important in the context of {topic}.
    
    ## 🎯 Core Concepts
    Explain the fundamental concepts in detail. Use clear examples and analogies.
    
    ## 💡 Key Points to Remember
    - List 5-7 critical takeaways
    - Each point should be actionable and memorable
    - Bold important terms within sentences
    
    ## 🛠️ Practical Applications
    Describe 2-3 real-world scenarios where this knowledge is applied.
    
    ## 📖 Learning Resources
    Suggest specific resources:
    - Online courses or tutorials
    - Documentation to read
    - Practice exercises
    - Projects to build
    
    ## ✅ Self-Assessment Questions
    Provide 3-5 questions learners should be able to answer after studying this topic.
    
    Make the content comprehensive, engaging, and suitable for learners progressing through the {topic} roadmap.
    """)
    
    chain = prompt | llm | StrOutputParser()
    
    content = chain.invoke({
        "topic": topic,
        "phase": phase,
        "topic_title": topic_title
    })
    
    return content

if __name__ == "__main__":
    topic = os.getenv("ROADMAP_TOPIC", "")
    phase = os.getenv("PHASE_INFO", "")
    topic_title = os.getenv("TOPIC_TITLE", "")
    
    if not topic or not topic_title:
        print(json.dumps({"error": "Missing required parameters"}))
        sys.exit(1)
    
    try:
        content = generate_topic_content(topic, phase, topic_title)
        result = {
            "success": True,
            "content": content,
            "topic": topic_title
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
