import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { TaskItem } from './components/Tasks/TaskItem';
import { LoginForm } from './components/Auth/LoginForm';
import { useTasks } from './hooks/useTasks';
import { useAuth } from './context/AuthContext';
import { Plus, Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchModal } from './components/Search/SearchModal';
import { format, isToday, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
    reorderTasks,
    loading: tasksLoading
  } = useTasks(dateKey);

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
  const mainRef = useRef<HTMLElement | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [orderedIncompleteIds, setOrderedIncompleteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!draggedTaskId) {
      setOrderedIncompleteIds(incompleteTasks.map(task => String(task.id)));
    }
  }, [draggedTaskId, incompleteTasks, dateKey]);

  const orderedIncompleteTasks = useMemo(() => {
    const taskMap = new Map(incompleteTasks.map(task => [String(task.id), task]));
    const ordered = orderedIncompleteIds
      .map(id => taskMap.get(id))
      .filter((task): task is NonNullable<typeof task> => Boolean(task));
    const remaining = incompleteTasks.filter(task => !orderedIncompleteIds.includes(String(task.id)));
    return [...ordered, ...remaining];
  }, [incompleteTasks, orderedIncompleteIds]);

  const handleAutoScroll = (clientY: number) => {
    if (!mainRef.current) {
      return;
    }
    const rect = mainRef.current.getBoundingClientRect();
    const threshold = 80;
    const scrollStep = 18;

    if (clientY - rect.top < threshold) {
      mainRef.current.scrollTop -= scrollStep;
    } else if (rect.bottom - clientY < threshold) {
      mainRef.current.scrollTop += scrollStep;
    }
  };

  const moveIdInList = (list: string[], sourceId: string, targetId: string) => {
    const next = [...list];
    const fromIndex = next.indexOf(sourceId);
    const toIndex = next.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return list;
    }
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, sourceId);
    return next;
  };

  const handleDragStart = (taskId: string) => (event: DragEvent<HTMLDivElement>) => {
    setDraggedTaskId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (taskId: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleAutoScroll(event.clientY);
    if (!draggedTaskId || draggedTaskId === taskId) {
      return;
    }
    setOrderedIncompleteIds(prev => moveIdInList(prev, draggedTaskId, taskId));
  };

  const handleDrop = async () => {
    if (!draggedTaskId) {
      return;
    }
    const nextIncompleteIds = orderedIncompleteIds.length
      ? orderedIncompleteIds
      : incompleteTasks.map(task => String(task.id));
    const fullOrderIds = [
      ...nextIncompleteIds,
      ...completedTasks.map(task => String(task.id))
    ];
    await reorderTasks(dateKey, fullOrderIds);
    setDraggedTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
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

      <main ref={mainRef} className="flex-1 p-4 lg:p-8 relative overflow-y-auto">
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
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-slate-900 dark:text-white font-medium capitalize min-w-[100px] text-center">
                  {isToday(selectedDate) ? 'Сегодня' : format(selectedDate, 'd MMMM', { locale: ru })}
                </div>
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-slate-500 dark:text-white/50 capitalize">
                {format(selectedDate, 'EEEE', { locale: ru })}
              </span>
            </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
          </div>
        </div>

        {/* Date Header */}
        <div className="hidden lg:block mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-10 mb-1">
            <button
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center min-w-[180px]">
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white capitalize text-center">
                {isToday(selectedDate) ? 'Сегодня' : format(selectedDate, 'd MMMM', { locale: ru })}
              </h1>
              <span className="text-lg text-slate-500 dark:text-white/50 capitalize">
                {format(selectedDate, 'EEEE', { locale: ru })}
              </span>
            </div>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-500 dark:text-white/50 h-6 text-center">
            {tasksLoading ? (
              <span className="animate-pulse">Загрузка задач...</span>
            ) : (
              tasks.length === 0 
                ? 'Нет запланированных задач' 
                : `${incompleteTasks.length} задач к выполнению`
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

        {/* Tasks List */}
        <div
          className="space-y-3"
          onDragOver={(event) => {
            event.preventDefault();
            handleAutoScroll(event.clientY);
          }}
          onDrop={handleDrop}
        >
          {tasksLoading && tasks.length === 0 ? (
             [1, 2, 3].map(i => (
               <div key={i} className="glass rounded-2xl h-16 animate-pulse" />
             ))
          ) : (
            orderedIncompleteTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={handleDragStart(String(task.id))}
                onDragOver={handleDragOver(String(task.id))}
                onDragEnd={handleDragEnd}
                className={`transition-transform duration-150 ${
                  draggedTaskId === String(task.id)
                    ? 'shadow-2xl shadow-black/10 dark:shadow-black/40 scale-[1.02] cursor-grabbing'
                    : 'cursor-grab'
                }`}
              >
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
