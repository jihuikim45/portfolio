# backend/services/es_client.py

import os
from elasticsearch import Elasticsearch

ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
INDEX_NAME = "ingredients"

def get_es_client() -> Elasticsearch:
    """
    애플리케이션 전체에서 재사용할 Elasticsearch 클라이언트
    """
    return Elasticsearch(ES_HOST)
