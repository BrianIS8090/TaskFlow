import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DatePickerModalProps {
  isOpen: boolean;
  initialDate: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  initialDate,
  onClose,
  onConfirm
}) => {
  const [calendarDate, setCalendarDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(calendarDate), { weekStartsOn: 1 })
  }), [calendarDate]);

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Затемнение фона */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Модалка */}
      <div className="relative glass rounded-2xl p-6 max-w-sm w-full mx-4 animate-fade-in shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Выберите дату</h3>

        {/* Навигация по месяцам */}
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
            className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white/60 hover:bg-slate-300 dark:hover:bg-white/15 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-900 dark:text-white font-medium capitalize">
            {format(calendarDate, 'LLLL yyyy', { locale: ru })}
          </span>
          <button 
            onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
            className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white/60 hover:bg-slate-300 dark:hover:bg-white/15 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Сетка календаря */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-slate-400 dark:text-white/40 text-xs py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, calendarDate);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative aspect-square rounded-xl text-sm font-medium transition-all
                  ${!isCurrentMonth ? 'text-slate-300 dark:text-white/20' : 'text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10'}
                  ${isSelected ? '!bg-blue-500 !text-white hover:!bg-blue-600' : ''}
                  ${isToday(day) && !isSelected ? 'ring-2 ring-blue-500/50' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 rounded-xl hover:bg-slate-300 dark:hover:bg-white/15 transition-colors text-sm font-medium"
          >
            Отмена
          </button>
          <button
            onClick={() => onConfirm(selectedDate)}
            className="flex-1 py-2.5 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
