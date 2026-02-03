import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, User as UserIcon, LogOut, LogIn, Search } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import { LoginForm } from '../Auth/LoginForm';
import { useCalendarStats } from '../../hooks/useCalendarStats';

interface SidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onSearchOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  selectedDate, 
  onDateSelect, 
  isMobileOpen, 
  onCloseMobile,
  onSearchOpen
}) => {
  const [calendarDate, setCalendarDate] = useState(new Date(2026, 1, 1));
  const [showLogin, setShowLogin] = useState(false);
  const { user, logout } = useAuth();
  
  const { getDayStats } = useCalendarStats(calendarDate.getFullYear(), calendarDate.getMonth());

  const nextMonth = () => setCalendarDate(addMonths(calendarDate, 1));
  const prevMonth = () => setCalendarDate(subMonths(calendarDate, 1));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(calendarDate), { weekStartsOn: 1 })
  });

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <>
      {showLogin && <LoginForm onClose={() => setShowLogin(false)} />}
      
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-80 
        glass transform transition-transform duration-300 ease-out flex-shrink-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 h-full flex flex-col overflow-y-auto">
          {/* Logo & User */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Check className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold text-lg">TaskFlow</span>
            </div>
            
            {user ? (
              <div className="flex items-center gap-2">
                 {user.photoURL ? (
                   <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-lg border border-white/10" />
                 ) : (
                   <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60">
                     <UserIcon className="w-4 h-4" />
                   </div>
                 )}
              </div>
            ) : (
              <button 
                onClick={() => setShowLogin(true)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all"
                title="Войти"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Calendar Navigation */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={prevMonth}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white font-medium capitalize">
                {format(calendarDate, 'LLLL yyyy', { locale: ru })}
              </span>
              <button 
                onClick={nextMonth}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-white/40 text-xs py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const stats = getDayStats(dateKey);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, calendarDate);

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onDateSelect(day);
                      onCloseMobile();
                    }}
                    className={`
                      relative aspect-square rounded-xl text-sm font-medium transition-all
                      ${!isCurrentMonth ? 'text-white/20' : 'text-white/70 hover:bg-white/10'}
                      ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                      ${isToday(day) && !isSelected ? 'ring-2 ring-blue-500/50' : ''}
                    `}
                  >
                    {format(day, 'd')}
                    
                    {/* Indicators */}
                    {stats && !isSelected && isCurrentMonth && (
                      <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full 
                        ${stats.allCompleted ? 'bg-green-400' : 'bg-orange-400'}`} 
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={() => {
              onSearchOpen();
              onCloseMobile();
            }}
            className="w-full glass rounded-xl p-3 mb-4 flex items-center gap-3 text-white/40 hover:text-white/60 hover:bg-white/[0.07] transition-all"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Поиск задач...</span>
          </button>

          {/* User Actions */}
          <div className="mt-auto pt-4 border-t border-white/10">
            {user && (
              <div className="space-y-2">
                <div className="text-sm text-white/50 text-center mb-2 truncate">
                  {user.email}
                </div>
                <button 
                  onClick={() => logout()}
                  className="w-full py-2 text-white/50 hover:text-white/70 text-sm flex items-center justify-center gap-2 transition-colors hover:bg-white/5 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </button>
              </div>
            )}
            <div className="text-xs text-white/30 text-center mt-4">
              v{__APP_VERSION__}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};