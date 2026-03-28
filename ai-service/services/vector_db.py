import chromadb
from chromadb.config import Settings as ChromaSettings
import os
from config import settings

class VectorDBService:
    def __init__(self):
        # Initialize ChromaDB client. 
        # For simplicity, we use the PersistentClient which stores data on disk.
        # In a real microservice, this might connect to a remote Chroma server.
        persist_directory = os.path.join(os.getcwd(), "db", "chroma")
        os.makedirs(persist_directory, exist_ok=True)
        
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection_name = "codewiki_files"
        self.collection = self.client.get_or_create_collection(name=self.collection_name)

    def add_documents(self, ids: list[str], documents: list[str], metadatas: list[dict] = None):
        """
        Add code chunks to the vector database.
        """
        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    def query(self, query_text: str, n_results: int = 5, where: dict = None):
        """
        Perform a semantic search with optional filtering.
        """
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where
        )
        return results

    def delete_project_data(self, project_path: str):
        """
        Remove data for a specific project before re-indexing.
        """
        self.collection.delete(
            where={"project_path": project_path}
        )

    def reset_collection(self):
        """
        Clear the collection for re-indexing (Full wipe).
        """
        self.client.delete_collection(self.collection_name)
        self.collection = self.client.get_or_create_collection(name=self.collection_name)

vector_db = VectorDBService()
