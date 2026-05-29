import logging
from sqlalchemy.orm import Session
from backend.app.models.document import IndexedDocument, DocumentChunk
from fastapi import UploadFile
import io
import re

# Setup logger
logger = logging.getLogger("ai_coach_rag")

class RAGService:
    """
    RAG Logic providing file parsing, semantic chunking, database indexing,
    and Scikit-Learn based semantic vector search.
    """

    def parse_file(self, file_content: bytes, filename: str) -> str:
        """
        Parses raw file bytes into standard string text.
        Supports .txt, .md, .json natively, and features a robust PDF stream parser.
        """
        ext = filename.split(".")[-1].lower()
        
        if ext in ["txt", "md", "json", "py", "csv"]:
            return file_content.decode("utf-8", errors="ignore")
            
        elif ext == "pdf":
            # 1. Attempt standard PyPDF import
            try:
                import pypdf
                pdf_file = io.BytesIO(file_content)
                reader = pypdf.PdfReader(pdf_file)
                text = ""
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                if text.strip():
                    logger.info(f"Successfully parsed PDF '{filename}' using pypdf library.")
                    return text
            except ImportError:
                logger.warning("pypdf is not installed. Using regular expression raw stream fallback.")
            except Exception as e:
                logger.error(f"PyPDF parsing failed: {str(e)}. Using fallback.")

            # 2. Advanced RegEx Fallback: Extract legible ASCII strings from PDF streams
            # PDFs store text in binary operators like (text content) Tj or [text] TJ.
            # This regex captures long sequences of standard text characters in the binary stream.
            words = re.findall(rb'[a-zA-Z0-9\s\.,;:!@#\$%\^&\*\(\)\-\+=\[\]\{\}<>\?\/\\|`~"\'\n]+', file_content)
            extracted_text = ""
            for word in words:
                if len(word) > 10:  # Ignore short PDF formatting tags
                    try:
                        extracted_text += word.decode("ascii", errors="ignore") + " "
                    except Exception:
                        pass
            
            clean_text = re.sub(r'\s+', ' ', extracted_text).strip()
            if clean_text:
                logger.info(f"Regex parsed PDF '{filename}' successfully.")
                return clean_text
            
            raise ValueError("Could not extract readable text content from the uploaded PDF document.")

        else:
            # Fallback text decoder
            try:
                return file_content.decode("utf-8", errors="ignore")
            except Exception:
                raise ValueError(f"Unsupported file format: {ext}")

    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
        """
        Splits raw text into smaller overlapping paragraphs to preserve semantic query context.
        """
        if not text:
            return []
            
        # Clean double newlines and excessive whitespaces first
        text = re.sub(r'\s+', ' ', text).strip()
        
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = min(start + chunk_size, text_length)
            
            # If we're not at the end of the text, try to split at a sentence boundary or word boundary
            if end < text_length:
                # Find last period, question mark, or space to avoid cutting words in half
                last_space = text.rfind(' ', start, end)
                last_period = max(text.rfind('.', start, end), text.rfind('?', start, end))
                
                if last_period > start + (chunk_size // 2):
                    end = last_period + 1
                elif last_space > start:
                    end = last_space
                    
            chunks.append(text[start:end].strip())
            start = end - overlap
            
            # Prevent infinite loops if overlap is too large or progress is zero
            if end - overlap <= start:
                start = end
                
        # Filter empty chunks
        return [c for c in chunks if len(c) > 10]

    def index_document(self, db: Session, filename: str, file_type: str, raw_text: str) -> IndexedDocument:
        """
        Stores the parsed document and populates its chunks into the SQLite database.
        Cleans up existing documents with the identical filename to ensure idempotency.
        """
        # A. Cleanup duplicate files
        existing_doc = db.query(IndexedDocument).filter(IndexedDocument.filename == filename).first()
        if existing_doc:
            db.delete(existing_doc)
            db.commit()
            logger.info(f"Cleaned up existing duplicate document index for: {filename}")

        # B. Insert Document Meta
        doc = IndexedDocument(
            filename=filename,
            file_type=file_type,
            raw_text=raw_text
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # C. Create & Insert Chunks
        chunks_texts = self.chunk_text(raw_text)
        doc_chunks = []
        
        for index, chunk_text in enumerate(chunks_texts):
            chunk_obj = DocumentChunk(
                document_id=doc.id,
                chunk_text=chunk_text,
                chunk_index=index
            )
            doc_chunks.append(chunk_obj)
            
        db.add_all(doc_chunks)
        db.commit()
        logger.info(f"Indexed document '{filename}' with {len(doc_chunks)} chunks.")
        
        return doc

    def search_relevant_chunks(self, db: Session, query: str, top_k: int = 3) -> list[str]:
        """
        Vectorizes chunks using Scikit-Learn TF-IDF, performs cosine similarity
        against the query, and retrieves the top K most matching semantic blocks.
        """
        # A. Query all chunks in database
        chunks = db.query(DocumentChunk).all()
        if not chunks:
            return []
            
        chunk_texts = [c.chunk_text for c in chunks]
        
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            import numpy as np
            
            # B. Vectorize all chunks
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(chunk_texts)
            
            # C. Vectorize Query
            query_vector = vectorizer.transform([query])
            
            # D. Compute Cosine Similarity
            similarities = cosine_similarity(query_vector, tfidf_matrix).flatten()
            
            # E. Sort and take top K indices with similarity > 0
            sorted_indices = np.argsort(similarities)[::-1]
            
            matches = []
            for idx in sorted_indices:
                if len(matches) >= top_k:
                    break
                if similarities[idx] > 0.02:  # Threshold to filter irrelevant noise
                    matches.append(chunk_texts[idx])
                    
            logger.info(f"RAG search found {len(matches)} relevant matching blocks for query: '{query[:30]}...'")
            return matches
            
        except Exception as e:
            logger.error(f"Scikit-Learn vector search failed: {str(e)}. Falling back to basic keyword scan.")
            # Simple keyword fallback: match words in query
            query_words = set(re.findall(r'\w+', query.lower()))
            scored_chunks = []
            for chunk in chunk_texts:
                chunk_lower = chunk.lower()
                matches_count = sum(1 for w in query_words if w in chunk_lower)
                if matches_count > 0:
                    scored_chunks.append((matches_count, chunk))
            
            scored_chunks.sort(key=lambda x: x[0], reverse=True)
            return [chunk for _, chunk in scored_chunks[:top_k]]

rag_service = RAGService()
