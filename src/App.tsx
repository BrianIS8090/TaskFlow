import { useState } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { TaskItem } from './components/Tasks/TaskItem';
import { LoginForm } from './components/Auth/LoginForm';
import { useTasks } from './hooks/useTasks';
import { useAuth } from './context/AuthContext';
import { Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | number | null>(null);

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
    addCheckpoint,
    toggleCheckpoint,
    deleteCheckpoint,
    loading: tasksLoading
  } = useTasks(dateKey);

  // 1. Loading State (Checking Auth)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // 2. Not Authenticated -> Show Login Form
  if (!user) {
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

  return (
    <div className="min-h-screen bg-slate-900 flex text-white font-sans">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <Sidebar 
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 p-4 lg:p-8 relative overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
          <div className="text-white font-medium capitalize">
            {format(selectedDate, 'd MMMM', { locale: ru })}
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
          </div>
        </div>

        {/* Date Header */}
        <div className="hidden lg:block mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold text-white mb-1 capitalize">
            {isToday(selectedDate) ? 'Сегодня' : format(selectedDate, 'd MMMM', { locale: ru })}
          </h1>
          <p className="text-white/50 h-6">
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
              className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-lg"
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
                onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                onAddCheckpoint={(text) => addCheckpoint(String(task.id), text)}
                onToggleCheckpoint={(cpId) => toggleCheckpoint(String(task.id), cpId)}
                onDeleteCheckpoint={(cpId) => deleteCheckpoint(String(task.id), cpId)}
              />
            ))
          )}

          {/* Completed Section */}
          {completedTasks.length > 0 && (
            <div className="mt-8 animate-fade-in">
              <h3 className="text-white/40 text-sm font-medium mb-3 uppercase tracking-wider">Выполнено</h3>
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
                      onUpdateTitle={(title) => updateTaskTitle(String(task.id), title)}
                      onAddCheckpoint={(text) => addCheckpoint(String(task.id), text)}
                      onToggleCheckpoint={(cpId) => toggleCheckpoint(String(task.id), cpId)}
                      onDeleteCheckpoint={(cpId) => deleteCheckpoint(String(task.id), cpId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!tasksLoading && tasks.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-white/60 text-lg font-medium mb-2">Нет задач на этот день</h3>
              <p className="text-white/40 text-sm">Добавьте первую задачу выше</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;