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

    def query(self, query_text: str, n_results: int = 5):
        """
        Perform a semantic search.
        """
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        return results

    def reset_collection(self):
        """
        Clear the collection for re-indexing.
        """
        self.client.delete_collection(self.collection_name)
        self.collection = self.client.get_or_create_collection(name=self.collection_name)

vector_db = VectorDBService()
