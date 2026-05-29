from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.services.career_coach import career_coach_service
from backend.app.services.rag import rag_service
from backend.app.models.document import IndexedDocument
from backend.app.schemas.document import IndexedDocumentResponse

router = APIRouter()

# Input validation schemas using Pydantic V2
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role in chat: 'user' or 'model'")
    message: str = Field(..., description="The message content")

class ChatPayload(BaseModel):
    message: str = Field(..., description="The new user message to the coach")
    history: List[ChatMessage] = Field(default=[], description="Chat history context list")

class ChatResponse(BaseModel):
    response: str = Field(..., description="The generated Markdown response from the career coach")

# Curated high-yield prompt guides to showcase in the frontend
PRELOADED_PROMPTS = [
    {
        "title": "LeetCode Warmup (DSA)",
        "icon": "🧠",
        "prompt": "Let's do a quick LeetCode DSA warmup! Give me a solid Arrays or Hashing problem to solve, complete with hints, and help me analyze its Time and Space complexity.",
        "category": "DSA"
    },
    {
        "title": "System Design: Scale to 10M",
        "icon": "🏛️",
        "prompt": "Explain the step-by-step system design strategy to scale an application from 1 to 10 million users. Focus on caching, load balancing, and database sharding.",
        "category": "System Design"
    },
    {
        "title": "FastAPI Async Clean Coding",
        "icon": "💻",
        "prompt": "Show me a senior-grade example of a clean FastAPI async route handler using dependency injection (Depends) and SQLAlchemy transactions.",
        "category": "FastAPI"
    },
    {
        "title": "Optimize Resume for STAR",
        "icon": "💼",
        "prompt": "Review and optimize my tech resume bullets using the STAR (Situation, Task, Action, Result) model. How can I highlight my system metrics?",
        "category": "Career"
    }
]

@router.post("/chat", response_model=ChatResponse)
def chat_with_mentor(payload: ChatPayload, db: Session = Depends(get_db)):
    """
    Sends a chat message to the Google Gemini API (or Mock fallback) with previous context history
    and dynamically grounds responses using TF-IDF RAG semantic search.
    """
    try:
        # Query matching context chunks from SQLite using Scikit-Learn search
        relevant_chunks = rag_service.search_relevant_chunks(db=db, query=payload.message)
        context = "\n".join(relevant_chunks) if relevant_chunks else None

        # Convert Pydantic schemas to standard dictionaries for service layer compatibility
        history_dicts = [{"role": h.role, "message": h.message} for h in payload.history]
        ai_response = career_coach_service.generate_chat_response(
            message=payload.message, 
            history=history_dicts,
            context=context
        )
        return ChatResponse(response=ai_response)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred in the Career Coach chatbot layer: {str(e)}"
        )

@router.post("/chat/stream")
def chat_with_mentor_stream(payload: ChatPayload, db: Session = Depends(get_db)):
    """
    Sends a chat message to the Gemini API and streams the response back chunk-by-chunk using SSE.
    """
    try:
        # Query matching context chunks from SQLite using Scikit-Learn search
        relevant_chunks = rag_service.search_relevant_chunks(db=db, query=payload.message)
        context = "\n".join(relevant_chunks) if relevant_chunks else None

        history_dicts = [{"role": h.role, "message": h.message} for h in payload.history]
        
        def event_generator():
            stream = career_coach_service.generate_chat_stream(
                message=payload.message,
                history=history_dicts,
                context=context
            )
            for chunk in stream:
                yield f"data: {chunk}\n\n"
        
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred in the Career Coach chatbot streaming layer: {str(e)}"
        )

@router.post("/upload", response_model=IndexedDocumentResponse)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Uploads, parses, chunks, and indexes a professional resume or technical manual for RAG query context.
    """
    try:
        content = await file.read()
        raw_text = rag_service.parse_file(content, file.filename)
        
        if not raw_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file contains no readable text content."
            )
            
        doc = rag_service.index_document(
            db=db,
            filename=file.filename,
            file_type=file.filename.split(".")[-1].lower(),
            raw_text=raw_text
        )
        return doc
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and index file: {str(e)}"
        )

@router.get("/documents", response_model=List[IndexedDocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    """
    Lists metadata for all active uploaded documents.
    """
    try:
        docs = db.query(IndexedDocument).order_by(IndexedDocument.created_at.desc()).all()
        return docs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not retrieve documents list: {str(e)}"
        )

@router.delete("/documents/{id}")
def delete_document(id: int, db: Session = Depends(get_db)):
    """
    Deletes an uploaded document and its index chunks from the database.
    """
    try:
        doc = db.query(IndexedDocument).filter(IndexedDocument.id == id).first()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found."
            )
        db.delete(doc)
        db.commit()
        return {"message": "Document index deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not delete document: {str(e)}"
        )

@router.get("/preloaded-prompts", response_model=List[Dict[str, Any]])
def get_interview_prompts():
    """
    Retrieves the preloaded professional coding and interview preparation guide prompts.
    """
    return PRELOADED_PROMPTS
