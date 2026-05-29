from pydantic import BaseModel, Field
import datetime

class IndexedDocumentResponse(BaseModel):
    """
    Validation contract for returning uploaded document meta-information.
    """
    id: int
    filename: str
    file_type: str
    created_at: datetime.datetime

    model_config = {
        "from_attributes": True
    }
