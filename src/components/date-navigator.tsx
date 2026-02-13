import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DateNavigatorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateNavigator({ currentDate, onDateChange }: DateNavigatorProps) {
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日 (${weekday})`;
  };

  const goToPreviousDay = () => {
    const previousDay = new Date(currentDate);
    previousDay.setDate(previousDay.getDate() - 1);
    onDateChange(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    onDateChange(nextDay);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFuture = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate > today;
  };

  return (
    <div className="flex items-center justify-between bg-card p-4 rounded-lg border mb-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPreviousDay}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{formatDate(currentDate)}</span>
        {isToday(currentDate) && (
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
            今日
          </span>
        )}
      </div>

      <div className="flex gap-1">
        {!isToday(currentDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="h-8 px-2 text-xs"
          >
            今日
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextDay}
          disabled={isFuture(currentDate)}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}