from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON
from typing import Optional, Dict, List
from datetime import datetime, date
from pgvector.sqlalchemy import Vector, HalfVector

class Politician(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    party: Optional[str] = None
    role: Optional[str] = None # e.g., "Council Member"
    location_borough: Optional[str] = None
    district_number: Optional[str] = None
    bio_url: Optional[str] = None
    
    votes: List["VoteRecord"] = Relationship(back_populates="politician")

class LegislationEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    jurisdiction: str = Field(default="NYC Council")
    status: Optional[str] = None
    event_date: Optional[date] = None
    event_url: Optional[str] = None
    
    votes: List["VoteRecord"] = Relationship(back_populates="legislation_event")
    documents: List["PolicyDocument"] = Relationship(back_populates="legislation_event")

class VoteRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    politician_id: Optional[int] = Field(default=None, foreign_key="politician.id")
    legislation_event_id: Optional[int] = Field(default=None, foreign_key="legislationevent.id")
    vote_cast: str # "Yea", "Nay", "Abstain", "Absent"
    
    politician: Optional[Politician] = Relationship(back_populates="votes")
    legislation_event: Optional[LegislationEvent] = Relationship(back_populates="votes")

class PolicyDocument(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    source_url: str = Field(unique=True, index=True)
    source_type: str  # e.g., 'News RSS', 'NYCC Transcript', 'NYC Legislation'
    published_date: Optional[datetime] = None
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
    
    legislation_event_id: Optional[int] = Field(default=None, foreign_key="legislationevent.id")
    metadata_tags: Dict = Field(default_factory=dict, sa_column=Column(JSON))
    
    legislation_event: Optional[LegislationEvent] = Relationship(back_populates="documents")
    chunks: List["DocumentChunk"] = Relationship(back_populates="document")

class DocumentChunk(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: Optional[int] = Field(default=None, foreign_key="policydocument.id", ondelete="CASCADE")
    text_content: str
    chunk_index: int
    
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(HalfVector(384)))
    document: Optional[PolicyDocument] = Relationship(back_populates="chunks")
