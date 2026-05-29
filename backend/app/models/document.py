from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
import datetime

class IndexedDocument(Base):
    """
    Represents an uploaded document (e.g. resume or technical manual) that has been parsed for RAG search context.
    """
    __tablename__ = "indexed_documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Cascading deletion: when document is deleted, all its chunk entries are removed from database
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """
    Represents a specific semantic block/chunk of an indexed document for localized vector searches.
    """
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("indexed_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)

    document = relationship("IndexedDocument", back_populates="chunks")
