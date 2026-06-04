import React, { useState, useEffect, useRef } from 'react';

// API Endpoints Base Configuration
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : `${window.location.origin}/_/backend`;

// Interfaces
interface Task {
  id: number;
  title: string;
  description?: string;
  category: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  is_completed: boolean;
}

interface Schedule {
  id: number;
  date: string;
  total_focus_hours: number;
  focus_areas: string[];
  tasks: Task[];
}

interface Prompt {
  id: number;
  title: string;
  prompt: string;
  icon: string;
  category: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  message: string;
}

interface DocumentInfo {
  id: number;
  name: string;
  size_bytes: number;
  uploaded_at: string;
}

interface AnalyticsSummary {
  total_focus_hours: number;
  total_tasks_completed: number;
  completion_rate: number;
  category_distribution: Record<string, number>;
}

interface MLPrediction {
  prediction_percentage: number;
  recommendations: string[];
}

interface HealthHub {
  id: number;
  date: string;
  water_target_ml: number;
  water_actual_ml: number;
  sleep_target_hours: number;
  sleep_actual_hours: number;
  is_workout_completed: boolean;
  workout_notes: string;
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'scheduler' | 'coach' | 'analytics' | 'health'>('scheduler');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // API Status & Date
  const [apiConnected, setApiConnected] = useState<boolean>(true);
  const [currentDateString, setCurrentDateString] = useState<string>('');

