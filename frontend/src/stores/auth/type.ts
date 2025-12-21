export interface UserState {
  name: string;
  email: string;
  isAdmin: boolean;
}

// 로그인 시 전달하는 데이터 (isAdmin은 store에서 자동 계산)
export interface LoginPayload {
  name: string;
  email: string;
}

export interface UserAction {
  login: (data: LoginPayload) => void;
  logout: () => void;
}

// 성분 관련 타입 추가
export interface UserIngredient {
  id: number;
  name: string;
  type: 'preferred' | 'caution';
  benefit?: string;
  reason?: string;
  severity?: 'low' | 'mid' | 'high';
}

export interface IngredientState {
  preferredIngredients: UserIngredient[];
  cautionIngredients: UserIngredient[];
}

export interface IngredientAction {
  setPreferredIngredients: (ingredients: UserIngredient[]) => void;
  setCautionIngredients: (ingredients: UserIngredient[]) => void;
  addIngredient: (ingredient: UserIngredient) => void;
  removeIngredient: (ingredientId: number, type: 'preferred' | 'caution') => void;
  clearIngredients: () => void;
}

// 전체 Store 타입
export type StoreState = UserState & IngredientState & UserAction & IngredientAction;
