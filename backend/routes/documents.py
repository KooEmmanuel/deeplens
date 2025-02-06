from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from chromadb import Client
from chromadb.config import Settings
from langchain_community.document_loaders import (
    PyPDFLoader, 
    TextLoader, 
    Docx2txtLoader, 
    CSVLoader,
    UnstructuredMarkdownLoader
)
from sentence_transformers import SentenceTransformer
import tempfile
import os
from typing import List, Dict, Any
import numpy as np
import re
import hashlib
from sqlalchemy.orm import Session
from database import get_db
from models import Document
from pydantic import BaseModel
import json
import traceback

router = APIRouter()
client = Client(Settings(persist_directory="./chroma_db"))

# Initialize the sentence transformer model
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

class EmbeddingFunction:
    def __init__(self, model):
        self.model = model

    def __call__(self, input: List[str]) -> List[List[float]]:
        embeddings = self.model.encode(input)
        return embeddings.tolist()

def get_loader(file_path: str, file_type: str):
    if file_type.endswith('pdf'):
        return PyPDFLoader(file_path)
    elif file_type.endswith(('txt', 'text')):
        return TextLoader(file_path)
    elif file_type.endswith(('docx', 'doc')):
        return Docx2txtLoader(file_path)
    elif file_type.endswith('csv'):
        return CSVLoader(file_path)
    elif file_type.endswith(('md', 'markdown')):
        return UnstructuredMarkdownLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

def sanitize_file_name(file_name: str, max_length: int = 50) -> str:
    """
    Remove any character that isn't alphanumeric, an underscore, or a hyphen.
    The result is truncated to a maximum length.
    """
    # Replace non-alphanumeric, underscore, or hyphen characters with underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', file_name)
    return sanitized[:max_length]

def generate_collection_name(file_name: str, content: bytes) -> str:
    """
    Create a consistent collection name by combining a sanitized version of the file name
    and a short hash (first 8 characters of an MD5 hash) of the file content.
    """
    sanitized_name = sanitize_file_name(file_name)
    # Create an MD5 hash of the file content and take the first 8 characters
    short_hash = hashlib.md5(content).hexdigest()[:8]
    return f"doc_{sanitized_name}_{short_hash}"

@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        print(f"\n=== Starting upload process for file: {file.filename} ===")
        
        # Create a temporary file to store the upload
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()
            print(f"✓ Temporary file created at: {temp_file.name}")

        # Load the document using the appropriate loader based on file type
        print(f"\n--- Loading document with {file.filename.lower()} loader ---")
        loader = get_loader(temp_file.name, file.filename.lower())
        documents = loader.load()
        print(f"✓ Document loaded successfully. Pages/Chunks: {len(documents)}")

        # Create a consistent collection name using the file name and content hash
        collection_name = generate_collection_name(file.filename, content)
        print(f"\n--- Computed collection name: {collection_name} ---")
        
        # Check if collection exists and get or create it
        try:
            # Try to get existing collection
            collection = client.get_collection(name=collection_name)
            print(f"✓ Found existing collection: {collection_name}")
            
            # Clear existing chunks before adding new ones
            collection.delete(where={})
            print("✓ Cleared existing chunks from collection")
            
        except Exception as e:
            # Collection doesn't exist, create new one
            print(f"\n--- Creating new collection: {collection_name} ---")
            collection = client.create_collection(
                name=collection_name,
                embedding_function=EmbeddingFunction(embedding_model)
            )
            print("✓ Collection created successfully")

        # Process document chunks and add them to the collection
        for i, doc in enumerate(documents):
            print(f"\nProcessing chunk {i+1}/{len(documents)}")
            print(f"Content length: {len(doc.page_content)} characters")
            
            collection.add(
                documents=[doc.page_content],
                metadatas=[{
                    "documentName": file.filename,
                    "page": i,
                    "source": file.filename
                }],
                ids=[f"doc_{i}"]
            )
            print(f"✓ Chunk {i+1} processed and embedded")

        # Clean up the temporary file
        os.unlink(temp_file.name)
        print("\n✓ Temporary file cleaned up")
        print("\n=== Upload process completed successfully ===\n")

        return {"message": "Document uploaded successfully", "isExisting": True}
    except Exception as e:
        print(f"\n❌ Upload error: {str(e)}")
        print("\n=== Upload process failed ===\n")
        return {"error": str(e)}, 500

