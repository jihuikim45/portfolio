import { Edit2, Save, X, LogOut } from 'lucide-react';
import { Button } from '@/shared/ui';

export interface EditProfileButtonsProps {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onLogout?: () => void;
}

export const EditProfileButtons = ({
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onLogout,
}: EditProfileButtonsProps) => {
  const handleLogout = () => {
    if (window.confirm('정말 로그아웃 하시겠습니까?')) {
      onLogout?.();
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3">
        <Button onClick={onEdit} variant="primary" leftIcon={<Edit2 className="w-4 h-4" />}>
          프로필 수정
        </Button>
        <Button
          onClick={handleLogout}
          variant="ghost"
          leftIcon={<LogOut className="w-4 h-4" />}
          className="text-gray-500 hover:text-red-500 hover:bg-red-50"
        >
          로그아웃
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <Button
        onClick={onSave}
        variant="secondary"
        isLoading={isSaving}
        leftIcon={!isSaving ? <Save className="w-4 h-4" /> : undefined}
        disabled={isSaving}
      >
        변경사항 저장
      </Button>
      <Button
        onClick={onCancel}
        variant="ghost"
        leftIcon={<X className="w-4 h-4" />}
        disabled={isSaving}
      >
        취소
      </Button>
    </div>
  );
};
