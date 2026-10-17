import React, { useState } from 'react';
import { X, CheckSquare, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PriorityLevel } from '@/domain/todo/TaskPriority';

interface AddCustomTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
}

export const AddCustomTodoModal: React.FC<AddCustomTodoModalProps> = ({
  isOpen,
  onClose,
  applicationId,
}) => {
  const { addCustomTodo } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel>('HIGH');
  const [dueDate, setDueDate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await addCustomTodo({
        applicationId,
        title,
        description: description || undefined,
        priorityLevel,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      if (res.success) {
        onClose();
        setTitle('');
        setDescription('');
      } else {
        setError(res.error || 'タスクの追加に失敗しました。');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">選考TODOタスクの追加</h2>
              <p className="text-xs text-slate-400">面接準備やリサーチ項目を起票します</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">タスク名 (必須)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="技術ブログのDDD設計事例を読み直す"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">優先度 (Priority VO)</label>
              <select
                value={priorityLevel}
                onChange={(e) => setPriorityLevel(e.target.value as PriorityLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="URGENT">最優先 (Urgent)</option>
                <option value="HIGH">高 (High)</option>
                <option value="MEDIUM">中 (Medium)</option>
                <option value="LOW">低 (Low)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">期日（任意）</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">詳細メモ</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="気になる点やURLのメモなど"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{submitting ? '追加中...' : 'タスクを追加'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
