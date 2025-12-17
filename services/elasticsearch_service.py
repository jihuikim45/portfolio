# services/elasticsearch_service.py

import os
from pathlib import Path
from dotenv import load_dotenv
from elasticsearch import Elasticsearch, helpers
import pymysql

# .env 파일 로드 (backend/.env 또는 프로젝트 루트/.env)
env_path = Path(__file__).parent.parent / "backend" / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()  # 기본 경로

# 설정
ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
INDEX_NAME = "ingredients"

# MySQL 접속 정보 - 환경변수에서 읽기
MYSQL_HOST = os.getenv("DB_HOST", "localhost")
MYSQL_PORT = int(os.getenv("DB_PORT", 3306))
MYSQL_USER = os.getenv("DB_USER", "root")
MYSQL_PASSWORD = os.getenv("DB_PASSWORD", "")
MYSQL_DB = os.getenv("DB_NAME", "aller")


# 초성 추출 함수
CHOSUNG_LIST = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
    'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
]

def extract_chosung(text: str) -> str:
    """
    한글 문자열에서 초성만 추출
    예: "나이아신아마이드" -> "ㄴㅇㅇㅅㅇㅁㅇㄷ"
    """
    if not text:
        return ""
    
    result = []
    for char in text:
        # 한글 음절 범위: 가(0xAC00) ~ 힣(0xD7A3)
        if '가' <= char <= '힣':
            # 초성 인덱스 계산: (문자코드 - 0xAC00) / (21 * 28)
            cho_idx = (ord(char) - 0xAC00) // (21 * 28)
            result.append(CHOSUNG_LIST[cho_idx])
        else:
            # 한글이 아니면 그대로 유지 (영문, 숫자, 초성자 등)
            result.append(char)
    
    return ''.join(result)


INDEX_BODY = {
    "settings": {
    "analysis": {
      # 커스텀 애널라이저 정의
      "analyzer": {
        "ingredients_description_analyzer": {
          "char_filter": ["html_strip"],
          "tokenizer": "nori_tokenizer",
          "filter": ["nori_part_of_speech", "nori_readingform"]
        },
        "ingredients_caution_grade_analyzer": {
          "char_filter": [],
          "tokenizer": "nori_tokenizer",
          "filter": ["nori_part_of_speech", "nori_readingform"]
        }
      }
    }
  },
    "mappings": {
        "properties": {
            "id": {"type": "long"},
            "korean_name": {
                "type": "text",
                "fields": {
                    "keyword": {"type": "keyword"}
                },
            },
            "korean_name_chosung": {
                "type": "text",
                "analyzer": "standard"  # 초성은 단순 텍스트로 처리
            },
            "english_name": {
                "type": "text",
                "fields": {
                    "keyword": {"type": "keyword"}
                },
            },
            "description": {
                "type": "text",
                "analyzer": "ingredients_description_analyzer"},
            "caution_grade": {
                "type": "text",
                "analyzer": "ingredients_caution_grade_analyzer",
                "fields": {
                    "raw": {
                        "type": "keyword"
                    }
                }
            }
        }
    }
}



# 인덱스 생성/초기화
def init_index(es: Elasticsearch):
    # 기존 인덱스 있으면 삭제(전체 재동기화 용도)
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)

    es.indices.create(index=INDEX_NAME, body=INDEX_BODY)
    print(f"[ES] index '{INDEX_NAME}' created")



# MySQL → 데이터 가져오기
def fetch_ingredients():
    """
    ingredients 테이블 전체를 가져오는 제너레이터.
    데이터가 많아질 걸 대비해서 fetchmany로 끊어 읽기.
    """
    conn = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        db=MYSQL_DB,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    korean_name,
                    english_name,
                    description,
                    caution_grade
                FROM ingredients
                """
            )

            while True:
                rows = cur.fetchmany(1000)  # 한 번에 1000개씩
                if not rows:
                    break
                for row in rows:
                    yield row
    finally:
        conn.close()



# ES bulk 동기화
def sync_to_es(es: Elasticsearch):
    """
    MySQL → ES bulk 동기화
    """
    actions = []

    for row in fetch_ingredients():
        # id가 NULL일 수도 있으니 문자열로 캐스팅
        doc_id = str(row["id"]) if row["id"] is not None else None

        korean_name = row.get("korean_name") or ""
        
        action = {
            "_index": INDEX_NAME,
            "_id": doc_id,
            "_source": {
                "id": doc_id,
                "korean_name": korean_name,
                "korean_name_chosung": extract_chosung(korean_name),  # 초성 추가
                "english_name": row.get("english_name"),
                "description": row.get("description"),
                "caution_grade": row.get("caution_grade"),
            },
        }
        actions.append(action)

        # 너무 많이 쌓이기 전에 끊어서 전송
        if len(actions) >= 1000:
            helpers.bulk(es, actions)
            print(f"[ES] indexed {len(actions)} docs")
            actions = []

    # 남은 것 처리
    if actions:
        helpers.bulk(es, actions)
        print(f"[ES] indexed {len(actions)} docs (last batch)")



# 메인 실행부
def main():
    # ES 연결
    es = Elasticsearch(ES_HOST)

    # 서버 연결 확인
    info = es.info()
    print("[ES] connected:", info["version"]["number"])

    # 인덱스 초기화 및 동기화
    init_index(es)
    sync_to_es(es)

    print("[DONE] MySQL ingredients → Elasticsearch 동기화 완료")


if __name__ == "__main__":
    main()
