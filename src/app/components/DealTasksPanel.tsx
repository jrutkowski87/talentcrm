'use client';

import { useState, useEffect, useCallback } from 'react';

interface Task {
  id: string;
  deal_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string | null;
  auto_generated: number;
  completed_at: string | null;
  created_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function DealTasksPanel({ dealId }: { dealId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  // New task form
  const [showAdd, setShowAdd] = useState(false);
  const defaultNewForm = { title: '', dueDate: '', priority: 'medium', description: '' };
  const [newForm, setNewForm] = useState(defaultNewForm);
  const [submitting, setSubmitting] = useState(false);

  // Editing
  const [editing, setEditing] = useState<{ id: string; title: string; dueDate: string; priority: string } | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/tasks`);
      const json = await res.json();
      if (json.success) setTasks(json.data || []);
    } catch {}
    setLoading(false);
  }, [dealId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newForm.title.trim(),
          due_date: newForm.dueDate || undefined,
          priority: newForm.priority,
          description: newForm.description.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNewForm(defaultNewForm);
        setShowAdd(false);
        await fetchTasks();
      }
    } catch {}
    setSubmitting(false);
  };

  const toggleComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await fetch(`/api/deals/${dealId}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchTasks();
    } catch {}
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch(`/api/deals/${dealId}/tasks/${taskId}`, { method: 'DELETE' });
      await fetchTasks();
    } catch {}
  };

  const startEdit = (task: Task) => {
    setEditing({ id: task.id, title: task.title, dueDate: task.due_date || '', priority: task.priority });
  };

  const saveEdit = async (taskId: string) => {
    if (!editing) return;
    try {
      await fetch(`/api/deals/${dealId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editing.title.trim(),
          due_date: editing.dueDate || null,
          priority: editing.priority,
        }),
      });
      setEditing(null);
      await fetchTasks();
    } catch {}
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading tasks...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Tasks</h3>
          <span className="text-xs text-gray-400">
            {activeTasks.length} active{completedTasks.length > 0 ? ` · ${completedTasks.length} done` : ''}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <form onSubmit={addTask} className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <input
            type="text"
            value={newForm.title}
            onChange={(e) => setNewForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            autoFocus
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Due Date</label>
              <input
                type="date"
                value={newForm.dueDate}
                onChange={(e) => setNewForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Priority</label>
              <select
                value={newForm.priority}
                onChange={(e) => setNewForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <textarea
            value={newForm.description}
            onChange={(e) => setNewForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !newForm.title.trim()} className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      )}

      {/* Active Tasks */}
      {activeTasks.length === 0 && !showAdd ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-500">No active tasks</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
          >
            Create the first task
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {activeTasks.map((task) => (
            <div key={task.id} className="group flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              <button
                onClick={() => toggleComplete(task)}
                className="mt-0.5 w-[18px] h-[18px] rounded border-2 border-gray-300 hover:border-indigo-500 flex items-center justify-center shrink-0 transition-colors"
              >
                {/* Empty checkbox */}
              </button>
              {editing?.id === task.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editing.title}
                    onChange={(e) => setEditing(ed => ed ? { ...ed, title: e.target.value } : ed)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                    autoFocus
                  />
                  <div className="flex gap-2 items-center">
                    <input type="date" value={editing.dueDate} onChange={(e) => setEditing(ed => ed ? { ...ed, dueDate: e.target.value } : ed)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900" />
                    <select value={editing.priority} onChange={(e) => setEditing(ed => ed ? { ...ed, priority: e.target.value } : ed)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 bg-white">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button onClick={() => saveEdit(task.id)} className="px-2 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700">Save</button>
                    <button onClick={() => setEditing(null)} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className={`text-[10px] ${task.due_date < today ? 'text-red-600 font-medium' : task.due_date === today ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                          {task.due_date < today ? 'Overdue · ' : task.due_date === today ? 'Today · ' : ''}
                          {new Date(task.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {task.auto_generated === 1 && (
                        <span className="text-[10px] text-purple-500">auto</span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{task.description}</p>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button onClick={() => startEdit(task)} className="p-1 text-gray-400 hover:text-gray-600 rounded" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${showCompleted ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {completedTasks.length} completed
          </button>
          {showCompleted && (
            <div className="space-y-1 mt-1">
              {completedTasks.map((task) => (
                <div key={task.id} className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggleComplete(task)}
                    className="w-[18px] h-[18px] rounded border-2 border-green-400 bg-green-50 flex items-center justify-center shrink-0"
                  >
                    <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-400 line-through flex-1">{task.title}</span>
                  <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
