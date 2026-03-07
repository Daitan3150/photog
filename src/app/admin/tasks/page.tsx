'use client';

import { useState } from 'react';
import { ClipboardList, CheckCircle2, Circle, Clock, Plus, Trash2, Layout, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/admin/AuthProvider';

interface Task {
    id: string;
    title: string;
    status: 'pending' | 'completed';
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    category: string;
}

export default function TasksPage() {
    const { role } = useAuth();
    const isAdmin = role === 'admin';
    const [tasks, setTasks] = useState<Task[]>([
        { id: '1', title: 'ポートフォリオのトップ画像を更新する', status: 'pending', priority: 'high', createdAt: '2024-03-07', category: 'Design' },
        { id: '2', title: '新作コスプレ写真のレタッチ完了', status: 'completed', priority: 'medium', createdAt: '2024-03-06', category: 'Edit' },
        { id: '3', title: 'モデルとの撮影スケジュール確認', status: 'pending', priority: 'medium', createdAt: '2024-03-07', category: 'Shoot' },
        { id: '4', title: 'ブログ記事「春の撮影テクニック」を公開', status: 'pending', priority: 'low', createdAt: '2024-03-05', category: 'Blog' },
    ]);

    const [newTaskTitle, setNewTaskTitle] = useState('');

    const toggleTask = (id: string) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
    };

    const deleteTask = (id: string) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        const newTask: Task = {
            id: Date.now().toString(),
            title: newTaskTitle,
            status: 'pending',
            priority: 'medium',
            createdAt: new Date().toISOString().split('T')[0],
            category: 'General'
        };
        setTasks([newTask, ...tasks]);
        setNewTaskTitle('');
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 rounded-xl">
                            <ClipboardList className="w-6 h-6 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.4em]">Creative Flow</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                        Task Management
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">進行中のプロジェクトとやるべきことのリスト</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <div className="px-4 py-2 text-center border-r border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Total</p>
                        <p className="text-xl font-black text-gray-900 leading-none">{tasks.length}</p>
                    </div>
                    <div className="px-4 py-2 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Done</p>
                        <p className="text-xl font-black text-green-600 leading-none">{tasks.filter(t => t.status === 'completed').length}</p>
                    </div>
                </div>
            </header>

            <section className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8">
                <form onSubmit={addTask} className="p-6 bg-slate-50 border-b border-gray-100 flex gap-3">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="新しいタスクを追加..."
                        className="flex-1 bg-white border-gray-200 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                    />
                    <button
                        type="submit"
                        className="bg-gray-900 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-black active:scale-95 transition-all shadow-lg shadow-black/10"
                    >
                        <Plus size={18} />
                        ADD
                    </button>
                </form>

                <div className="divide-y divide-gray-50">
                    {tasks.length === 0 ? (
                        <div className="p-20 flex flex-col items-center justify-center text-center opacity-40">
                            <Layout className="w-16 h-16 mb-4" />
                            <p className="font-bold">タスクはありません。<br />素晴らしい一日を！</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div
                                key={task.id}
                                className={`group p-6 flex items-center gap-6 transition-all hover:bg-blue-50/30 ${task.status === 'completed' ? 'opacity-50' : ''}`}
                            >
                                <button
                                    onClick={() => toggleTask(task.id)}
                                    className={`shrink-0 transition-transform active:scale-90 ${task.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}`}
                                >
                                    {task.status === 'completed' ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${task.priority === 'high' ? 'bg-red-50 border-red-100 text-red-600' :
                                                task.priority === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                    'bg-gray-50 border-gray-100 text-gray-500'
                                            }`}>
                                            {task.priority}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{task.category}</span>
                                    </div>
                                    <h3 className={`text-lg font-bold truncate transition-all ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                        {task.title}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            <Clock size={12} />
                                            {task.createdAt}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => deleteTask(task.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                    <div className="relative z-10">
                        <Sparkles className="w-10 h-10 mb-6 text-blue-200" />
                        <h2 className="text-2xl font-black mb-2 tracking-tight">Studio Motivation</h2>
                        <p className="text-blue-100 font-medium leading-relaxed mb-6 opacity-80">
                            「完璧を求めるのではなく、まず完成させることが、創造への第一歩です。」
                        </p>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="font-black text-gray-900 mb-1">Upcoming Events</h3>
                    <p className="text-sm text-gray-500 font-medium">
                        今週末にコミックマーケット104の<br />撮影予定が含まれています。
                    </p>
                </div>
            </div>
        </div>
    );
}