  // Daily Scheduler State
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [focusHours, setFocusHours] = useState<number>(6);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['Python Full Stack', 'AI Full Stack']);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);

  // Technical Progress Sliders State
  const [pythonProgress, setPythonProgress] = useState<number>(75);
  const [aiProgress, setAiProgress] = useState<number>(60);
  const [dataProgress, setDataProgress] = useState<number>(45);

  // Weekly logged hours (Static defaults / mocked representation)
  const weeklyHours = [
    { day: 'M', hours: 5.5, label: 'Mon: 5.5h', height: '55%' },
    { day: 'T', hours: 7.2, label: 'Tue: 7.2h', height: '72%' },
    { day: 'W', hours: 9.0, label: 'Wed: 9.0h', height: '90%' },
    { day: 'T', hours: 4.0, label: 'Thu: 4.0h', height: '40%' },
    { day: 'F', hours: 6.5, label: 'Fri: 6.5h', height: '65%' },
    { day: 'S', hours: 3.0, label: 'Sat: 3.0h', height: '30%' },
    { day: 'S', hours: 2.0, label: 'Sun: 2.0h', height: '20%' },
  ];

  // AI Career Mentor State
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedDocs, setUploadedDocs] = useState<DocumentInfo[]>([]);
  const [illuminatedSkills, setIlluminatedSkills] = useState<string[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Analytics State
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [prediction, setPrediction] = useState<MLPrediction | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Health Hub State
  const [health, setHealth] = useState<HealthHub | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [sleepInput, setSleepInput] = useState<number>(8);

  // Dynamic Date on Mount
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDateString(new Date().toLocaleDateString('en-US', options));
    
    // Initial fetches
    fetchTodaySchedule();
    fetchPreloadedPrompts();
    fetchIndexedDocuments();
    checkHealthConnection();
  }, []);

  // Sync hash with active tab
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as any;
    if (['scheduler', 'coach', 'analytics', 'health'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (tab: 'scheduler' | 'coach' | 'analytics' | 'health') => {
    setActiveTab(tab);
    window.location.hash = tab;
    if (tab === 'analytics') {
      fetchAnalyticsData();
    } else if (tab === 'health') {
      fetchHealthData();
    }
  };

  // Check Health Connection
  const checkHealthConnection = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/health`);
      setApiConnected(res.ok);
    } catch {
      setApiConnected(false);
    }
  };

  // --- Scheduler Logic ---
  const fetchTodaySchedule = async () => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/scheduler/today`);
      if (res.status === 404) {
        setSchedule(null);
        return;
      }
      if (!res.ok) throw new Error('Database query failed.');
      const data = await res.json();
      setSchedule(data);
      triggerSkillIlluminationFromTasks(data.tasks);
    } catch (err: any) {
      console.error(err);
      setScheduleError('Could not fetch daily schedule from API. Ensure backend is running.');
    } finally {
      setScheduleLoading(false);
    }
  };

  const triggerSkillIlluminationFromTasks = (tasks: Task[]) => {
    const categories = tasks.map(t => t.category);
    const newSkills = [...illuminatedSkills];
    if (categories.includes('Python Full Stack') && !newSkills.includes('fastapi')) {
      newSkills.push('fastapi', 'sqlalchemy', 'async', 'rest');
    }
    if (categories.includes('AI Full Stack') && !newSkills.includes('gemini')) {
      newSkills.push('gemini', 'llm');
    }
    if (categories.includes('Data Analytics') && !newSkills.includes('pandas')) {
      newSkills.push('pandas', 'numpy');
    }
    setIlluminatedSkills(Array.from(new Set(newSkills)));
  };

  const handleGenerateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAreas.length === 0) {
      alert('Please select at least one syllabus track to generate a schedule!');
      return;
    }
    setIsCompiling(true);
    try {
      const payload = {
        date: new Date().toISOString().split('T')[0],
        total_focus_hours: focusHours,
        focus_areas: selectedAreas
      };
      const res = await fetch(`${API_BASE}/api/v1/scheduler/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to compile routine.');
      const data = await res.json();
      setSchedule(data);
      triggerSkillIlluminationFromTasks(data.tasks);
      alert('Success! Your personalized routine has been compiled and committed to database.');
    } catch (err) {
      console.error(err);
      alert('An error occurred during schedule generation. Ensure your backend is running.');
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleTaskStatus = async (taskId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/scheduler/tasks/${taskId}/complete?is_completed=${!currentStatus}`, {
        method: 'PATCH'
      });
      if (!res.ok) throw new Error('Toggle status failed');
      const updatedTask = await res.json();
      if (schedule) {
        const updatedTasks = schedule.tasks.map(t => t.id === taskId ? updatedTask : t);
        setSchedule({ ...schedule, tasks: updatedTasks });
      }
    } catch (err) {
      console.error(err);
      alert('Could not update task completion status.');
    }
  };

  const calculateScheduleProgress = () => {
    if (!schedule || !schedule.tasks || schedule.tasks.length === 0) return 0;
    const completed = schedule.tasks.filter(t => t.is_completed).length;
    return Math.round((completed / schedule.tasks.length) * 100);
  };

  const handleAreaChange = (area: string) => {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  // --- AI Coach Logic ---
  const fetchPreloadedPrompts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/career_coach/preloaded-prompts`);
      if (res.ok) {
        const data = await res.json();
        setPrompts(data);
      }
    } catch (err) {
      console.error('Prompts load failed:', err);
    }
  };

  const fetchIndexedDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/career_coach/documents`);
      if (res.ok) {
        const data = await res.json();
        setUploadedDocs(data);
      }
    } catch (err) {
      console.error('Docs load failed:', err);
    }
  };

  const triggerQuickPrompt = (text: string) => {
    setChatInput(text);
    sendChatMessage(text);
  };

  const sendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    setChatInput('');
    const userMsg: ChatMessage = { role: 'user', message: text };
    setChatHistory(prev => [...prev, userMsg]);
    scanKeywordsForIllumination(text);

    setIsStreaming(true);
    setStreamingResponse('');

    try {
      const payload = {
        message: text,
        history: [...chatHistory, userMsg].slice(0, -1)
      };

      const res = await fetch(`${API_BASE}/api/v1/career_coach/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('AI query streaming request failed.');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              accumulated += line.slice(6);
              setStreamingResponse(accumulated);
            }
          }
        }
      }

      setChatHistory(prev => [...prev, { role: 'model', message: accumulated }]);
      scanKeywordsForIllumination(accumulated);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, {
        role: 'model',
        message: '⚠️ **Lead Developer Alert**: I encountered a network pipeline error. Please verify that your backend service is running locally on port 8000.'
      }]);
    } finally {
      setIsStreaming(false);
      setStreamingResponse('');
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, streamingResponse]);

  const scanKeywordsForIllumination = (text: string) => {
    const textLower = text.toLowerCase();
    const skillsList = [
      { id: 'fastapi', keyword: 'fastapi' },
      { id: 'sqlalchemy', keyword: 'sqlalchemy' },
      { id: 'async', keyword: 'async' },
      { id: 'rest', keyword: 'rest' },
      { id: 'gemini', keyword: 'gemini' },
      { id: 'rag', keyword: 'rag' },
      { id: 'langchain', keyword: 'langchain' },
      { id: 'llm', keyword: 'llm' },
      { id: 'pandas', keyword: 'pandas' },
      { id: 'numpy', keyword: 'numpy' },
      { id: 'sklearn', keyword: 'scikit' },
      { id: 'regression', keyword: 'regression' },
    ];

    const newSkills = [...illuminatedSkills];
    skillsList.forEach(s => {
      if (textLower.includes(s.keyword) && !newSkills.includes(s.id)) {
        newSkills.push(s.id);
      }
    });
    setIlluminatedSkills(newSkills);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const allowed = ['txt', 'md', 'pdf'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!allowed.includes(ext)) {
        alert('Invalid file format. Please upload a PDF, TXT, or MD document.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Maximum supported file size is 5MB.');
        return;
      }

      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE}/api/v1/career_coach/upload`, {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        alert('Success! Document has been indexed and added to memory.');
        fetchIndexedDocuments();
      } catch (err) {
        console.error(err);
        alert('Could not upload document.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/career_coach/documents/${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setUploadedDocs(uploadedDocs.filter(d => d.id !== docId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const downloadTranscript = () => {
    if (chatHistory.length === 0) {
      alert('The conversation log is currently empty!');
      return;
    }
    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let markdown = `# AI Career Coach Transcript\n*Date: ${todayStr}*\n\n---\n\n`;
    chatHistory.forEach(chat => {
      const role = chat.role === 'user' ? '👤 SOFTWARE ENGINEER (YOU)' : '🤖 CAREER COACH AI';
      markdown += `### ${role}\n\n${chat.message}\n\n---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AI_Coach_Transcript_${new Date().toISOString().split('T')[0]}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Analytics Logic ---
  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const summaryRes = await fetch(`${API_BASE}/api/v1/analytics/summary`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
        drawCanvasChart(summaryData.category_distribution);
      }
      const predictRes = await fetch(`${API_BASE}/api/v1/analytics/predict`);
      if (predictRes.ok) {
        const predictData = await predictRes.json();
        setPrediction(predictData);
      }
    } catch (err) {
      console.error('Analytics loading failed:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const drawCanvasChart = (dist: Record<string, number>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const categoriesCounts = dist || {
      'Python Full Stack': 3,
      'AI Full Stack': 2,
      'Data Analytics': 1,
      'Productivity': 2
    };

    const totalUnits = Object.values(categoriesCounts).reduce((a, b) => a + b, 0);
    const themeColors: Record<string, string> = {
      'Python Full Stack': '#6366f1',
      'AI Full Stack': '#a855f7',
      'Data Analytics': '#10b981',
      'Productivity': '#ec4899'
    };

    const centerX = canvas.width / 2 - 60;
    const centerY = canvas.height / 2;
    const radius = 68;
    const innerRadius = 46;
    let startAngle = -Math.PI / 2;

    if (totalUnits === 0) {
      ctx.font = "600 11px 'Inter', sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "center";
      ctx.fillText("No tasks recorded yet", canvas.width / 2, canvas.height / 2);
      return;
    }

    // Render segments
    Object.keys(categoriesCounts).forEach(cat => {
      const count = categoriesCounts[cat];
      if (count === 0) return;

      const proportion = count / totalUnits;
      const endAngle = startAngle + (proportion * 2 * Math.PI);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = themeColors[cat] || '#6366f1';
      ctx.fill();

      startAngle = endAngle;
    });

    // Central text
    ctx.font = "bold 16px 'Outfit', sans-serif";
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${totalUnits}`, centerX, centerY - 6);

    ctx.font = "600 9px 'Inter', sans-serif";
    ctx.fillStyle = '#64748b';
    ctx.fillText('TASKS', centerX, centerY + 10);

    // Color legends
    const legendX = canvas.width - 130;
    let legendY = 32;

    Object.keys(categoriesCounts).forEach(cat => {
      const count = categoriesCounts[cat];

      ctx.beginPath();
      ctx.arc(legendX, legendY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = themeColors[cat] || '#6366f1';
      ctx.fill();

      ctx.font = "600 10px 'Inter', sans-serif";
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(cat.length > 15 ? cat.substring(0, 15) + '...' : cat, legendX + 14, legendY);

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(`(${count})`, canvas.width - 10, legendY);

      legendY += 28;
    });
  };

  // --- Health Hub Logic ---
  const fetchHealthData = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/trainer/today`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        if (data.sleep_actual_hours > 0) setSleepInput(data.sleep_actual_hours);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleLogWater = async (ml: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/trainer/water?ml=${ml}`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogSleep = async () => {
    if (sleepInput < 0 || sleepInput > 24) {
      alert('Please enter a valid sleep duration.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/trainer/sleep?hours=${sleepInput}`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        alert('Success! Your sleep duration has been recorded.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleWorkout = async () => {
    if (!health) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/trainer/workout?is_completed=${!health.is_workout_completed}`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const parseStretches = () => {
    if (!health || !health.workout_notes) return [];
    return health.workout_notes.split('; ').filter(s => s.trim());
  };

  // Helper for Markdown rendering in chat bubbles
  const renderMessageContent = (msg: string) => {
    // Simple basic regex parser for rendering bold, code, list tags in chat message
    let parsed = msg
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(?:python|javascript|js|html|css)?\n([\s\S]*?)```/g, '<pre class="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs font-mono text-pink-400 overflow-x-auto my-2"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-950 text-pink-400 px-1 rounded font-mono text-xs">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-sm my-1">$1</li>');

    return <div className="space-y-1.5 leading-relaxed text-slate-100" dangerouslySetInnerHTML={{ __html: parsed }} />;
  };

  return (
    <div className="w-screen h-screen flex text-slate-200 relative bg-midnight font-inter select-none overflow-hidden">
      {/* Background Glowing Blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[250px] shrink-0 border-r border-slate-800 bg-slate-950/90 backdrop-blur-xl flex flex-col h-full transition-transform duration-300 md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Logo Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-base shadow-lg shadow-indigo-500/20 font-outfit font-black">
            ⚡
          </div>
          <span className="font-outfit font-bold text-base leading-tight bg-gradient-to-r from-indigo-200 via-slate-100 to-emerald-200 bg-clip-text text-transparent">
            AI Career Coach
          </span>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => { handleTabChange('scheduler'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
              activeTab === 'scheduler' ? 'sidebar-item-active text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="text-base">📅</span>
            <span>Daily Scheduler</span>
          </button>

          <button
            onClick={() => { handleTabChange('coach'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
              activeTab === 'coach' ? 'sidebar-item-active text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="text-base">💬</span>
            <span>Career Mentor</span>
          </button>

          <button
            onClick={() => { handleTabChange('analytics'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
              activeTab === 'analytics' ? 'sidebar-item-active text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="text-base">📊</span>
            <span>Habit Analytics</span>
          </button>

          <button
            onClick={() => { handleTabChange('health'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
              activeTab === 'health' ? 'sidebar-item-active text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span className="text-base">⚡</span>
            <span>Health Hub</span>
          </button>
        </nav>

        {/* Sidebar Footer User Info / API Status */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-[10px] text-emerald-400 font-bold uppercase tracking-wider justify-center">
            <span className="status-pulse w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            <span>{apiConnected ? 'API Connected' : 'API Connection Lost'}</span>
          </div>

          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-slate-900/30 border border-slate-850">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-sm font-semibold">
              👤
            </div>
            <div className="min-w-0">
              <h5 className="text-xs font-bold text-slate-200 truncate">Pavithra V</h5>
              <p className="text-[10px] text-slate-500 font-semibold truncate">Associate Engineer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER AREA */}
      <div className="flex-grow flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Main Dashboard Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-800 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-40">
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-750 text-slate-350 hover:text-white transition active:scale-95"
              title="Open Navigation"
            >
              ☰
            </button>
            <span className="text-slate-500 font-medium text-sm hidden sm:inline">Workspace</span>
            <span className="text-slate-600 font-semibold hidden sm:inline">/</span>
            <span className="text-slate-200 font-bold text-sm">
              {activeTab === 'scheduler' && 'Daily Routine Planner'}
              {activeTab === 'coach' && 'AI Career Mentor'}
              {activeTab === 'analytics' && 'Productivity & Habit Analytics'}
              {activeTab === 'health' && 'Developer Health Hub'}
            </span>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-4">
            {/* Display Date */}
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-xs text-indigo-300 font-semibold shadow-inner font-mono">
              <span>📅</span>
              <span>{currentDateString || 'Loading date...'}</span>
            </div>

            {/* Notification trigger mockup */}
            <button className="w-9 h-9 flex items-center justify-center bg-slate-950/40 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-400 rounded-xl transition-all shadow-inner relative">
              <span className="text-sm">🔔</span>
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 absolute top-2 right-2 animate-ping"></span>
            </button>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden w-full">
          {/* DYNAMIC VIEW: Scheduler Tab */}
          {activeTab === 'scheduler' && (
            <div className="space-y-6">
              {/* Header Page Title */}
              <div className="pb-2">
                <h2 className="font-outfit font-extrabold text-2xl md:text-3xl text-slate-100 tracking-tight">
                  Daily Routine Planner
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Allocate focus study hours, customize categories, and dynamically compile schedules.
                </p>
              </div>

              {/* 3-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Column 1: Daily Study Routine Calendar */}
                <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-outfit font-bold text-base text-slate-200">Daily Study Routine</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Hour-by-hour calendar of today's study blocks.</p>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      Today
                    </span>
                  </div>

                  {/* Progress log */}
                  <div className="flex flex-col gap-2 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-400">DAILY TARGET COMPLETION</span>
                      <span className="text-xs font-black text-indigo-400">{calculateScheduleProgress()}%</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full w-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${calculateScheduleProgress()}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="flex flex-col gap-3">
                    {scheduleLoading ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3">
                        <span className="animate-spin text-xl">⏳</span>
                        <p className="text-xs font-medium text-slate-400">Retrieving study routine...</p>
                      </div>
                    ) : scheduleError ? (
                      <div className="p-4 text-center text-xs text-rose-400 font-semibold border border-rose-500/10 bg-rose-500/5 rounded-xl">
                        ⚠️ {scheduleError}
                      </div>
                    ) : !schedule || schedule.tasks.length === 0 ? (
                      <div className="glass-card p-8 rounded-xl text-center flex flex-col items-center justify-center gap-3 border-dashed border-2 border-slate-800">
                        <span className="text-3xl">⚡</span>
                        <div>
                          <h4 className="font-outfit font-bold text-slate-200 text-sm">Study plan is empty today</h4>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                            Use the configuration panel to allocate focus study hours.
                          </p>
                        </div>
                      </div>
                    ) : (
                      schedule.tasks.map(task => (
                        <div
                          key={task.id}
                          className={`task-row-card flex items-center justify-between p-4 gap-4 border border-slate-800/80 rounded-xl transition-all duration-300 ${
                            task.is_completed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-950/20 hover:border-indigo-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Checkbox */}
                            <div
                              onClick={() => toggleTaskStatus(task.id, task.is_completed)}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0 ${
                                task.is_completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white font-bold text-xs'
                                  : 'border-slate-700 hover:border-slate-500 bg-slate-950'
                              }`}
                            >
                              {task.is_completed && '✔'}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 font-mono">
                                  [{task.start_time} - {task.end_time}]
                                </span>
                                <span
                                  className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                                    task.category === 'Python Full Stack'
                                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                      : task.category === 'AI Full Stack'
                                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                  }`}
                                >
                                  {task.category}
                                </span>
                              </div>
                              <h4 className={`font-bold text-slate-200 text-xs mt-1.5 truncate ${task.is_completed ? 'line-through text-slate-450' : ''}`}>
                                {task.title}
                              </h4>
                              <p className="text-[10px] text-slate-450 mt-0.5 truncate">{task.description}</p>
                            </div>
                          </div>

                          <span className="text-[9px] font-extrabold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono shrink-0">
                            {task.duration_minutes} MINS
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: Configuration & Progress Tracking Sliders */}
                <div className="space-y-6">
                  {/* Configure Today's Plan */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
                    <h3 className="font-outfit font-bold text-base text-slate-200 border-b border-slate-800 pb-3">
                      Configure Today's Plan
                    </h3>

                    <form onSubmit={handleGenerateRoutine} className="flex flex-col gap-4">
                      {/* Study hours input */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                          Dedicated Study Hours
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={focusHours}
                            onChange={e => setFocusHours(parseInt(e.target.value) || 0)}
                            required
                            className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-200 outline-none transition-all"
                          />
                          <span className="absolute right-4 text-[9px] font-black text-indigo-400">HOURS</span>
                        </div>
                      </div>

                      {/* Syllabus Selection */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                          Syllabus Categories
                        </label>
                        <div className="flex flex-col gap-2 mt-1">
                          {['Python Full Stack', 'AI Full Stack', 'Data Analytics'].map(area => (
                            <label
                              key={area}
                              className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/50 hover:bg-slate-950/90 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-base">
                                  {area === 'Python Full Stack' ? '🐍' : area === 'AI Full Stack' ? '🤖' : '📊'}
                                </span>
                                <span className="text-xs font-semibold text-slate-300">{area}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedAreas.includes(area)}
                                onChange={() => handleAreaChange(area)}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-950 accent-indigo-500"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isCompiling}
                        className="mt-2 w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                      >
                        {isCompiling ? '⏳ Compiling routine...' : '⚡ Generate Daily Schedule'}
                      </button>
                    </form>
                  </div>

                  {/* Progress Tracking Sliders */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
                    <h3 className="font-outfit font-bold text-base text-slate-200 border-b border-slate-800 pb-3">
                      Technical Progress Tracking
                    </h3>

                    <div className="flex flex-col gap-5">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-300">Python Full Stack</span>
                          <span className="text-xs font-extrabold text-indigo-400 font-mono">{pythonProgress}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={pythonProgress}
                          onChange={e => setPythonProgress(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-300">AI & LLM Integration</span>
                          <span className="text-xs font-extrabold text-purple-400 font-mono">{aiProgress}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={aiProgress}
                          onChange={e => setAiProgress(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-300">Data Science & ML</span>
                          <span className="text-xs font-extrabold text-emerald-400 font-mono">{dataProgress}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={dataProgress}
                          onChange={e => setDataProgress(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Goal progress indicators & Weekly activity */}
                <div className="space-y-6">
                  {/* Goal Progress SVGs */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
                    <h3 className="font-outfit font-bold text-base text-slate-200 border-b border-slate-800 pb-3">
                      Goal Progress Metrics
                    </h3>

                    <div className="flex items-center justify-around gap-4 py-2">
                      <div className="flex flex-col items-center text-center">
                        <svg className="transform -rotate-90" width="70" height="70">
                          <circle className="text-slate-800" strokeWidth="6" stroke="currentColor" fill="transparent" r="28" cx="35" cy="35" />
                          <circle className="text-indigo-500" strokeWidth="6" strokeDasharray="175.9" strokeDashoffset="44" strokeLinecap="round" stroke="currentColor" fill="transparent" r="28" cx="35" cy="35" />
                        </svg>
                        <span className="text-[10px] font-bold text-slate-200 mt-2">Weekly</span>
                        <span className="text-[9px] font-black text-indigo-400 mt-0.5">75%</span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <svg className="transform -rotate-90" width="70" height="70">
                          <circle className="text-slate-800" strokeWidth="6" stroke="currentColor" fill="transparent" r="28" cx="35" cy="35" />
                          <circle className="text-purple-500" strokeWidth="6" strokeDasharray="175.9" strokeDashoffset="70" strokeLinecap="round" stroke="currentColor" fill="transparent" r="28" cx="35" cy="35" />
                        </svg>
                        <span className="text-[10px] font-bold text-slate-200 mt-2">Skills Focus</span>
                        <span className="text-[9px] font-black text-purple-400 mt-0.5">60%</span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <svg className="transform -rotate-90" width="70" height="70">
                          <circle className="text-slate-800" strokeWidth="6" stroke="currentColor" fill="transparent" r="28" cx="35" cy="35" />
                          <circle className="text-emerald-500" strokeWidth="6" strokeDasharray="175.9" strokeDashoffset="17.5" strokeLinecap="round" stroke="currentColor" fill="transparent" r="28" cx="35" cy="35" />
                        </svg>
                        <span className="text-[10px] font-bold text-slate-200 mt-2">Streak</span>
                        <span className="text-[9px] font-black text-emerald-400 mt-0.5">90%</span>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Activity Interactive Bar Chart */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                    <div>
                      <h3 className="font-outfit font-bold text-base text-slate-200">Weekly Activity Profile</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Visual map of daily logged study hours.</p>
                    </div>

                    <div className="flex items-end justify-between h-32 px-2 pt-6 relative">
                      {weeklyHours.map(item => (
                        <div key={item.day} className="flex flex-col items-center gap-2 group relative cursor-pointer">
                          <div className="w-6 bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] rounded-t transition-all duration-350" style={{ height: item.hours * 10 }} />
                          <span className="text-[10px] font-semibold text-slate-400 font-mono">{item.day}</span>
                          <div className="absolute bottom-16 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[9px] font-extrabold text-indigo-400 font-mono pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl">
                            {item.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mini Skill Growth Analytics */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                    <h3 className="font-outfit font-bold text-base text-slate-200">Skill Growth Analytics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col gap-1 shadow-inner">
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider">MONTHLY RANK</span>
                        <span className="text-xs font-black text-indigo-400 font-mono">Lvl 4 (Lead Dev)</span>
                      </div>
                      <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col gap-1 shadow-inner">
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider">CURRICULUM PCT</span>
                        <span className="text-xs font-black text-emerald-400 font-mono">68% Done</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC VIEW: AI Career Mentor Tab */}
          {activeTab === 'coach' && (
            <div className="space-y-6 flex flex-col w-full">
              {/* Header Title */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl shadow-md font-bold">
                    🤖
                  </div>
                  <div>
                    <h2 className="font-outfit font-extrabold text-xl md:text-2xl text-slate-100">
                      Career Mentor & Lead Dev AI
                    </h2>
                    <p className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block animate-pulse"></span>
                      Active Model: Gemini 3.5 Flash
                    </p>
                  </div>
                </div>

                <button
                  onClick={downloadTranscript}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 active:scale-95 transition-all shadow-inner"
                >
                  <span>📥</span> Export Chat (.md)
                </button>
              </div>

              {/* Chat Split Pane */}
              <div className="flex-1 flex flex-col md:flex-row gap-6 w-full">
                {/* Chat Message Logs Area */}
                <div className="flex-1 flex flex-col rounded-xl border border-slate-800 bg-slate-950/20 p-6">
                  <div className="flex-1 flex flex-col gap-4">
                    {/* Welcome Message */}
                    <div className="flex gap-4 max-w-[85%] self-start">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-sm shrink-0">
                        🤖
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs leading-relaxed max-w-full">
                        <h4 className="font-outfit font-bold text-indigo-300 text-sm mb-1.5">
                          🚀 Welcome to your AI Mentorship Workspace!
                        </h4>
                        <p className="mb-2">
                          I am your Lead Developer and Career Coach. Ask me about system designs, mock coding interviews, resume optimizations, or career pathways.
                        </p>
                        <p>Select one of the quick preparation prompt guides on the side to get started instantly!</p>
                      </div>
                    </div>

                    {/* Chat history */}
                    {chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        className={`flex gap-4 max-w-[85%] ${
                          chat.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm shrink-0 ${
                            chat.role === 'user'
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                              : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                          }`}
                        >
                          {chat.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div
                          className={`border rounded-2xl p-4 text-xs leading-relaxed max-w-full overflow-hidden ${
                            chat.role === 'user'
                              ? 'bg-slate-800 border-slate-700 rounded-tr-none'
                              : 'bg-slate-900/80 border-slate-800 rounded-tl-none'
                          }`}
                        >
                          {chat.role === 'user' ? (
                            <p className="whitespace-pre-wrap font-medium">{chat.message}</p>
                          ) : (
                            renderMessageContent(chat.message)
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Streaming bubble */}
                    {isStreaming && (
                      <div className="flex gap-4 max-w-[85%] self-start">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-sm shrink-0">
                          🤖
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs leading-relaxed max-w-full">
                          {streamingResponse ? (
                            renderMessageContent(streamingResponse)
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-300"></span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Form */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      sendChatMessage();
                    }}
                    className="mt-4 flex items-end gap-3 border-t border-slate-800 pt-4 shrink-0"
                  >
                    <textarea
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask about DSA optimization, system design schemas, resume formats..."
                      required
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendChatMessage();
                        }
                      }}
                      className="flex-1 min-h-[50px] max-h-[150px] resize-none bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-200 outline-none transition-all"
                      rows={2}
                    />

                    <button
                      type="submit"
                      disabled={isStreaming}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-[50px] px-6 rounded-xl transition shadow-md shadow-indigo-600/10 active:scale-95"
                    >
                      Send 🚀
                    </button>
                  </form>
                </div>

                {/* Right: RAG File Uploader, Skills & Guides */}
                <div className="w-full md:w-80 shrink-0 flex flex-col gap-6 border-l border-slate-800/60 pl-4 pr-1">
                  {/* File Uploader */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      Ground AI: Upload Resume/Docs
                    </span>
                    <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/40 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-950/30">
                      {isUploading ? (
                        <>
                          <span className="animate-spin text-xl mb-1">⏳</span>
                          <h5 className="text-[10px] font-bold text-slate-300">Parsing and Indexing...</h5>
                          <p className="text-[9px] text-indigo-400 mt-0.5 font-semibold">TF-IDF Vector Model Building</p>
                        </>
                      ) : (
                        <>
                          <span className="text-xl mb-1">📤</span>
                          <h5 className="text-[11px] font-bold text-slate-300">Drag & Drop File</h5>
                          <p className="text-[9px] text-slate-500 mt-0.5">PDF, TXT, or MD up to 5MB</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".txt,.md,.pdf"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>

                    {/* Doc list */}
                    <div className="space-y-2 mt-1">
                      {uploadedDocs.map(doc => (
                        <div key={doc.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-3 text-[11px] hover:border-slate-700 transition">
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-200 truncate">{doc.name}</h5>
                            <span className="text-[8px] text-slate-500 font-mono font-semibold">
                              {(doc.size_bytes / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-500/10 transition"
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills Dashboard */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      Illuminated Developer Skills
                    </span>
                    <div className="space-y-2.5">
                      {[
                        { title: '🐍 Python Full Stack', skills: ['fastapi', 'sqlalchemy', 'async', 'rest'] },
                        { title: '🤖 AI Full Stack', skills: ['gemini', 'rag', 'langchain', 'llm'] },
                        { title: '📊 Data Analytics', skills: ['pandas', 'numpy', 'sklearn', 'regression'] }
                      ].map(track => (
                        <div key={track.title} className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                            {track.title}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {track.skills.map(s => {
                              const isActive = illuminatedSkills.includes(s);
                              return (
                                <span
                                  key={s}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all duration-300 ${
                                    isActive
                                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.25)]'
                                      : 'bg-slate-950 border-slate-800 text-slate-500'
                                  }`}
                                >
                                  {isActive ? '⚡ ' : ''}
                                  {s.toUpperCase()}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Curated Guides */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      High-Yield Prep Guides
                    </span>
                    <div className="space-y-2">
                      {prompts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => triggerQuickPrompt(p.prompt)}
                          className="p-3 bg-slate-950/40 border border-slate-800 hover:border-indigo-500/30 rounded-xl cursor-pointer flex items-center gap-3 transition"
                        >
                          <span className="text-lg shrink-0">{p.icon}</span>
                          <div className="min-w-0">
                            <h5 className="text-[11px] font-bold text-slate-200 truncate">{p.title}</h5>
                            <span className="text-[8px] text-slate-500 font-extrabold uppercase font-mono tracking-wider">
                              {p.category}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC VIEW: Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Header Title */}
              <div className="pb-2">
                <h2 className="font-outfit font-extrabold text-2xl md:text-3xl text-slate-100 tracking-tight">
                  Productivity & Habit Analytics
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Visualize historical study targets, categories completion rate, and learning stats.
                </p>
              </div>

              {/* Grid Widgets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 text-xl">
                    ⏳
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      Focus Hours Logged
                    </span>
                    <h4 className="font-outfit font-black text-2xl text-slate-200 mt-1">
                      {summary ? `${summary.total_focus_hours}h` : '0h'}
                    </h4>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 text-xl">
                    ✅
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      Study Blocks Finished
                    </span>
                    <h4 className="font-outfit font-black text-2xl text-slate-200 mt-1">
                      {summary ? summary.total_tasks_completed : '0'}
                    </h4>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 text-xl">
                    📈
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      Syllabus Completion
                    </span>
                    <h4 className="font-outfit font-black text-2xl text-slate-200 mt-1">
                      {summary ? `${summary.completion_rate}%` : '0%'}
                    </h4>
                  </div>
                </div>
              </div>

              {/* ML Recommendation Card */}
              <div className="glass-card p-6 rounded-2xl flex flex-col lg:flex-row items-center gap-6">
                <div className="flex flex-col items-center justify-center text-center p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shrink-0 w-full lg:w-48">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
                    ML Consistency Score
                  </span>
                  <h3 className="font-outfit font-black text-5xl text-slate-100 mt-2">
                    {prediction ? `${prediction.prediction_percentage}%` : '0%'}
                  </h3>
                  <span className="text-[8px] text-slate-500 font-semibold mt-1">LOGISTIC REGRESSION</span>
                </div>

                <div className="flex-1 w-full space-y-3">
                  <div>
                    <h4 className="font-outfit font-bold text-sm text-slate-200 flex items-center gap-2">
                      <span>🤖</span> Predictive Study Coaching & Recommendations
                    </h4>
                    <p className="text-[10px] text-slate-550">
                      Model parameters fitted on historical schedules and bootstrapped habit profiles.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {prediction && prediction.recommendations ? (
                      prediction.recommendations.map((rec, i) => (
                        <div key={i} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-2.5 text-[11px] leading-relaxed">
                          <span className="text-indigo-400">⭐</span>
                          <span className="text-slate-300 font-medium">{rec}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-slate-950/5 border border-slate-800/40 rounded-xl text-slate-500 text-xs">
                        No predictive recommendations available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Canvas Chart and Curriculum Mappings */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
                  <div>
                    <h3 className="font-outfit font-bold text-base text-slate-200">Syllabus Distribution Profile</h3>
                    <p className="text-[10px] text-slate-550 mt-0.5">
                      Visual mapping of total study focus allocated across technical tracks.
                    </p>
                  </div>

                  <div className="flex-1 flex items-center justify-center bg-slate-950/65 rounded-xl border border-slate-850 p-4 h-64">
                    <canvas ref={canvasRef} width="400" height="220" className="w-full h-full max-w-[400px] max-h-[220px]" />
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
                  <h3 className="font-outfit font-bold text-base text-slate-200">Study Track Status</h3>
                  <p className="text-[10px] text-slate-500 -mt-1.5">
                    Mastery and coverage metrics mapped across standard interview structures.
                  </p>

                  <div className="flex flex-col gap-3 mt-2">
                    {[
                      { icon: '🐍', title: 'Python Full Stack', label: 'Core Foundation' },
                      { icon: '🤖', title: 'AI Full Stack', label: 'AI Integration' },
                      { icon: '📊', title: 'Data Analytics', label: 'Data Science ML' },
                      { icon: '⚙️', title: 'DSA & System Design', label: 'Interview Warmup' }
                    ].map(track => (
                      <div key={track.title} className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-base">{track.icon}</span>
                          <span className="text-xs font-semibold text-slate-300">{track.title}</span>
                        </div>
                        <span className="text-[8px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded uppercase">
                          {track.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC VIEW: Health Hub Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {/* Header Title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="font-outfit font-extrabold text-2xl md:text-3xl text-slate-100 tracking-tight">
                    Developer Health Hub
                  </h2>
                  <p className="text-xs md:text-sm text-slate-400 mt-1">
                    Decompress sitting stress and track your daily hydration and sleep targets.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs text-emerald-300 font-semibold shadow-inner">
                  <span>💪</span>
                  <span>Stamina Booster</span>
                </div>
              </div>

              {/* 3-Column Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* Column 1: Water Logger */}
                <div className="glass-card p-6 rounded-2xl flex flex-col gap-5 items-center">
                  <h3 className="font-outfit font-bold text-base text-slate-200 w-full border-b border-slate-800 pb-3 text-left">
                    Daily Hydration
                  </h3>

                  {/* Hydration glass visual */}
                  <div className="relative w-28 h-40 border-4 border-slate-800 rounded-b-2xl rounded-t-sm bg-slate-950/40 overflow-hidden flex items-end justify-center shadow-lg shadow-blue-500/5 shrink-0">
                    <div
                      className="w-full water-glass-fill"
                      style={{
                        height: `${Math.min(
                          100,
                          health ? Math.round((health.water_actual_ml / health.water_target_ml) * 100) : 0
                        )}%`
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-slate-200 tracking-wider font-mono bg-slate-950/70 px-2 py-1 rounded">
                        {health ? Math.round((health.water_actual_ml / health.water_target_ml) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  <div className="text-center w-full space-y-1">
                    <h4 className="font-outfit font-black text-2xl text-slate-100">
                      {health ? `${health.water_actual_ml}ml` : '0ml'} / 2500ml
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold">Water levels logged today.</p>
                  </div>

                  {/* Log Water controls */}
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <button
                      onClick={() => handleLogWater(250)}
                      className="py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] font-bold text-indigo-400 rounded-xl transition"
                    >
                      🥛 +250ml
                    </button>
                    <button
                      onClick={() => handleLogWater(500)}
                      className="py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] font-bold text-indigo-400 rounded-xl transition"
                    >
                      🍼 +500ml
                    </button>
                  </div>
                </div>

                {/* Column 2: Sleep log */}
                <div className="glass-card p-6 rounded-2xl flex flex-col gap-5 items-center">
                  <h3 className="font-outfit font-bold text-base text-slate-200 w-full border-b border-slate-800 pb-3 text-left">
                    Sleep Tracker
                  </h3>

                  <div className="relative w-28 h-40 flex items-center justify-center shrink-0">
                    {/* SVG Progress Arc for sleep */}
                    <svg className="transform -rotate-90" width="120" height="120">
                      <circle className="text-slate-900" strokeWidth="8" stroke="currentColor" fill="transparent" r="48" cx="60" cy="60" />
                      <circle
                        className="text-purple-500"
                        strokeWidth="8"
                        strokeDasharray="301.6"
                        strokeDashoffset={
                          health
                            ? 301.6 - (Math.min(1, health.sleep_actual_hours / health.sleep_target_hours) * 301.6)
                            : 301.6
                        }
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="48"
                        cx="60"
                        cy="60"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 tracking-wider">SLEEP</span>
                      <span className="text-xs font-black text-slate-200 font-mono mt-0.5">
                        {health ? `${health.sleep_actual_hours}h` : '0h'}
                      </span>
                    </div>
                  </div>

                  <div className="text-center w-full space-y-1">
                    <h4 className="font-outfit font-black text-2xl text-slate-100">
                      {health ? `${health.sleep_actual_hours}h / ${health.sleep_target_hours}h` : '0h / 8h'}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold">Logged sleep duration.</p>
                  </div>

                  {/* Sleep inputs */}
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={sleepInput}
                      onChange={e => setSleepInput(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 outline-none"
                    />
                    <button
                      onClick={handleLogSleep}
                      className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white rounded-xl transition shrink-0"
                    >
                      Log Sleep
                    </button>
                  </div>
                </div>

                {/* Column 3: Sitting Stress Relief / stretches */}
                <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-outfit font-bold text-base text-slate-200">sitting Stress Relief</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Hourly desk decompress postures.</p>
                    </div>
                    <button
                      id="workout-complete-btn"
                      onClick={handleToggleWorkout}
                      className={`py-2 px-3 text-[10px] font-bold rounded-xl active:scale-95 transition-all shrink-0 ${
                        health?.is_workout_completed
                          ? 'bg-emerald-600 text-white border border-emerald-500 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-900 border border-slate-700 text-slate-300'
                      }`}
                    >
                      {health?.is_workout_completed ? 'Stretches Completed! 💪' : 'Mark Stretches Complete'}
                    </button>
                  </div>

                  {/* Postures checklist */}
                  <div className="flex flex-col gap-3 mt-1">
                    {healthLoading ? (
                      <span className="text-xs text-slate-500">Loading Desk Therapy...</span>
                    ) : parseStretches().length === 0 ? (
                      <span className="text-xs text-slate-550">Stretches schedule empty.</span>
                    ) : (
                      parseStretches().map((stretch, i) => {
                        const parts = stretch.split('|');
                        const titleDesc = parts[0] || '';
                        const regex = /(.*?)\((.*?)\)/;
                        const match = titleDesc.match(regex);
                        const title = match ? match[1].trim() : titleDesc;
                        const desc = match ? match[2].trim() : '';
                        const isComp = health?.is_workout_completed;

                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-between p-3.5 gap-4 border border-slate-800 rounded-xl transition-all duration-300 ${
                              isComp ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-950/20'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  isComp ? 'bg-emerald-500 border-emerald-500 text-white text-[9px] font-bold' : 'border-slate-700'
                                }`}
                              >
                                {isComp && '✔'}
                              </div>

                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-200 text-xs truncate">{title}</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5 truncate">{desc}</p>
                              </div>
                            </div>

                            <span className="text-[9px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                              {isComp ? '✔' : '⏳'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
