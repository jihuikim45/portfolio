import { useState, useEffect, useCallback, useRef } from 'react';
import { ingredientApi, Ingredient } from '@/entities/ingredient';
import { debounce } from '@/shared/lib/utils';
import { getOrCreateSessionId, logSearch } from '@/lib/api';

export const useIngredients = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // 현재 검색어 추적 (debounce 내부에서 새 검색 여부 판단용)
  const currentQueryRef = useRef('');

  // 검색 실행 (디바운스)
  const executeSearch = useCallback(
    debounce(async (query: string, page: number = 1) => {
      if (!query.trim()) {
        setIngredients([]);
        setNextPage(null);
        setHasMore(false);
        setTotal(0);
        currentQueryRef.current = '';
        return;
      }

      // 새 검색어인지 확인
      const isNewSearch = query !== currentQueryRef.current;
      if (isNewSearch) {
        currentQueryRef.current = query;
        page = 1;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await ingredientApi.search(query, 20, page);

        if (page === 1) {
          // 새 검색 - 결과 교체
          setIngredients(result.items);
        } else {
          // 페이지네이션 - 기존 결과에 추가
          setIngredients(prev => [...prev, ...result.items]);
        }

        setNextPage(result.nextPage);
        setHasMore(result.hasMore);
        setTotal(result.total);

        // 검색 이벤트 로깅 (첫 페이지만)
        if (page === 1 && result.items.length > 0) {
          const sessionId = getOrCreateSessionId();
          console.log('[EVENT] logSearch 호출:', { sessionId, query, resultCount: result.total });
          logSearch({
            sessionId,
            queryText: query,
            queryType: 'ingredient',
            searchMethod: 'text',
            resultCount: result.total,
          }).then(res => {
            console.log('[EVENT] logSearch 응답:', res);
          }).catch(err => {
            console.error('[EVENT] logSearch 에러:', err);
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search ingredients');
        if (page === 1) {
          setIngredients([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // 검색어 변경 시 자동 검색
  useEffect(() => {
    executeSearch(searchQuery, 1);
  }, [searchQuery, executeSearch]);

  // 더 불러오기
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && nextPage) {
      executeSearch(searchQuery, nextPage);
    }
  }, [hasMore, isLoading, nextPage, searchQuery, executeSearch]);

  // 특정 성분 찾기 (현재 로드된 결과에서)
  const findIngredient = (query: string): Ingredient | undefined => {
    const key = query.trim();
    if (!key) return undefined;

    // 정확히 일치하는 한글명
    let hit = ingredients.find(i => i.korean_name === key);
    if (hit) return hit;

    // 포함하는 한글명
    hit = ingredients.find(i => i.korean_name.includes(key));
    if (hit) return hit;

    // 영문명 (대소문자 무시)
    hit = ingredients.find(i => (i.english_name || '').toLowerCase() === key.toLowerCase());
    return hit;
  };

  return {
    ingredients,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    hasMore,
    loadMore,
    findIngredient,
  };
};
