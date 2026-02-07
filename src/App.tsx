import { useState } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { TaskItem } from './components/Tasks/TaskItem';
import { LoginForm } from './components/Auth/LoginForm';
import { useTasks } from './hooks/useTasks';
import { useWeekTasks } from './hooks/useWeekTasks';
import { useAuth } from './context/AuthContext';
import { Plus, Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchModal } from './components/Search/SearchModal';
import { DatePickerModal } from './components/UI/DatePickerModal';
import { format, isToday, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Task } from './types';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [taskToMove, setTaskToMove] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

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
    moveTaskToDate,
    addCheckpoint,
    toggleCheckpoint,
    deleteCheckpoint,
    updateCheckpoint,
    loading: tasksLoading
  } = useTasks(dateKey);
  const { tasks: weekTasks, loading: weekTasksLoading } = useWeekTasks(selectedDate);

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

  const handleOpenDatePicker = (task: Task) => {
    setTaskToMove(task);
    setIsDatePickerOpen(true);
  };

  const handleCloseDatePicker = () => {
    setIsDatePickerOpen(false);
    setTaskToMove(null);
  };

  const handleConfirmMoveDate = async (targetDate: Date) => {
    if (!taskToMove) {
      handleCloseDatePicker();
      return;
    }
    await moveTaskToDate(taskToMove, targetDate);
    handleCloseDatePicker();
  };

  const isWeekView = viewMode === 'week';
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekRangeLabel = `${format(weekStart, 'd MMM', { locale: ru })} — ${format(weekEnd, 'd MMM', { locale: ru })}`;
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const tasksLoadingState = isWeekView ? weekTasksLoading : tasksLoading;
  const currentTasksCount = isWeekView ? weekIncompleteTasks.length : incompleteTasks.length;
  const currentTasksTotal = isWeekView ? weekTasks.length : tasks.length;

  const tasksByDate = weekTasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.date]) {
      acc[task.date] = [];
    }
    acc[task.date].push(task);
    acc[task.date].sort((a, b) => (a.order || 0) - (b.order || 0));
    return acc;
  }, {});

  const handlePrevDate = () => {
    setSelectedDate(subDays(selectedDate, isWeekView ? 7 : 1));
  };

  const handleNextDate = () => {
    setSelectedDate(addDays(selectedDate, isWeekView ? 7 : 1));
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
                  onClick={handlePrevDate}
                  className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-slate-900 dark:text-white font-medium capitalize min-w-[100px] text-center">
                  {isWeekView ? weekRangeLabel : (isToday(selectedDate) ? 'Сегодня' : format(selectedDate, 'd MMMM', { locale: ru }))}
                </div>
                <button
                  onClick={handleNextDate}
                  className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-slate-500 dark:text-white/50 capitalize">
                {isWeekView ? 'Неделя' : format(selectedDate, 'EEEE', { locale: ru })}
              </span>
            </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
          </div>
        </div>
        <div className="lg:hidden flex justify-center mb-6">
          <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 dark:bg-white/10 p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white'
                  : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              День
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white'
                  : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Неделя
            </button>
          </div>
        </div>

        {/* Date Header */}
        <div className="hidden lg:block mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-10 mb-1">
            <button
              onClick={handlePrevDate}
              className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center min-w-[180px]">
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white capitalize text-center">
                {isWeekView ? weekRangeLabel : (isToday(selectedDate) ? 'Сегодня' : format(selectedDate, 'd MMMM', { locale: ru }))}
              </h1>
              <span className="text-lg text-slate-500 dark:text-white/50 capitalize">
                {isWeekView ? 'Неделя' : format(selectedDate, 'EEEE', { locale: ru })}
              </span>
            </div>
            <button
              onClick={handleNextDate}
              className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-500 dark:text-white/50 h-6 text-center">
            {tasksLoadingState ? (
              <span className="animate-pulse">Загрузка задач...</span>
            ) : (
              currentTasksTotal === 0 
                ? 'Нет запланированных задач' 
                : `${currentTasksCount} задач к выполнению`
            )}
          </p>
          <div className="flex justify-center mt-4">
            <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 dark:bg-white/10 p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'day'
                    ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white'
                    : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                День
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white'
                    : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Неделя
              </button>
            </div>
          </div>
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

        {/* Tasks List */}
        {isWeekView ? (
          <div className="space-y-6">
            {weekTasksLoading && weekTasks.length === 0 ? (
              <div className="grid gap-3 lg:grid-cols-7">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="glass rounded-2xl h-32 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* Mobile Week List */}
                <div className="space-y-4 lg:hidden">
                  {weekDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayTasks = tasksByDate[dayKey] || [];
                    const dayIncomplete = dayTasks.filter(task => !task.completed);
                    const dayCompleted = dayTasks.filter(task => task.completed);
                    return (
                      <div key={dayKey} className="space-y-3">
                        <div className="flex items-baseline justify-between px-1">
                          <div className="text-sm font-semibold text-slate-700 dark:text-white/80 capitalize">
                            {format(day, 'EEEE', { locale: ru })}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-white/40">
                            {format(day, 'd MMM', { locale: ru })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {dayIncomplete.map(task => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              isExpanded={expandedTaskId === task.id}
                              onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                              onToggleComplete={() => toggleTask(task)}
                              onDelete={() => deleteTask(String(task.id))}
                              onMoveToTomorrow={() => moveTaskToTomorrow(task)}
                              onMoveToYesterday={() => moveTaskToYesterday(task)}
                              onMoveToDate={() => handleOpenDatePicker(task)}
                              onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                              onAddCheckpoint={(text) => addCheckpoint(task, text)}
                              onToggleCheckpoint={(cpId) => toggleCheckpoint(task, cpId)}
                              onDeleteCheckpoint={(cpId) => deleteCheckpoint(task, cpId)}
                              onUpdateCheckpoint={(cpId, text) => updateCheckpoint(task, cpId, text)}
                            />
                          ))}
                          {dayCompleted.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs uppercase tracking-wider text-slate-400 dark:text-white/40 px-2">
                                Выполнено
                              </div>
                              {dayCompleted.map(task => (
                                <div key={task.id} className="opacity-60 hover:opacity-100 transition-opacity">
                                  <TaskItem
                                    task={task}
                                    isExpanded={expandedTaskId === task.id}
                                    onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                    onToggleComplete={() => toggleTask(task)}
                                    onDelete={() => deleteTask(String(task.id))}
                                    onMoveToTomorrow={() => moveTaskToTomorrow(task)}
                                    onMoveToYesterday={() => moveTaskToYesterday(task)}
                                    onMoveToDate={() => handleOpenDatePicker(task)}
                                    onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                                    onAddCheckpoint={(text) => addCheckpoint(task, text)}
                                    onToggleCheckpoint={(cpId) => toggleCheckpoint(task, cpId)}
                                    onDeleteCheckpoint={(cpId) => deleteCheckpoint(task, cpId)}
                                    onUpdateCheckpoint={(cpId, text) => updateCheckpoint(task, cpId, text)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {dayTasks.length === 0 && (
                            <div className="glass rounded-2xl p-4 text-sm text-slate-400 dark:text-white/40 text-center">
                              Нет задач
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Week Columns */}
                <div className="hidden lg:grid grid-cols-7 gap-4">
                  {weekDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayTasks = tasksByDate[dayKey] || [];
                    const dayIncomplete = dayTasks.filter(task => !task.completed);
                    const dayCompleted = dayTasks.filter(task => task.completed);
                    return (
                      <div key={dayKey} className="glass rounded-2xl p-3 flex flex-col gap-3 min-h-[200px]">
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-semibold text-slate-700 dark:text-white/80 capitalize">
                            {format(day, 'EEEE', { locale: ru })}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-white/40">
                            {format(day, 'd MMM', { locale: ru })}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {dayIncomplete.map(task => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              isExpanded={expandedTaskId === task.id}
                              onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                              onToggleComplete={() => toggleTask(task)}
                              onDelete={() => deleteTask(String(task.id))}
                              onMoveToTomorrow={() => moveTaskToTomorrow(task)}
                              onMoveToYesterday={() => moveTaskToYesterday(task)}
                              onMoveToDate={() => handleOpenDatePicker(task)}
                              onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                              onAddCheckpoint={(text) => addCheckpoint(task, text)}
                              onToggleCheckpoint={(cpId) => toggleCheckpoint(task, cpId)}
                              onDeleteCheckpoint={(cpId) => deleteCheckpoint(task, cpId)}
                              onUpdateCheckpoint={(cpId, text) => updateCheckpoint(task, cpId, text)}
                            />
                          ))}
                          {dayCompleted.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/40 px-1">
                                Выполнено
                              </div>
                              {dayCompleted.map(task => (
                                <div key={task.id} className="opacity-60 hover:opacity-100 transition-opacity">
                                  <TaskItem
                                    task={task}
                                    isExpanded={expandedTaskId === task.id}
                                    onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                    onToggleComplete={() => toggleTask(task)}
                                    onDelete={() => deleteTask(String(task.id))}
                                    onMoveToTomorrow={() => moveTaskToTomorrow(task)}
                                    onMoveToYesterday={() => moveTaskToYesterday(task)}
                                    onMoveToDate={() => handleOpenDatePicker(task)}
                                    onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                                    onAddCheckpoint={(text) => addCheckpoint(task, text)}
                                    onToggleCheckpoint={(cpId) => toggleCheckpoint(task, cpId)}
                                    onDeleteCheckpoint={(cpId) => deleteCheckpoint(task, cpId)}
                                    onUpdateCheckpoint={(cpId, text) => updateCheckpoint(task, cpId, text)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {dayTasks.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-3 text-center text-xs text-slate-400 dark:text-white/40">
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

            {!weekTasksLoading && weekTasks.length === 0 && (
              <div className="text-center py-16 animate-fade-in">
                <div className="w-20 h-20 bg-slate-200 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-10 h-10 text-slate-400 dark:text-white/20" />
                </div>
                <h3 className="text-slate-600 dark:text-white/60 text-lg font-medium mb-2">Нет задач на этой неделе</h3>
                <p className="text-slate-400 dark:text-white/40 text-sm">Добавьте первую задачу выше</p>
              </div>
            )}
          </div>
        ) : (
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
                  onToggleComplete={() => toggleTask(task)}
                  onDelete={() => deleteTask(String(task.id))}
                  onMoveToTomorrow={() => moveTaskToTomorrow(task)}
                  onMoveToYesterday={() => moveTaskToYesterday(task)}
                  onMoveToDate={() => handleOpenDatePicker(task)}
                  onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                  onAddCheckpoint={(text) => addCheckpoint(task, text)}
                  onToggleCheckpoint={(cpId) => toggleCheckpoint(task, cpId)}
                  onDeleteCheckpoint={(cpId) => deleteCheckpoint(task, cpId)}
                  onUpdateCheckpoint={(cpId, text) => updateCheckpoint(task, cpId, text)}
                />
              ))
            )}

            {/* Completed Section */}
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
                        onToggleComplete={() => toggleTask(task)}
                        onDelete={() => deleteTask(String(task.id))}
                        onMoveToTomorrow={() => moveTaskToTomorrow(task)}
                        onMoveToYesterday={() => moveTaskToYesterday(task)}
                        onMoveToDate={() => handleOpenDatePicker(task)}
                        onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                        onAddCheckpoint={(text) => addCheckpoint(task, text)}
                        onToggleCheckpoint={(cpId) => toggleCheckpoint(task, cpId)}
                        onDeleteCheckpoint={(cpId) => deleteCheckpoint(task, cpId)}
                        onUpdateCheckpoint={(cpId, text) => updateCheckpoint(task, cpId, text)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
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
        )}
      </main>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDate={setSelectedDate}
      />

      <DatePickerModal
        isOpen={isDatePickerOpen}
        initialDate={selectedDate}
        onClose={handleCloseDatePicker}
        onConfirm={handleConfirmMoveDate}
      />
    </div>
  );
}

export default App;
