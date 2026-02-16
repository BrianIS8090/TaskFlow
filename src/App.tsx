import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Sidebar } from './components/Layout/Sidebar';
import { TaskItem } from './components/Tasks/TaskItem';
import { DroppableContainer } from './components/Tasks/DroppableContainer';
import { SortableTaskItem } from './components/Tasks/SortableTaskItem';
import { LoginForm } from './components/Auth/LoginForm';
import { useTasks } from './hooks/useTasks';
import { useWeekTasks } from './hooks/useWeekTasks';
import { useAuth } from './context/useAuth';
import { Plus, Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchModal } from './components/Search/SearchModal';
import { DatePickerModal } from './components/UI/DatePickerModal';
import { AddTaskModal } from './components/UI/AddTaskModal';
import { format, isToday, addDays, subDays, startOfWeek, endOfWeek, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Task } from './types';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [dayDate, setDayDate] = useState(new Date());
  const [weekAnchorDate, setWeekAnchorDate] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [taskToMove, setTaskToMove] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week-list' | 'week-grid'>('day');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [addTaskDate, setAddTaskDate] = useState<Date | null>(null);
  const [dayTaskOrder, setDayTaskOrder] = useState<Task[]>([]);
  const [weekTaskOrder, setWeekTaskOrder] = useState<Record<string, Task[]>>({});
  const [weekDragSourceContainer, setWeekDragSourceContainer] = useState<string | null>(null);
  const [isWeekOrderPersisting, setIsWeekOrderPersisting] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const dateKey = format(dayDate, 'yyyy-MM-dd');
  const today = useMemo(() => startOfDay(new Date()), []);
  const isWeekView = viewMode === 'week-list' || viewMode === 'week-grid';
  const isWeekGridView = viewMode === 'week-grid';
  const activeDate = isWeekView ? today : dayDate;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 260, tolerance: 6 } })
  );
  
  // Вызываем хуки всегда, а отсутствие пользователя обрабатываем внутри useTasks.
  const {
    tasks,
    addTask,
    addTaskToDate,
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
    loading: tasksLoading,
    reorderTasks
  } = useTasks(dateKey);
  const { tasks: weekTasks, loading: weekTasksLoading } = useWeekTasks(weekAnchorDate);

  // 1. Состояние загрузки (проверка авторизации)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // 2. Нет авторизации -> показываем форму входа (в Tauri работаем без авторизации)
  const isTauri = '__TAURI__' in window;
  if (!user && !isTauri) {
    return <LoginForm />;
  }

  // 3. Авторизован -> показываем приложение
  const handleAddTask = () => {
    if (newTaskText.trim()) {
      addTask(newTaskText.trim());
      setNewTaskText('');
    }
  };

  const incompleteTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.completed), [tasks]);
  const weekIncompleteTasks = useMemo(() => weekTasks.filter(t => !t.completed), [weekTasks]);
  const dayTaskIds = useMemo(() => dayTaskOrder.map(task => String(task.id)), [dayTaskOrder]);

  useEffect(() => {
    if (activeTask) {
      return;
    }
    setDayTaskOrder(incompleteTasks);
  }, [activeTask, incompleteTasks]);

  useEffect(() => {
    if (!activeTask) {
      return;
    }

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    const prevOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'contain';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [activeTask]);

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

  const weekStart = useMemo(
    () => startOfWeek(weekAnchorDate, { weekStartsOn: 1 }),
    [weekAnchorDate]
  );
  const weekEnd = useMemo(
    () => endOfWeek(weekAnchorDate, { weekStartsOn: 1 }),
    [weekAnchorDate]
  );
  const weekRangeLabel = useMemo(
    () => `${format(weekStart, 'd MMM', { locale: ru })} — ${format(weekEnd, 'd MMM', { locale: ru })}`,
    [weekStart, weekEnd]
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const tasksLoadingState = isWeekView ? weekTasksLoading : tasksLoading;
  const currentTasksCount = isWeekView ? weekIncompleteTasks.length : incompleteTasks.length;
  const currentTasksTotal = isWeekView ? weekTasks.length : tasks.length;

  const tasksByDate = useMemo(() => {
    return weekTasks.reduce<Record<string, Task[]>>((acc, task) => {
      if (!acc[task.date]) {
        acc[task.date] = [];
      }
      acc[task.date].push(task);
      acc[task.date].sort((a, b) => (a.order || 0) - (b.order || 0));
      return acc;
    }, {});
  }, [weekTasks]);

  const weekIncompleteByDate = useMemo(() => {
    return weekDays.reduce<Record<string, Task[]>>((acc, day) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayTasks = tasksByDate[dayKey] || [];
      acc[dayKey] = dayTasks.filter(task => !task.completed);
      return acc;
    }, {});
  }, [tasksByDate, weekDays]);

  useEffect(() => {
    if (activeTask || isWeekOrderPersisting) {
      return;
    }
    setWeekTaskOrder(weekIncompleteByDate);
  }, [activeTask, isWeekOrderPersisting, weekIncompleteByDate]);

  const taskLookup = useMemo(() => {
    const currentTasks = isWeekView ? weekTasks : tasks;
    return new Map(currentTasks.map(task => [String(task.id), task]));
  }, [isWeekView, tasks, weekTasks]);

  const handlePrevDate = () => {
    if (isWeekView) {
      setWeekAnchorDate(subDays(weekAnchorDate, 7));
      return;
    }
    setDayDate(subDays(dayDate, 1));
  };

  const handleNextDate = () => {
    if (isWeekView) {
      setWeekAnchorDate(addDays(weekAnchorDate, 7));
      return;
    }
    setDayDate(addDays(dayDate, 1));
  };

  const handleDateSelect = (date: Date) => {
    if (isWeekView) {
      setWeekAnchorDate(date);
      return;
    }
    setDayDate(date);
  };

  const handleOpenAddTaskModal = (date: Date) => {
    setAddTaskDate(date);
    setIsAddTaskModalOpen(true);
  };

  const handleCloseAddTaskModal = () => {
    setIsAddTaskModalOpen(false);
    setAddTaskDate(null);
  };

  const handleConfirmAddTask = async (title: string) => {
    if (!addTaskDate) return;
    await addTaskToDate(title, addTaskDate);
    handleCloseAddTaskModal();
  };

  const handleViewModeChange = (nextMode: 'day' | 'week-list' | 'week-grid') => {
    setViewMode(nextMode);
    if (nextMode === 'week-list' || nextMode === 'week-grid') {
      setWeekAnchorDate(dayDate);
    }
  };

  const handleSelectDateFromSearch = (date: Date) => {
    setDayDate(date);
    setViewMode('day');
  };

  const findWeekContainer = (id: string, containers: Record<string, Task[]>) => {
    if (Object.prototype.hasOwnProperty.call(containers, id)) {
      return id;
    }
    return Object.keys(containers).find(dateKey =>
      containers[dateKey].some(task => String(task.id) === id)
    );
  };

  const handleDayDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(taskLookup.get(String(active.id)) ?? null);
  };

  const handleDayDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const oldIndex = dayTaskOrder.findIndex(task => String(task.id) === activeId);
    const newIndex = dayTaskOrder.findIndex(task => String(task.id) === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(dayTaskOrder, oldIndex, newIndex);
    setDayTaskOrder(reordered);
    await reorderTasks(reordered, dateKey);
  };

  const handleDayDragCancel = () => {
    setActiveTask(null);
    setDayTaskOrder(incompleteTasks);
  };

  const handleWeekDragStart = ({ active }: DragStartEvent) => {
    const activeId = String(active.id);
    setWeekDragSourceContainer(findWeekContainer(activeId, weekTaskOrder) ?? null);
    setActiveTask(taskLookup.get(String(active.id)) ?? null);
  };

  const handleWeekDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    setWeekTaskOrder(prev => {
      const activeContainer = findWeekContainer(activeId, prev);
      const overContainer = findWeekContainer(overId, prev);
      if (!activeContainer || !overContainer || activeContainer === overContainer) {
        return prev;
      }

      const activeItems = prev[activeContainer] ?? [];
      const overItems = prev[overContainer] ?? [];
      const activeIndex = activeItems.findIndex(task => String(task.id) === activeId);
      if (activeIndex === -1) return prev;

      const movedTask = activeItems[activeIndex];
      const nextActiveItems = activeItems.filter(task => String(task.id) !== activeId);
      const isOverContainer = Object.prototype.hasOwnProperty.call(prev, overId);
      const overIndex = isOverContainer
        ? overItems.length
        : overItems.findIndex(task => String(task.id) === overId);
      const insertIndex = overIndex < 0 ? overItems.length : overIndex;
      const nextOverItems = [
        ...overItems.slice(0, insertIndex),
        movedTask,
        ...overItems.slice(insertIndex)
      ];

      return {
        ...prev,
        [activeContainer]: nextActiveItems,
        [overContainer]: nextOverItems
      };
    });
  };

  const handleWeekDragEnd = async ({ active, over }: DragEndEvent) => {
    setIsWeekOrderPersisting(true);
    setActiveTask(null);
    if (!over) {
      setWeekDragSourceContainer(null);
      setIsWeekOrderPersisting(false);
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findWeekContainer(activeId, weekTaskOrder);
    const overContainer = findWeekContainer(overId, weekTaskOrder);
    if (!activeContainer || !overContainer) {
      setWeekDragSourceContainer(null);
      setIsWeekOrderPersisting(false);
      return;
    }

    try {
      const sourceContainer = weekDragSourceContainer ?? activeContainer;
      const movedAcrossContainers = sourceContainer !== overContainer;

      if (movedAcrossContainers) {
        const sourceTasks = weekTaskOrder[sourceContainer] ?? [];
        const targetTasks = weekTaskOrder[overContainer] ?? [];
        const draggedTask =
          targetTasks.find(task => String(task.id) === activeId) ??
          sourceTasks.find(task => String(task.id) === activeId) ??
          taskLookup.get(activeId);

        if (!draggedTask) {
          return;
        }

        const nextSource = sourceTasks.filter(task => String(task.id) !== activeId);
        const targetWithoutActive = targetTasks.filter(task => String(task.id) !== activeId);
        const isOverContainer = Object.prototype.hasOwnProperty.call(weekTaskOrder, overId);
        const overIndex = isOverContainer
          ? targetWithoutActive.length
          : targetWithoutActive.findIndex(task => String(task.id) === overId);
        const insertIndex = overIndex < 0 ? targetWithoutActive.length : overIndex;
        const nextTarget = [
          ...targetWithoutActive.slice(0, insertIndex),
          draggedTask,
          ...targetWithoutActive.slice(insertIndex)
        ];

        setWeekTaskOrder(prev => ({
          ...prev,
          [sourceContainer]: nextSource,
          [overContainer]: nextTarget
        }));

        await Promise.all([
          reorderTasks(nextSource, sourceContainer),
          reorderTasks(nextTarget, overContainer)
        ]);
        return;
      }

      if (activeContainer === overContainer) {
        const containerTasks = weekTaskOrder[activeContainer] ?? [];
        const oldIndex = containerTasks.findIndex(task => String(task.id) === activeId);
        if (oldIndex === -1) return;

        const isOverContainer = Object.prototype.hasOwnProperty.call(weekTaskOrder, overId);
        const newIndex = isOverContainer
          ? containerTasks.length - 1
          : containerTasks.findIndex(task => String(task.id) === overId);

        if (newIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(containerTasks, oldIndex, newIndex);
        setWeekTaskOrder(prev => ({ ...prev, [activeContainer]: reordered }));
        await reorderTasks(reordered, activeContainer);
        return;
      }
    } finally {
      setWeekDragSourceContainer(null);
      setIsWeekOrderPersisting(false);
    }
  };

  const handleWeekDragCancel = () => {
    setActiveTask(null);
    setWeekDragSourceContainer(null);
    setIsWeekOrderPersisting(false);
    setWeekTaskOrder(weekIncompleteByDate);
  };

  const noop = () => {};

  const renderDragOverlay = () => {
    if (!activeTask) return null;
    return (
      <div className="pointer-events-none">
        <TaskItem
          task={activeTask}
          isExpanded={false}
          onToggleExpand={noop}
          onToggleComplete={noop}
          onDelete={noop}
          onMoveToTomorrow={noop}
          onMoveToYesterday={noop}
          onMoveToDate={noop}
          onUpdateTitle={noop}
          onAddCheckpoint={noop}
          onToggleCheckpoint={noop}
          onDeleteCheckpoint={noop}
          onUpdateCheckpoint={noop}
          className="shadow-2xl ring-2 ring-blue-400/40"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex text-slate-900 dark:text-white font-sans transition-colors duration-300">
      {/* Фоновая подсветка */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <Sidebar 
        selectedDate={activeDate}
        onDateSelect={handleDateSelect}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onSearchOpen={() => setIsSearchOpen(true)}
      />

      <main className="flex-1 p-4 lg:p-8 relative overflow-y-auto">
        {/* Заголовок для мобильной версии */}
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
                  {isWeekView ? weekRangeLabel : (isToday(dayDate) ? 'Сегодня' : format(dayDate, 'd MMMM', { locale: ru }))}
                </div>
                <button
                  onClick={handleNextDate}
                  className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-slate-500 dark:text-white/50 capitalize">
                {isWeekView ? 'Неделя' : format(dayDate, 'EEEE', { locale: ru })}
              </span>
            </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
          </div>
        </div>
        <div className="lg:hidden flex justify-center mb-6">
          <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 dark:bg-white/10 p-1">
            <button
              onClick={() => handleViewModeChange('day')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white'
                  : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              День
            </button>
            <button
              onClick={() => handleViewModeChange('week-list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week-list' || viewMode === 'week-grid'
                  ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white'
                  : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Неделя
            </button>
          </div>
        </div>

        {/* Заголовок даты */}
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
                {isWeekView ? weekRangeLabel : (isToday(dayDate) ? 'Сегодня' : format(dayDate, 'd MMMM', { locale: ru }))}
              </h1>
              <span className="text-lg text-slate-500 dark:text-white/50 capitalize">
                {isWeekView ? 'Неделя' : format(dayDate, 'EEEE', { locale: ru })}
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
                onClick={() => handleViewModeChange('day')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'day'
                    ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white'
                    : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                День
              </button>
              <button
                onClick={() => handleViewModeChange('week-list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'week-list'
                    ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white'
                    : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Неделя
              </button>
              <button
                onClick={() => handleViewModeChange('week-grid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'week-grid'
                    ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white'
                    : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Таблица
              </button>
            </div>
          </div>
        </div>

        {/* Добавление задачи */}
        {!isWeekView && (
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
        )}

        {/* Список задач */}
        {isWeekGridView ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleWeekDragStart}
            onDragOver={handleWeekDragOver}
            onDragEnd={handleWeekDragEnd}
            onDragCancel={handleWeekDragCancel}
          >
            <div className="space-y-6">
              {weekTasksLoading && weekTasks.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="glass rounded-2xl h-40 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayTasks = tasksByDate[dayKey] || [];
                    const dayIncomplete = weekTaskOrder[dayKey] || [];
                    const dayIncompleteIds = dayIncomplete.map(task => String(task.id));
                    const dayCompleted = dayTasks.filter(task => task.completed);
                    const hasTasks = dayIncomplete.length > 0 || dayCompleted.length > 0;
                    const isTodayDate = isToday(day);

                    return (
                      <DroppableContainer
                        key={dayKey}
                        id={dayKey}
                        className={`glass rounded-xl p-2 flex flex-col gap-2 min-h-[200px] group relative ${
                          isTodayDate ? 'ring-2 ring-blue-500/50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between px-1 mb-1">
                          <div>
                            <div className={`text-xs font-semibold capitalize ${
                              isTodayDate 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-slate-600 dark:text-white/70'
                            }`}>
                              {format(day, 'EEE', { locale: ru })}
                            </div>
                            <div className={`text-lg font-bold ${
                              isTodayDate 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-slate-700 dark:text-white/80'
                            }`}>
                              {format(day, 'd')}
                            </div>
                          </div>
                          <button
                            onClick={() => handleOpenAddTaskModal(day)}
                            className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-blue-500 hover:text-white transition-all"
                            aria-label="Добавить задачу"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1 flex-1 overflow-y-auto">
                          <SortableContext
                            key={`${dayKey}:${dayIncompleteIds.join('|')}`}
                            items={dayIncompleteIds}
                            strategy={verticalListSortingStrategy}
                          >
                            {dayIncomplete.map(task => (
                              <SortableTaskItem
                                key={task.id}
                                id={String(task.id)}
                                containerId={dayKey}
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
                                compact
                              />
                            ))}
                          </SortableContext>
                          {dayCompleted.length > 0 && (
                            <div className="space-y-1">
                              {dayCompleted.slice(0, 2).map(task => (
                                <div key={task.id} className="opacity-50 hover:opacity-80 transition-opacity">
                                  <TaskItem
                                    task={task}
                                    isExpanded={false}
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
                                    compact
                                  />
                                </div>
                              ))}
                              {dayCompleted.length > 2 && (
                                <div className="text-xs text-slate-400 dark:text-white/40 text-center">
                                  +{dayCompleted.length - 2} ещё
                                </div>
                              )}
                            </div>
                          )}
                          {!hasTasks && (
                            <div className="rounded-lg border border-dashed border-slate-200 dark:border-white/10 p-2 text-center text-xs text-slate-400 dark:text-white/30">
                              Пусто
                            </div>
                          )}
                        </div>
                      </DroppableContainer>
                    );
                  })}
                </div>
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
            <DragOverlay dropAnimation={null}>{renderDragOverlay()}</DragOverlay>
          </DndContext>
        ) : isWeekView && !isWeekGridView ? (
          // Неделя (список) - вертикальное отображение
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleWeekDragStart}
            onDragOver={handleWeekDragOver}
            onDragEnd={handleWeekDragEnd}
            onDragCancel={handleWeekDragCancel}
          >
            <div className="space-y-6">
              {weekTasksLoading && weekTasks.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="glass rounded-2xl h-24 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {weekDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayTasks = tasksByDate[dayKey] || [];
                    const dayIncomplete = weekTaskOrder[dayKey] || [];
                    const dayIncompleteIds = dayIncomplete.map(task => String(task.id));
                    const dayCompleted = dayTasks.filter(task => task.completed);
                    const hasTasks = dayIncomplete.length > 0 || dayCompleted.length > 0;
                    const isTodayDate = isToday(day);

                    return (
                      <div key={dayKey} className="glass rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                              isTodayDate 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/80'
                            }`}>
                              <span className="text-xs font-semibold capitalize">
                                {format(day, 'EEE', { locale: ru })}
                              </span>
                              <span className="text-lg font-bold">
                                {format(day, 'd')}
                              </span>
                            </div>
                            <div>
                              <h3 className={`font-semibold ${
                                isTodayDate 
                                  ? 'text-blue-600 dark:text-blue-400' 
                                  : 'text-slate-700 dark:text-white/80'
                              }`}>
                                {isTodayDate ? 'Сегодня' : format(day, 'd MMMM', { locale: ru })}
                              </h3>
                              <p className="text-sm text-slate-500 dark:text-white/50">
                                {dayIncomplete.length} задач{dayCompleted.length > 0 && `, ${dayCompleted.length} выполнено`}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleOpenAddTaskModal(day)}
                            className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-blue-500 hover:text-white transition-all"
                            aria-label="Добавить задачу"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <DroppableContainer
                          id={dayKey}
                          className="space-y-2 min-h-[40px]"
                        >
                          <SortableContext
                            key={`${dayKey}:list:${dayIncompleteIds.join('|')}`}
                            items={dayIncompleteIds}
                            strategy={verticalListSortingStrategy}
                          >
                            {dayIncomplete.map(task => (
                              <SortableTaskItem
                                key={task.id}
                                id={String(task.id)}
                                containerId={dayKey}
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
                          </SortableContext>
                          
                          {dayCompleted.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/10">
                              <p className="text-xs text-slate-400 dark:text-white/40 mb-2">Выполнено: {dayCompleted.length}</p>
                            </div>
                          )}
                          
                          {!hasTasks && (
                            <div className="rounded-lg border border-dashed border-slate-200 dark:border-white/10 p-4 text-center text-sm text-slate-400 dark:text-white/30">
                              Нет задач
                            </div>
                          )}
                        </DroppableContainer>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <DragOverlay dropAnimation={null}>{renderDragOverlay()}</DragOverlay>
          </DndContext>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDayDragStart}
            onDragOver={noop}
            onDragEnd={handleDayDragEnd}
            onDragCancel={handleDayDragCancel}
          >
            <div className="space-y-3">
              {tasksLoading && tasks.length === 0 ? (
                 [1, 2, 3].map(i => (
                   <div key={i} className="glass rounded-2xl h-16 animate-pulse" />
                 ))
              ) : (
                <SortableContext
                  key={`day:${dayTaskIds.join('|')}`}
                  items={dayTaskIds}
                  strategy={verticalListSortingStrategy}
                >
                  {dayTaskOrder.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      id={String(task.id)}
                      containerId={dateKey}
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
                </SortableContext>
              )}

              {/* Блок выполненных задач */}
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

              {/* Пустое состояние */}
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
            <DragOverlay dropAnimation={null}>{renderDragOverlay()}</DragOverlay>
          </DndContext>
        )}
      </main>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDate={handleSelectDateFromSearch}
      />

      <DatePickerModal
        key={isDatePickerOpen ? `date-picker:${dayDate.toISOString()}` : 'date-picker:closed'}
        isOpen={isDatePickerOpen}
        initialDate={dayDate}
        onClose={handleCloseDatePicker}
        onConfirm={handleConfirmMoveDate}
      />

      <AddTaskModal
        key={isAddTaskModalOpen && addTaskDate ? `add-task:${addTaskDate.toISOString()}` : 'add-task:closed'}
        isOpen={isAddTaskModalOpen && !!addTaskDate}
        date={addTaskDate ?? today}
        onClose={handleCloseAddTaskModal}
        onConfirm={handleConfirmAddTask}
      />
    </div>
  );
}

export default App;
