import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface ClockTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClockTimePicker({ value, onChange, label, isOpen, onOpenChange }: ClockTimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [isAM, setIsAM] = useState(true);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  // ダイアログが開いたときに時間を初期化
  useEffect(() => {
    if (isOpen) {
      if (value) {
        const [hours, minutes] = value.split(':').map(Number);
        
        // 24時間形式から12時間形式に変換
        if (hours === 0) {
          // 0時 = 12 AM
          setSelectedHour(12);
          setIsAM(true);
        } else if (hours < 12) {
          // 1-11時 = 1-11 AM
          setSelectedHour(hours);
          setIsAM(true);
        } else if (hours === 12) {
          // 12時 = 12 PM
          setSelectedHour(12);
          setIsAM(false);
        } else {
          // 13-23時 = 1-11 PM
          setSelectedHour(hours - 12);
          setIsAM(false);
        }
        setSelectedMinute(minutes);
      } else {
        // デフォルト値
        setSelectedHour(9);
        setSelectedMinute(0);
        setIsAM(true);
      }
      // 常に時間選択モードから始める
      setMode('hour');
    }
  }, [isOpen, value]);

  const hours = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const getAngle = (index: number, total: number) => {
    return (index * 360) / total - 90;
  };

  const getPosition = (angle: number, radius: number) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radian) * radius,
      y: Math.sin(radian) * radius,
    };
  };

  const handleHourClick = (hour: number) => {
    setSelectedHour(hour);
    setMode('minute');
  };

  const handleMinuteClick = (minute: number) => {
    setSelectedMinute(minute);
  };

  const handleConfirm = () => {
    let hour24 = selectedHour;
    if (selectedHour === 12) {
      hour24 = isAM ? 0 : 12;
    } else {
      hour24 = isAM ? selectedHour : selectedHour + 12;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange(timeString);
    onOpenChange(false);
  };

  const currentDisplayTime = `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 時間表示 */}
          <div className="text-center">
            <div className="text-3xl font-medium mb-2">{currentDisplayTime}</div>
          </div>

          {/* 時計 */}
          <div className="relative mx-auto w-64 h-64">
            <svg width="256" height="256" className="absolute inset-0" style={{ pointerEvents: 'none' }}>
              {/* 外周 */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="rgb(229 231 235)"
                strokeWidth="2"
              />
              
              {/* 数字とドット */}
              {(mode === 'hour' ? hours : minutes).map((num, index) => {
                const angle = getAngle(index, mode === 'hour' ? 12 : 12);
                const pos = getPosition(angle, 100);
                const isSelected = mode === 'hour' ? num === selectedHour : num === selectedMinute;
                
                return (
                  <g 
                    key={num}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Clicked:', mode, num);
                      mode === 'hour' ? handleHourClick(num) : handleMinuteClick(num);
                    }}
                    style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  >
                    <circle
                      cx={128 + pos.x}
                      cy={128 + pos.y}
                      r="20"
                      fill={isSelected ? 'rgb(15 23 42)' : 'transparent'}
                      stroke={isSelected ? 'rgb(15 23 42)' : 'rgb(203 213 225)'}
                      strokeWidth="2"
                      className="hover:fill-slate-100 transition-colors"
                    />
                    <text
                      x={128 + pos.x}
                      y={128 + pos.y + 6}
                      textAnchor="middle"
                      className={`text-sm font-medium ${
                        isSelected ? 'fill-white' : 'fill-slate-700'
                      }`}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {mode === 'hour' ? num : num.toString().padStart(2, '0')}
                    </text>
                  </g>
                );
              })}
              
              {/* 中心点 */}
              <circle cx="128" cy="128" r="4" fill="rgb(15 23 42)" />
              
              {/* 針 */}
              {mode === 'hour' && (
                <line
                  x1="128"
                  y1="128"
                  x2={128 + getPosition(getAngle(hours.indexOf(selectedHour), 12), 70).x}
                  y2={128 + getPosition(getAngle(hours.indexOf(selectedHour), 12), 70).y}
                  stroke="rgb(15 23 42)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}
              
              {mode === 'minute' && (
                <line
                  x1="128"
                  y1="128"
                  x2={128 + getPosition(getAngle(selectedMinute / 5, 12), 90).x}
                  y2={128 + getPosition(getAngle(selectedMinute / 5, 12), 90).y}
                  stroke="rgb(15 23 42)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* 中央の時分切り替えボタン */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
              <div className="flex bg-white border-2 border-slate-200 rounded-full shadow-lg overflow-hidden" style={{ pointerEvents: 'auto' }}>
                <Button
                  variant={mode === 'hour' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMode('hour');
                  }}
                  className="rounded-none px-4 py-2 h-10"
                >
                  時
                </Button>
                <div className="w-px bg-border"></div>
                <Button
                  variant={mode === 'minute' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMode('minute');
                  }}
                  className="rounded-none px-4 py-2 h-10"
                >
                  分
                </Button>
              </div>
            </div>

            {/* 右上のAM/PM切り替え */}
            <div className="absolute -top-3 -right-3" style={{ pointerEvents: 'auto' }}>
              <div className="flex flex-col bg-white border-2 border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <Button
                  variant={isAM ? 'default' : 'ghost'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAM(true);
                  }}
                  className="rounded-none px-4 py-2 h-10 text-sm"
                >
                  AM
                </Button>
                <div className="h-px bg-border"></div>
                <Button
                  variant={!isAM ? 'default' : 'ghost'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAM(false);
                  }}
                  className="rounded-none px-4 py-2 h-10 text-sm"
                >
                  PM
                </Button>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button onClick={handleConfirm}>
              確定
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}