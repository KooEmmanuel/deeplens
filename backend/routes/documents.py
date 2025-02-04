from fastapi import APIRouter, UploadFile, File
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
from typing import List
import numpy as np

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

            # Load the document
            print(f"\n--- Loading document with {file.filename.lower()} loader ---")
            loader = get_loader(temp_file.name, file.filename.lower())
            documents = loader.load()
            print(f"✓ Document loaded successfully. Pages/Chunks: {len(documents)}")

            # Create collection name
            collection_name = f"doc_{file.filename}_{hash(content)}"
            print(f"\n--- Creating collection: {collection_name} ---")
            
            # Create a new collection for this document
            collection = client.create_collection(
                name=collection_name,
                embedding_function=EmbeddingFunction(embedding_model)
            )
            print("✓ Collection created successfully")

            # Split documents into chunks and add to collection
            print("\n--- Processing document chunks ---")
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

        return {"message": "Document uploaded successfully"}

    except Exception as e:
        print(f"\n❌ Upload error: {str(e)}")
        print("\n=== Upload process failed ===\n")
        return {"error": str(e)}, 500

@router.get("/documents")
async def get_documents():
    print("\n=== Retrieving Documents ===")
    collection_names = client.list_collections()
    print(f"Found {len(collection_names)} collections in the database")
    
    unique_documents = set()
    
    for collection_name in collection_names:
        print(f"\nChecking collection: {collection_name}")
        coll = client.get_collection(name=collection_name)
        metadata = coll.get()
        
        print(f"Collection size: {len(metadata['metadatas'])} chunks")
        
        for meta in metadata["metadatas"]:
            if meta and "documentName" in meta:
                unique_documents.add(meta["documentName"])
    
    print(f"\nTotal unique documents found: {len(unique_documents)}")
    print("Document names:", list(unique_documents))
    print("=== Document Retrieval Complete ===\n")
    
    return [{"name": name, "createdAt": "2024-01-01T00:00:00Z"} for name in unique_documents]

@router.delete("/documents/{name}")
async def delete_document(name: str):
    collections = client.list_collections()
    deleted_count = 0
    
    for collection in collections:
        coll = client.get_collection(collection.name)
        results = coll.get()
        indices_to_delete = [
            results["ids"][i] for i, meta in enumerate(results["metadatas"])
            if meta["documentName"] == name
        ]
        if indices_to_delete:
            coll.delete(ids=indices_to_delete)
            deleted_count += len(indices_to_delete)
    
    return {"success": True, "message": f"Deleted {deleted_count} documents"} 