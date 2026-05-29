from google import genai
from google.genai import types
import logging
from backend.app.core.config import settings

# Setup standard logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_coach")

SYSTEM_INSTRUCTION = (
    "You are a stellar Lead Developer and Career Mentor. You guide the user with highly professional, "
    "production-grade advice. Keep explanations concise, use Markdown code blocks for code snippets, "
    "and explain the software engineering rationale behind your decisions. Help them scale apps, prepare "
    "for technical DSA or system design interviews, and review their progress."
)

class CareerCoachService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.use_mock = not self.api_key or self.api_key == "your_gemini_api_key_here" or self.api_key == ""
        
        if not self.use_mock:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Gemini API client successfully configured for CareerCoach.")
            except Exception as e:
                logger.error(f"Error configuring Gemini API: {str(e)}. Falling back to Mock.")
                self.use_mock = True
        else:
            logger.info("No Gemini API key detected. Running CareerCoach in developer mock mode.")
        
    def generate_chat_response(self, message: str, history: list, context: str = None) -> str:
        if self.use_mock:
            return self._generate_mock_response(message, context)
        
        try:
            # Format history for google-genai
            contents = []
            for item in history:
                role = "user" if item.get("role") == "user" else "model"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=item.get("message", ""))]
                    )
                )
            # Add user message
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=message)]
                )
            )
            
            # Dynamically ground instruction with RAG context
            system_instruction = SYSTEM_INSTRUCTION
            if context:
                system_instruction += (
                    f"\n\n[CONTEXT GROUNDING]: The user has uploaded a tech resume or technical document. "
                    f"Use the following highly relevant matching document snippets to answer their question with extreme specificity. "
                    f"Prioritize and ground your recommendations directly in these details, referencing their specific technologies, metrics, or facts:\n{context}"
                )
            
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API runtime error: {str(e)}. Using fallback response.")
            return self._generate_mock_response(message, context)

    def generate_chat_stream(self, message: str, history: list, context: str = None):
        if self.use_mock:
            for chunk in self._generate_mock_stream(message, context):
                yield chunk
            return
            
        try:
            # Format history for google-genai
            contents = []
            for item in history:
                role = "user" if item.get("role") == "user" else "model"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=item.get("message", ""))]
                    )
                )
            # Add user message
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=message)]
                )
            )
            
            # Dynamically ground instruction with RAG context
            system_instruction = SYSTEM_INSTRUCTION
            if context:
                system_instruction += (
                    f"\n\n[CONTEXT GROUNDING]: The user has uploaded a tech resume or technical document. "
                    f"Use the following highly relevant matching document snippets to answer their question with extreme specificity. "
                    f"Prioritize and ground your recommendations directly in these details, referencing their specific technologies, metrics, or facts:\n{context}"
                )
            
            response_stream = self.client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error(f"Gemini streaming runtime error: {str(e)}. Using fallback stream.")
            for chunk in self._generate_mock_stream(message, context):
                yield chunk

    def _generate_mock_stream(self, message: str, context: str = None):
        response_text = self._generate_mock_response(message, context)
        # Yield in small typing-like chunks
        chunk_size = 15
        for i in range(0, len(response_text), chunk_size):
            yield response_text[i:i+chunk_size]
            import time
            time.sleep(0.02)
            
    def _generate_mock_response(self, message: str, context: str = None) -> str:
        # Check if RAG context exists
        if context:
            clean_context = context.replace("\n", " ")[:160] + "..."
            return (
                f"### 🤖 Career Mentor & Lead Dev AI [RAG Grounded Response]\n\n"
                f"I have successfully indexed your resume/documentation and retrieved the following matching context for your query:\n"
                f"> *\"{clean_context}\"*\n\n"
                f"Based on your uploaded resume details, here is my expert technical coaching assessment:\n\n"
                f"1. **Direct Documentation Analysis**: Your uploaded technical files highlight these matched keywords. To build a senior-grade narrative, rewrite this bullet in your resume using the **STAR formula** by explaining the *Situation, Task, Action,* and *Result* with measurable metrics (e.g. *'Optimized API response time by 45% using async/await and caching'*).\n"
                f"2. **Technical Upskilling Integration**: To execute or scale the systems described in your document, configure clean FastAPI async route handlers and check for database transactional safety.\n\n"
                f"What specific section or system architecture in your uploaded document would you like to rewrite or design next?"
            )
        
        # Beautiful, detailed developer mock responses to let users test without a key
        msg_lower = message.lower()
        if "dsa" in msg_lower or "two sum" in msg_lower or "leetcode" in msg_lower:
            return (
                "### 🚀 Lead Developer Insight: DSA and Two Sum Optimization\n\n"
                "Excellent choice starting with LeetCode warmup! Let's review **Two Sum** in Python. "
                "The naive approach takes $O(N^2)$ time with a double loop, but in production, we must optimize for $O(N)$ speed.\n\n"
                "Here is the industry-standard implementation using a hash map:\n\n"
                "```python\n"
                "def two_sum(nums: list[int], target: int) -> list[int]:\n"
                "    # Interview TIP: Storing indices in a dictionary (hash map) allows O(1) lookups\n"
                "    seen = {}\n"
                "    for index, val in enumerate(nums):\n"
                "        diff = target - val\n"
                "        if diff in seen:\n"
                "            return [seen[diff], index]\n"
                "        seen[val] = index\n"
                "    return []\n"
                "```\n\n"
                "**Why this is Senior-Grade:**\n"
                "1. **Time Complexity**: $O(N)$ as we traverse the list only once.\n"
                "2. **Space Complexity**: $O(N)$ to store elements in the hash map.\n\n"
                "Would you like to analyze standard edge cases or try another problem?"
            )
        elif "system design" in msg_lower or "scale" in msg_lower or "database" in msg_lower:
            return (
                "### 🏛️ Lead Developer Insight: System Design Scaling (1 to 10M Users)\n\n"
                "Scaling a system from scratch requires a modular, layered architecture. Here are the core pillars of scaling:\n\n"
                "1. **Single Server Base**: Fast prototyping (e.g. FastAPI + SQLite/Postgres) is great initially, but creates a single point of failure.\n"
                "2. **Horizontal Scaling**: Switch from one massive server to multiple stateless app servers behind a **Load Balancer** (like NGINX or AWS ALB).\n"
                "3. **Database Layer Optimization**:\n"
                "   - Introduce **Read Replicas** for read-heavy apps (e.g. 1 Master for writes, multiple Replicas for reads).\n"
                "   - Implement **Caching** with Redis to store frequently queried items.\n"
                "   - Apply **Database Sharding** when database tables grow past horizontal limits.\n\n"
                "Here is the standard microservice request flow:\n"
                "```\n"
                "User Request ➔ CDN (Static Content) ➔ Load Balancer ➔ Stateless Servers ➔ Redis Cache ➔ PostgreSQL DB\n"
                "```\n\n"
                "What specific tier (caching, load balancing, databases) would you like to deep-dive into next?"
            )
        elif "resume" in msg_lower or "career" in msg_lower or "interview" in msg_lower:
            return (
                "### 💼 Career Mentor Guide: Stellar Tech Resumes\n\n"
                "To catch the eye of top-tier hiring managers, your resume must shift from *actions performed* to *measurable impact*.\n\n"
                "**Use the STAR/XYZ Formula:**\n"
                "- *Bad*: 'Added calendar scheduler backend features to our FastAPI backend.'\n"
                "- *Senior*: 'Designed and deployed an automated daily scheduler using FastAPI and SQLite, reducing scheduling overhead by 40% and storing up to 50 active tasks per user session.'\n\n"
                "**Key Focus Areas to Showcase:**\n"
                "1. **Architecture decisions**: Explain *why* you chose FastAPI (high performance, async support, auto-documentation) and SQLAlchemy.\n"
                "2. **Production tooling**: Ruff, Docker, Github Actions, automated testing.\n\n"
                "Send me a bullet point from your current resume, and let's rewrite it together for high impact!"
            )
        else:
            return (
                "### 👋 Welcome to your AI Career Coach & Lead Developer workspace!\n\n"
                "I am your senior mentor. I can assist you with:\n"
                "- 💻 **Full Stack Python & FastAPI**: Coding patterns, clean architecture, database relationships.\n"
                "- 🧠 **DSA Warmups & Coding Practice**: LeetCode solutions, time/space complexity analysis.\n"
                "- 🏛️ **System Design & Scaling**: CDN caching, horizontal databases, queue brokers.\n"
                "- 💼 **Resume Optimization & Career Growth**: STAR format bullet points, salary negotiation tips.\n\n"
                "*Note: The Gemini API Key is not set or is invalid in `.env`, so I am running in developer preview mode! Set `GEMINI_API_KEY` to unlock live Gemini responses.*\n\n"
                "How can I accelerate your software engineering growth today?"
            )

career_coach_service = CareerCoachService()