@router.get("/documents")
async def get_documents():
    print("\n=== Retrieving Documents ===")
    collections = client.list_collections()
    print(f"Found {len(collections)} collections in the database")
    
    unique_documents = set()
    
    for collection_name in collections:
        print(f"\nChecking collection: {collection_name}")
        try:
            coll = client.get_collection(name=collection_name)
            metadata = coll.get()
            
            print(f"Collection size: {len(metadata['metadatas'])} chunks")
            
            if metadata["metadatas"]:
                # Only add the first document name from each collection
                # since all chunks in a collection belong to the same document
                doc_name = metadata["metadatas"][0].get("documentName")
                if doc_name:
                    unique_documents.add(doc_name)
        except Exception as e:
            print(f"Error accessing collection {collection_name}: {str(e)}")
            continue
    
    print(f"\nTotal unique documents found: {len(unique_documents)}")
    print("Document names:", list(unique_documents))
    print("=== Document Retrieval Complete ===\n")
    
    return [{"name": name, "createdAt": "2024-01-01T00:00:00Z"} for name in unique_documents]

@router.delete("/documents/{name}")
async def delete_document(name: str):
    try:
        # Get list of collection names
        collection_names = client.list_collections()
        deleted_count = 0
        
        for coll_name in collection_names:
            try:
                # Get collection by name
                coll = client.get_collection(name=coll_name)
                results = coll.get()
                
                # Find documents to delete
                indices_to_delete = [
                    results["ids"][i] for i, meta in enumerate(results["metadatas"])
                    if meta["documentName"] == name
                ]
                
                # Delete if any matches found
                if indices_to_delete:
                    coll.delete(ids=indices_to_delete)
                    deleted_count += len(indices_to_delete)
                    
            except Exception as e:
                print(f"Error processing collection {coll_name}: {str(e)}")
                continue
        
        return {"success": True, "message": f"Deleted {deleted_count} documents"}
        
    except Exception as e:
        print(f"Delete error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class DocumentContent(BaseModel):
    blocks: list
    time: float | None = None
    version: str | None = None

class DocumentResponse(BaseModel):
    id: int | None = None
    content: dict | None = None

@router.get("/documents/latest", response_model=DocumentResponse)
async def get_latest_document(db: Session = Depends(get_db)):
    try:
        print("Fetching latest document...")
        document = db.query(Document).order_by(Document.updated_at.desc()).first()
        
        if not document:
            print("No document found")
            return DocumentResponse(id=None, content=None)
        
        print(f"Found document with ID: {document.id}")
        content = json.loads(document.content) if document.content else None
        print(f"Document content: {content}")
        
        return DocumentResponse(
            id=document.id,
            content=content
        )
    except Exception as e:
        print(f"Error fetching document: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "traceback": traceback.format_exc()}
        )

@router.post("/documents/save")
async def save_document(content: DocumentContent, db: Session = Depends(get_db)):
    try:
        print("Received save request with content:", content.dict())
        content_str = json.dumps(content.dict())
        
        document = db.query(Document).first()
        if document:
            print(f"Updating existing document {document.id}")
            document.content = content_str
        else:
            print("Creating new document")
            document = Document(content=content_str)
            db.add(document)

        db.commit()
        db.refresh(document)
        print(f"Document saved successfully with ID: {document.id}")
        
        return {"success": True, "id": document.id}
    except Exception as e:
        print(f"Error saving document: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "traceback": traceback.format_exc()}
        )

@router.get("/documents/{doc_id}")
async def get_document(doc_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == doc_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"content": json.loads(document.content)} 