import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { TaskItem } from './components/Tasks/TaskItem';
import { LoginForm } from './components/Auth/LoginForm';
import { useTasks } from './hooks/useTasks';
import { useTasksForWeek } from './hooks/useTasksForWeek';
import { useAuth } from './context/AuthContext';
import { Plus, Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchModal } from './components/Search/SearchModal';
import { format, isToday, addDays, subDays, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Task } from './types';

type ViewMode = 'day' | 'week';

const getViewModeKey = (userId?: string) => `viewMode-${userId ?? 'guest'}`;

const readStoredViewMode = (userId?: string): ViewMode => {
  if (typeof window === 'undefined') {
    return 'day';
  }
  const stored = localStorage.getItem(getViewModeKey(userId));
  return stored === 'week' ? 'week' : 'day';
};

function App() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  
  // Conditionally call hooks logic only if authenticated to avoid errors
  // But hooks must be called unconditionally in React. 
  // We handle the "no user" case inside useTasks safely.
  const {
    tasks,
    addTask,
    toggleTask,
    deleteTask,
    updateTaskTitle,
    moveTaskToTomorrow,
    moveTaskToYesterday,
    addCheckpoint,
    toggleCheckpoint,
    deleteCheckpoint,
    updateCheckpoint,
    loading: tasksLoading
  } = useTasks(dateKey);

  const {
    tasks: weekTasks,
    loading: weekLoading,
    weekStart,
    weekEnd,
    updateTask,
    toggleTask: toggleWeekTask,
    deleteTask: deleteWeekTask,
    updateTaskTitle: updateWeekTaskTitle,
    moveTaskToTomorrow: moveWeekTaskToTomorrow,
    moveTaskToYesterday: moveWeekTaskToYesterday,
    addCheckpoint: addWeekCheckpoint,
    toggleCheckpoint: toggleWeekCheckpoint,
    deleteCheckpoint: deleteWeekCheckpoint,
    updateCheckpoint: updateWeekCheckpoint
  } = useTasksForWeek(selectedDate);

  useEffect(() => {
    setViewMode(readStoredViewMode(user?.uid));
  }, [user?.uid]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(getViewModeKey(user?.uid), viewMode);
  }, [user?.uid, viewMode]);

  // 1. Loading State (Checking Auth)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // 2. Not Authenticated -> Show Login Form (в Tauri работаем без авторизации)
  const isTauri = '__TAURI__' in window;
  if (!user && !isTauri) {
    return <LoginForm />;
  }

  // 3. Authenticated -> Show App
  const handleAddTask = () => {
    if (newTaskText.trim()) {
      addTask(newTaskText.trim());
      setNewTaskText('');
    }
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const weekIncompleteTasks = weekTasks.filter(t => !t.completed);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [weekEnd, weekStart]);

  const weekTasksByDate = useMemo(() => {
    return weekDays.reduce<Record<string, Task[]>>((acc, day) => {
      const key = format(day, 'yyyy-MM-dd');
      acc[key] = weekTasks
        .filter((task) => task.date === key)
        .sort((a, b) => a.order - b.order);
      return acc;
    }, {});
  }, [weekDays, weekTasks]);

  const formatWeekRange = () => {
    const startLabel = format(weekStart, 'd MMMM', { locale: ru });
    const endLabel = format(weekEnd, 'd MMMM', { locale: ru });
    return `${startLabel} — ${endLabel}`;
  };

  const handlePrev = () => {
    setSelectedDate(viewMode === 'week' ? subDays(selectedDate, 7) : subDays(selectedDate, 1));
  };

  const handleNext = () => {
    setSelectedDate(viewMode === 'week' ? addDays(selectedDate, 7) : addDays(selectedDate, 1));
  };

  const handleDragStart = (taskId: string) => (event: React.DragEvent) => {
    event.dataTransfer.setData('text/plain', taskId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDropOnDay = (date: string) => async (event: React.DragEvent) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) {
      return;
    }
    const dayTasks = weekTasksByDate[date] ?? [];
    const maxOrder = dayTasks.reduce((max, task) => Math.max(max, task.order), 0);
    await updateTask(taskId, { date, order: maxOrder + 1 });
    setDraggedTaskId(null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex text-slate-900 dark:text-white font-sans transition-colors duration-300">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <Sidebar 
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onSearchOpen={() => setIsSearchOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      <main className="flex-1 p-4 lg:p-8 relative overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-slate-900 dark:text-white font-medium capitalize min-w-[120px] text-center">
                {viewMode === 'day'
                  ? isToday(selectedDate)
                    ? 'Сегодня'
                    : format(selectedDate, 'd MMMM', { locale: ru })
                  : formatWeekRange()}
              </div>
              <button
                onClick={handleNext}
                className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm text-slate-500 dark:text-white/50 capitalize">
              {viewMode === 'day'
                ? format(selectedDate, 'EEEE', { locale: ru })
                : 'Неделя'}
            </span>
            <div className="flex items-center gap-1 mt-2">
              <button
                onClick={() => setViewMode('day')}
                className={`w-10 h-8 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'day'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300 dark:hover:bg-white/15 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                День
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`w-10 h-8 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'week'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300 dark:hover:bg-white/15 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Нед
              </button>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
          </div>
        </div>

        {/* Date Header */}
        <div className="hidden lg:block mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-10 mb-1">
            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center min-w-[180px]">
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white capitalize text-center">
                {viewMode === 'day'
                  ? isToday(selectedDate)
                    ? 'Сегодня'
                    : format(selectedDate, 'd MMMM', { locale: ru })
                  : formatWeekRange()}
              </h1>
              <span className="text-lg text-slate-500 dark:text-white/50 capitalize">
                {viewMode === 'day' ? format(selectedDate, 'EEEE', { locale: ru }) : 'Неделя'}
              </span>
            </div>
            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('day')}
                className={`w-10 h-10 rounded-xl text-xs font-medium transition-all ${
                  viewMode === 'day'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300 dark:hover:bg-white/15 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                День
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`w-10 h-10 rounded-xl text-xs font-medium transition-all ${
                  viewMode === 'week'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300 dark:hover:bg-white/15 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Нед
              </button>
            </div>
          </div>
          <p className="text-slate-500 dark:text-white/50 h-6 text-center">
            {viewMode === 'day' ? (
              tasksLoading ? (
                <span className="animate-pulse">Загрузка задач...</span>
              ) : (
                tasks.length === 0 
                  ? 'Нет запланированных задач' 
                  : `${incompleteTasks.length} задач к выполнению`
              )
            ) : weekLoading ? (
              <span className="animate-pulse">Загрузка задач...</span>
            ) : (
              weekTasks.length === 0
                ? 'Нет задач на эту неделю'
                : `${weekIncompleteTasks.length} задач к выполнению`
            )}
          </p>
        </div>

        {/* Add Task */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Добавить задачу..."
              className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 outline-none text-lg"
            />
            <button 
              onClick={handleAddTask}
              className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {viewMode === 'day' ? (
          <div className="space-y-3">
            {tasksLoading && tasks.length === 0 ? (
               [1, 2, 3].map(i => (
                 <div key={i} className="glass rounded-2xl h-16 animate-pulse" />
               ))
            ) : (
              incompleteTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isExpanded={expandedTaskId === task.id}
                  onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                  onToggleComplete={() => toggleTask(String(task.id))}
                  onDelete={() => deleteTask(String(task.id))}
                  onMoveToTomorrow={() => moveTaskToTomorrow(String(task.id))}
                  onMoveToYesterday={() => moveTaskToYesterday(String(task.id))}
                  onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                  onAddCheckpoint={(text) => addCheckpoint(String(task.id), text)}
                  onToggleCheckpoint={(cpId) => toggleCheckpoint(String(task.id), cpId)}
                  onDeleteCheckpoint={(cpId) => deleteCheckpoint(String(task.id), cpId)}
                  onUpdateCheckpoint={(cpId, text) => updateCheckpoint(String(task.id), cpId, text)}
                />
              ))
            )}

            {completedTasks.length > 0 && (
              <div className="mt-8 animate-fade-in">
                <h3 className="text-slate-400 dark:text-white/40 text-sm font-medium mb-3 uppercase tracking-wider">Выполнено</h3>
                <div className="space-y-2">
                  {completedTasks.map(task => (
                    <div key={task.id} className="opacity-60 hover:opacity-100 transition-opacity">
                      <TaskItem
                        task={task}
                        isExpanded={expandedTaskId === task.id}
                        onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                        onToggleComplete={() => toggleTask(String(task.id))}
                        onDelete={() => deleteTask(String(task.id))}
                        onMoveToTomorrow={() => moveTaskToTomorrow(String(task.id))}
                        onMoveToYesterday={() => moveTaskToYesterday(String(task.id))}
                        onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                        onAddCheckpoint={(text) => addCheckpoint(String(task.id), text)}
                        onToggleCheckpoint={(cpId) => toggleCheckpoint(String(task.id), cpId)}
                        onDeleteCheckpoint={(cpId) => deleteCheckpoint(String(task.id), cpId)}
                        onUpdateCheckpoint={(cpId, text) => updateCheckpoint(String(task.id), cpId, text)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!tasksLoading && tasks.length === 0 && (
              <div className="text-center py-16 animate-fade-in">
                <div className="w-20 h-20 bg-slate-200 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-10 h-10 text-slate-400 dark:text-white/20" />
                </div>
                <h3 className="text-slate-600 dark:text-white/60 text-lg font-medium mb-2">Нет задач на этот день</h3>
                <p className="text-slate-400 dark:text-white/40 text-sm">Добавьте первую задачу выше</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {weekLoading && weekTasks.length === 0 ? (
              <div className="grid gap-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="glass rounded-2xl h-16 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="hidden lg:grid lg:grid-cols-7 gap-3">
                  {weekDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayTasks = weekTasksByDate[dayKey] ?? [];
                    const incomplete = dayTasks.filter((task) => !task.completed);
                    const completed = dayTasks.filter((task) => task.completed);
                    return (
                      <div
                        key={dayKey}
                        onDrop={handleDropOnDay(dayKey)}
                        onDragOver={handleDragOver}
                        className="glass rounded-2xl p-3 min-h-[200px] flex flex-col gap-3"
                      >
                        <div className="text-sm font-medium text-slate-700 dark:text-white/70 capitalize">
                          {format(day, 'EEEE', { locale: ru })}
                          <div className="text-xs text-slate-400 dark:text-white/40">
                            {format(day, 'd MMM', { locale: ru })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {incomplete.map((task) => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={handleDragStart(String(task.id))}
                              className="cursor-grab"
                            >
                              <TaskItem
                                task={task}
                                isExpanded={expandedTaskId === task.id}
                                onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                onToggleComplete={() => toggleWeekTask(String(task.id))}
                                onDelete={() => deleteWeekTask(String(task.id))}
                                onMoveToTomorrow={() => moveWeekTaskToTomorrow(String(task.id))}
                                onMoveToYesterday={() => moveWeekTaskToYesterday(String(task.id))}
                                onUpdateTitle={(title) => updateWeekTaskTitle(String(task.id), title)}
                                onAddCheckpoint={(text) => addWeekCheckpoint(String(task.id), text)}
                                onToggleCheckpoint={(cpId) => toggleWeekCheckpoint(String(task.id), cpId)}
                                onDeleteCheckpoint={(cpId) => deleteWeekCheckpoint(String(task.id), cpId)}
                                onUpdateCheckpoint={(cpId, text) => updateWeekCheckpoint(String(task.id), cpId, text)}
                              />
                            </div>
                          ))}
                          {completed.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <div className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-wider">
                                Выполнено
                              </div>
                              {completed.map((task) => (
                                <div
                                  key={task.id}
                                  draggable
                                  onDragStart={handleDragStart(String(task.id))}
                                  className="opacity-60 hover:opacity-100 transition-opacity cursor-grab"
                                >
                                  <TaskItem
                                    task={task}
                                    isExpanded={expandedTaskId === task.id}
                                    onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                    onToggleComplete={() => toggleWeekTask(String(task.id))}
                                    onDelete={() => deleteWeekTask(String(task.id))}
                                    onMoveToTomorrow={() => moveWeekTaskToTomorrow(String(task.id))}
                                    onMoveToYesterday={() => moveWeekTaskToYesterday(String(task.id))}
                                    onUpdateTitle={(title) => updateWeekTaskTitle(String(task.id), title)}
                                    onAddCheckpoint={(text) => addWeekCheckpoint(String(task.id), text)}
                                    onToggleCheckpoint={(cpId) => toggleWeekCheckpoint(String(task.id), cpId)}
                                    onDeleteCheckpoint={(cpId) => deleteWeekCheckpoint(String(task.id), cpId)}
                                    onUpdateCheckpoint={(cpId, text) => updateWeekCheckpoint(String(task.id), cpId, text)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {dayTasks.length === 0 && (
                            <div className="text-xs text-slate-400 dark:text-white/30 text-center py-6">
                              Нет задач
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="lg:hidden space-y-4">
                  {weekDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayTasks = weekTasksByDate[dayKey] ?? [];
                    const incomplete = dayTasks.filter((task) => !task.completed);
                    const completed = dayTasks.filter((task) => task.completed);
                    return (
                      <div
                        key={dayKey}
                        onDrop={handleDropOnDay(dayKey)}
                        onDragOver={handleDragOver}
                        className="glass rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-700 dark:text-white/70 capitalize">
                            {format(day, 'EEEE', { locale: ru })}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-white/40">
                            {format(day, 'd MMM', { locale: ru })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {incomplete.map((task) => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={handleDragStart(String(task.id))}
                              className="cursor-grab"
                            >
                              <TaskItem
                                task={task}
                                isExpanded={expandedTaskId === task.id}
                                onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                onToggleComplete={() => toggleWeekTask(String(task.id))}
                                onDelete={() => deleteWeekTask(String(task.id))}
                                onMoveToTomorrow={() => moveWeekTaskToTomorrow(String(task.id))}
                                onMoveToYesterday={() => moveWeekTaskToYesterday(String(task.id))}
                                onUpdateTitle={(title) => updateWeekTaskTitle(String(task.id), title)}
                                onAddCheckpoint={(text) => addWeekCheckpoint(String(task.id), text)}
                                onToggleCheckpoint={(cpId) => toggleWeekCheckpoint(String(task.id), cpId)}
                                onDeleteCheckpoint={(cpId) => deleteWeekCheckpoint(String(task.id), cpId)}
                                onUpdateCheckpoint={(cpId, text) => updateWeekCheckpoint(String(task.id), cpId, text)}
                              />
                            </div>
                          ))}
                          {completed.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <div className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-wider">
                                Выполнено
                              </div>
                              {completed.map((task) => (
                                <div
                                  key={task.id}
                                  draggable
                                  onDragStart={handleDragStart(String(task.id))}
                                  className="opacity-60 hover:opacity-100 transition-opacity cursor-grab"
                                >
                                  <TaskItem
                                    task={task}
                                    isExpanded={expandedTaskId === task.id}
                                    onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                    onToggleComplete={() => toggleWeekTask(String(task.id))}
                                    onDelete={() => deleteWeekTask(String(task.id))}
                                    onMoveToTomorrow={() => moveWeekTaskToTomorrow(String(task.id))}
                                    onMoveToYesterday={() => moveWeekTaskToYesterday(String(task.id))}
                                    onUpdateTitle={(title) => updateWeekTaskTitle(String(task.id), title)}
                                    onAddCheckpoint={(text) => addWeekCheckpoint(String(task.id), text)}
                                    onToggleCheckpoint={(cpId) => toggleWeekCheckpoint(String(task.id), cpId)}
                                    onDeleteCheckpoint={(cpId) => deleteWeekCheckpoint(String(task.id), cpId)}
                                    onUpdateCheckpoint={(cpId, text) => updateWeekCheckpoint(String(task.id), cpId, text)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {dayTasks.length === 0 && (
                            <div className="text-xs text-slate-400 dark:text-white/30 text-center py-4">
                              Нет задач
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDate={setSelectedDate}
      />
    </div>
  );
}

export default App;
