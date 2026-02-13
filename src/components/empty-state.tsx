import { Users, Clock } from 'lucide-react';

interface EmptyStateProps {
  isToday: boolean;
}

export function EmptyState({ isToday }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-muted rounded-full p-6 mb-4">
        {isToday ? (
          <Users className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Clock className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      
      <h3 className="font-medium mb-2">
        {isToday ? 'スタッフを追加してください' : 'データがありません'}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-sm">
        {isToday 
          ? '上の「スタッフ名を入力」欄から新しいスタッフを追加して勤務時間の記録を開始できます。'
          : 'この日のスタッフの勤務記録はありません。'
        }
      </p>
    </div>
  );
}