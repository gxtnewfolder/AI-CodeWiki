import hashlib
import json
import os
import time
from typing import Any, Optional

class CacheService:
    def __init__(self, cache_dir: str = "db/cache"):
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)

    def _get_hash(self, key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()

    def get(self, key: str, ttl_seconds: int = 3600 * 24) -> Optional[Any]:
        """
        Retrieve data from cache if it exists and hasn't expired.
        Default TTL: 1 day.
        """
        h = self._get_hash(key)
        path = os.path.join(self.cache_dir, f"{h}.json")
        
        if not os.path.exists(path):
            return None
        
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Check expiration
            if time.time() - data.get("timestamp", 0) > ttl_seconds:
                return None
            
            return data.get("content")
        except:
            return None

    def set(self, key: str, content: Any):
        """
        Store data in cache with a timestamp.
        """
        h = self._get_hash(key)
        path = os.path.join(self.cache_dir, f"{h}.json")
        
        data = {
            "timestamp": time.time(),
            "content": content
        }
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)

cache_service = CacheService()
