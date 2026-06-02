// Cohesive API endpoint base configuration
const API_BASE = 'http://localhost:8000';

// Application State Management
let currentSchedule = null;
let chatHistory = [];
let activeTab = 'scheduler';

// Dynamic Date Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Render current date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById("display-date");
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('en-US', dateOptions);
    }
    
    // Initialize circular progress charts from default slider values
    updateSliderMetric('python', 75);
    updateSliderMetric('ai', 60);
    updateSliderMetric('data', 45);
    
    // Core Initializer Routine
    fetchTodaySchedule();
    fetchPreloadedPrompts();
    fetchIndexedDocuments();
    setupDragAndDropUploader();
    
    // Default Tab View Initializer with deep-linking support
    const initialTab = window.location.hash.replace('#', '') || 'scheduler';
    if (['scheduler', 'coach', 'analytics', 'health'].includes(initialTab)) {
        switchTab(initialTab);
    } else {
        switchTab('scheduler');
    }
    
    // Listen for browser forward/back button history hash changes
    window.addEventListener("hashchange", () => {
        const currentHash = window.location.hash.replace('#', '');
        if (['scheduler', 'coach', 'analytics', 'health'].includes(currentHash) && currentHash !== activeTab) {
            switchTab(currentHash);
        }
    });
    
    // Setup textarea submit on Enter and Auto-grow
    const chatInput = document.getElementById("chat-user-message-input");
    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                document.getElementById("chat-input-form").dispatchEvent(new Event('submit'));
            }
        });
        
        chatInput.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = (this.scrollHeight) + "px";
        });
    }
    
    // Listen for browser fullscreen change events (e.g. exit with ESC key)
    document.addEventListener("fullscreenchange", () => {
        const btn = document.getElementById("fullscreen-btn");
        if (btn) {
            if (document.fullscreenElement) {
                btn.innerHTML = "<span>📴</span>";
                btn.title = "Exit Fullscreen";
            } else {
                btn.innerHTML = "<span>📺</span>";
                btn.title = "Toggle Fullscreen";
            }
        }
    });
});

// --- Tab Routing & Navigation System ---
function switchTab(tabId) {
    console.log(`[Navigation] switchTab called with tabId: "${tabId}"`);
    activeTab = tabId;
    
    // Sync active tab state to browser URL hash
    if (window.location.hash !== `#${tabId}`) {
        window.location.hash = tabId;
    }
    
    // Update dynamic header title
    const pageTitleEl = document.getElementById('header-page-title');
    if (pageTitleEl) {
        const tabNames = {
            'scheduler': 'Daily Routine Planner',
            'coach': 'AI Career Mentor',
            'analytics': 'Productivity & Habit Analytics',
            'health': 'Developer Health Hub'
        };
        pageTitleEl.innerText = tabNames[tabId] || 'Dashboard';
        console.log(`[Navigation] Updated pageTitleEl text to: "${pageTitleEl.innerText}"`);
    } else {
        console.warn(`[Navigation] Element "header-page-title" not found/visible (Scheduler tab is inactive).`);
    }
    
    // Update nav sidebar buttons visual status
    const buttons = {
        'scheduler': document.getElementById('nav-btn-scheduler'),
        'coach': document.getElementById('nav-btn-coach'),
        'analytics': document.getElementById('nav-btn-analytics'),
        'health': document.getElementById('nav-btn-health')
    };
    
    const views = {
        'scheduler': document.getElementById('section-scheduler'),
        'coach': document.getElementById('section-coach'),
        'analytics': document.getElementById('section-analytics'),
        'health': document.getElementById('section-health')
    };
    
    Object.keys(buttons).forEach(key => {
        if (buttons[key]) {
            if (key === tabId) {
                buttons[key].classList.add('active');
                console.log(`[Navigation] Sidebar button activated: "nav-btn-${key}"`);
            } else {
                buttons[key].classList.remove('active');
            }
        } else {
            console.warn(`[Navigation] Sidebar button "nav-btn-${key}" not found in DOM`);
        }
    });
    
    // Animate tab content views in/out
    Object.keys(views).forEach(key => {
        if (views[key]) {
            if (key === tabId) {
                views[key].classList.add('active');
                console.log(`[Navigation] Section container activated: "section-${key}" (DOM element exists)`);
            } else {
                views[key].classList.remove('active');
            }
        } else {
            console.error(`[Navigation] Error: Section container "section-${key}" not found in DOM!`);
        }
    });
    
    // Trigger Live Analytics data loading if transitioning to Analytics
    if (tabId === 'analytics') {
        console.log(`[Navigation] Fetching analytics metrics...`);
        fetchAnalyticsData();
    }
    
    // Trigger Live Health data loading if transitioning to Health Hub
    if (tabId === 'health') {
        console.log(`[Navigation] Fetching health metrics...`);
        fetchHealthData();
    }
}

// --- Scheduler API Client Layer ---

// Fetch Today's Daily Schedule from DB
async function fetchTodaySchedule() {
    const container = document.getElementById("routine-tasks-container");
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/scheduler/today`);
        if (response.status === 404) {
            // No routine found for today
            currentSchedule = null;
            renderEmptyState();
            updateProgressStats(0, 0);
            return;
        }
        
        if (!response.ok) throw new Error("Database query failed.");
        
        currentSchedule = await response.json();
        renderRoutineTasks(currentSchedule.tasks);
        calculateScheduleProgress(currentSchedule.tasks);
    } catch (err) {
        console.error("Scheduler fetch error:", err);
        container.innerHTML = `
            <div class="p-6 text-center text-rose-400 font-semibold border border-rose-500/10 bg-rose-500/5 rounded-xl">
                ⚠️ Fail: Could not fetch daily schedule from API. Ensure backend is running.
            </div>
        `;
    }
}

// Render the empty scheduler container template
function renderEmptyState() {
    const container = document.getElementById("routine-tasks-container");
    container.innerHTML = `
        <div class="glass-card p-10 rounded-2xl text-center flex flex-col items-center justify-center gap-4 border-dashed border-2 border-slate-800">
            <span class="text-4xl animate-bounce">⚡</span>
            <div>
                <h4 class="font-outfit font-bold text-slate-200 text-lg">Your study plan is empty today!</h4>
                <p class="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto">Use the left configuration panel to allocate your target study hours and dynamically compile a custom path.</p>
            </div>
        </div>
    `;
}

// Render dynamic study row items
function renderRoutineTasks(tasks) {
    const container = document.getElementById("routine-tasks-container");
    if (!tasks || tasks.length === 0) {
        renderEmptyState();
        return;
    }
    
    // Automatically light up track-specific foundation skills in the sidebar!
    tasks.forEach(task => {
        if (task.category === "Python Full Stack") {
            scanAndIlluminateSkills("fastapi async rest");
        } else if (task.category === "AI Full Stack") {
            scanAndIlluminateSkills("gemini llm");
        } else if (task.category === "Data Analytics") {
            scanAndIlluminateSkills("pandas numpy");
        }
    });
    
    // Sort tasks sequentially by start time
    const sortedTasks = [...tasks].sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    container.innerHTML = sortedTasks.map(task => {
        const isComp = task.is_completed;
        const compClass = isComp ? 'completed' : '';
        const badgeType = getCategoryBadge(task.category);
        
        return `
            <div class="task-row-card ${compClass} flex items-center justify-between p-4 gap-4" id="task-row-${task.id}">
                <div class="flex items-center gap-4 min-w-0">
                    <!-- Custom Checkbox button -->
                    <div class="task-checkbox shrink-0" onclick="toggleTaskStatus(${task.id}, ${!isComp})">
                        ${isComp ? '✔' : ''}
                    </div>
                    
                    <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="text-xs font-bold text-slate-400 font-mono">[${task.start_time} - ${task.end_time}]</span>
                            <span class="badge ${badgeType}">${task.category}</span>
                        </div>
                        <h4 class="font-outfit font-bold text-slate-100 text-sm md:text-base mt-1 truncate">${task.title}</h4>
                        <p class="text-xs text-slate-400 mt-0.5 truncate">${task.description || ''}</p>
                    </div>
                </div>
                
                <span class="text-xs font-extrabold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono shrink-0">${task.duration_minutes} MINS</span>
            </div>
        `;
    }).join("");
}

// Map categories to modern gradient badges
function getCategoryBadge(cat) {
    switch (cat) {
        case "Python Full Stack": return "badge-python";
        case "AI Full Stack": return "badge-ai";
        case "Data Analytics": return "badge-data";
        default: return "badge-prod";
    }
}

// Allocate and compile a new daily routine using FastAPI REST post
async function handleGenerateRoutine(event) {
    event.preventDefault();
    
    const hours = parseInt(document.getElementById("focus-hours-input").value);
    const checkedBoxes = document.querySelectorAll("input[name='focus-areas']:checked");
    const categories = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (categories.length === 0) {
        alert("Please select at least one syllabus track to generate a schedule!");
        return;
    }
    
    const submitBtn = document.getElementById("generate-btn");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `⏳ Compiling curriculum...`;
    submitBtn.disabled = true;
    
    try {
        const payload = {
            date: new Date().toISOString().split('T')[0], // Standard YYYY-MM-DD
            total_focus_hours: hours,
            focus_areas: categories
        };
        
        const response = await fetch(`${API_BASE}/api/v1/scheduler/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("Failed to compile routine.");
        
        currentSchedule = await response.json();
        renderRoutineTasks(currentSchedule.tasks);
        calculateScheduleProgress(currentSchedule.tasks);
        
        // Dynamic notification toast simulation
        alert("Success! Your personalized routine has been compiled and committed to database.");
    } catch (err) {
        console.error(err);
        alert("An error occurred during schedule generation. Ensure your backend is running.");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Toggle study tasks status via REST PATCH request
async function toggleTaskStatus(taskId, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/scheduler/tasks/${taskId}/complete?is_completed=${newStatus}`, {
            method: "PATCH"
        });
        
        if (!response.ok) throw new Error("Toggle status failed");
        
        const updatedTask = await response.json();
        
        // Find task inside our memory array and update
        if (currentSchedule && currentSchedule.tasks) {
            const taskIndex = currentSchedule.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                currentSchedule.tasks[taskIndex] = updatedTask;
                
                // Rerender study log rows
                renderRoutineTasks(currentSchedule.tasks);
                calculateScheduleProgress(currentSchedule.tasks);
            }
        }
    } catch (err) {
        console.error(err);
        alert("Could not update task completion status. Check connection.");
    }
}

// Calculate total percent completed and update stats views
function calculateScheduleProgress(tasks) {
    if (!tasks || tasks.length === 0) {
        updateProgressStats(0, 0);
        return;
    }
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.is_completed).length;
    const percentage = Math.round((completed / total) * 100);
    
    updateProgressStats(percentage, completed);
}

// Perform CSS animations for progress fillers
function updateProgressStats(percent, completedCount) {
    const fill = document.getElementById("routine-progress-fill");
    const text = document.getElementById("routine-progress-text");
    
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.innerText = `${percent}%`;
    
    // Update local statistics counters on Analytics Panel
    const totalHours = currentSchedule ? currentSchedule.total_focus_hours : 0;
    
    const countHours = document.getElementById("stat-total-hours");
    const countTasks = document.getElementById("stat-total-tasks");
    const countPercent = document.getElementById("stat-completion-rate");
    
    if (countHours) countHours.innerText = `${totalHours}h`;
    if (countTasks) countTasks.innerText = `${completedCount}`;
    if (countPercent) countPercent.innerText = `${percent}%`;
}


// --- AI Career Coach API Client Layer ---

// Retrieve pre-loaded guides chips from backend API
async function fetchPreloadedPrompts() {
    const container = document.getElementById("preloaded-prompts-container");
    try {
        const response = await fetch(`${API_BASE}/api/v1/career_coach/preloaded-prompts`);
        if (!response.ok) throw new Error("Could not load prompts list.");
        
        const prompts = await response.json();
        container.innerHTML = prompts.map(p => `
            <div class="prompt-chip p-3 bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/40 rounded-xl cursor-pointer flex items-center gap-3 transition" onclick="triggerQuickPrompt('${escapeHtml(p.prompt)}')">
                <span class="text-xl shrink-0">${p.icon}</span>
                <div class="min-w-0">
                    <h5 class="text-xs font-bold text-slate-200 truncate">${p.title}</h5>
                    <p class="text-[10px] text-slate-500 font-semibold uppercase mt-0.5 tracking-wider font-mono">${p.category}</p>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Prompts load failed:", err);
        container.innerHTML = `<span class="text-xs text-slate-500">Failed loading quick prep guides.</span>`;
    }
}

// User clicked a quick chip - load text and automatically submit message
function triggerQuickPrompt(text) {
    document.getElementById("chat-user-message-input").value = text;
    document.getElementById("chat-input-form").dispatchEvent(new Event('submit'));
}

// Handle chat submissions with real-time SSE streaming
async function handleSendChatMessage(event) {
    event.preventDefault();
    
    const input = document.getElementById("chat-user-message-input");
    const message = input.value.trim();
    if (!message) return;
    
    // Clear input instantly
    input.value = "";
    input.style.height = "auto";
    
    // 1. Render User Message inside DOM bubble
    renderChatMessage(message, 'user');
    
    // Scan keywords from user message immediately
    scanAndIlluminateSkills(message);
    
    // 2. Append to chat history
    chatHistory.push({ role: 'user', message: message });
    
    // 3. Inject glowing typing loader (we will replace it dynamically with the incoming stream)
    const loaderId = injectTypingIndicator();
    
    try {
        const payload = {
            message: message,
            history: chatHistory.slice(0, -1) // Send all history except the latest message as it is provided separately
        };
        
        const response = await fetch(`${API_BASE}/api/v1/career_coach/chat/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("AI query streaming request failed.");
        
        // Remove typing indicator as we start receiving content
        removeTypingIndicator(loaderId);
        
        // Create the empty AI response bubble
        const aiBubbleId = createEmptyAiBubble();
        const bubbleContentDiv = document.querySelector(`#${aiBubbleId} .bubble-content`);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let aiResponseText = "";
        let buffer = "";
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // SSE stream might contain multiple lines of "data: ...\n\n"
            const lines = buffer.split("\n\n");
            
            // Keep the last incomplete block in the buffer
            buffer = lines.pop();
            
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const textSegment = line.slice(6);
                    aiResponseText += textSegment;
                    
                    // Render current accumulated text through markdown parser in real-time
                    bubbleContentDiv.innerHTML = parseMarkdown(aiResponseText);
                    scrollChatToBottom();
                }
            }
        }
        
        // Process any leftover content in the buffer
        if (buffer && buffer.startsWith("data: ")) {
            const textSegment = buffer.slice(6);
            aiResponseText += textSegment;
            bubbleContentDiv.innerHTML = parseMarkdown(aiResponseText);
            scrollChatToBottom();
        }
        
        // Scan keywords from model response when completely stream finished
        scanAndIlluminateSkills(aiResponseText);
        
        // 5. Append AI Coach to history
        chatHistory.push({ role: 'model', message: aiResponseText });
        
    } catch (err) {
        console.error(err);
        removeTypingIndicator(loaderId);
        renderChatMessage("⚠️ **Lead Developer Alert**: I encountered a network pipeline error. Please verify that your backend service is running locally on port 8000.", 'model');
    }
}

// Creates a new empty message bubble for the AI streaming response
function createEmptyAiBubble() {
    const log = document.getElementById("chat-messages-log");
    const bubble = document.createElement("div");
    const id = `ai-bubble-${Date.now()}`;
    
    bubble.id = id;
    bubble.className = `chat-bubble received flex gap-4 max-w-[85%] self-start`;
    
    bubble.innerHTML = `
        <div class="bubble-avatar w-8 h-8 rounded-lg border bg-purple-500/10 border-purple-500/30 text-purple-400 flex items-center justify-center text-sm shrink-0">🤖</div>
        <div class="bubble-content bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-sm leading-relaxed max-w-full overflow-hidden">
            <span class="typing-dot"></span>
        </div>
    `;
    
    log.appendChild(bubble);
    scrollChatToBottom();
    return id;
}

// Scans text for technology keywords and illuminates the sidebar skills
function scanAndIlluminateSkills(text) {
    if (!text) return;
    const textLower = text.toLowerCase();
    
    const skillPills = document.querySelectorAll(".skill-pill");
    skillPills.forEach(pill => {
        const keyword = pill.getAttribute("data-keyword");
        if (keyword && textLower.includes(keyword)) {
            pill.classList.add("active");
            
            // Add visual cue (glowing lightning bolt emoji)
            if (!pill.innerHTML.includes("⚡")) {
                pill.innerHTML = `⚡ ${pill.innerText}`;
            }
        }
    });
}

// Generates a neat Markdown transcript and initiates download
function handleDownloadTranscript() {
    if (chatHistory.length === 0) {
        alert("The conversation log is currently empty! Ask your AI Career Coach a question to start a transcript.");
        return;
    }
    
    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let markdownContent = `# AI Career Coach & Mentorship Workspace Transcript\n`;
    markdownContent += `*Date: ${todayStr}*\n\n`;
    markdownContent += `This document captures your high-yield developer mentoring session, including technical system design, full-stack upskilling, and code optimizations.\n\n`;
    markdownContent += `---\n\n`;
    
    chatHistory.forEach((chat, index) => {
        const role = chat.role === 'user' ? '👤 SOFTWARE ENGINEER (YOU)' : '🤖 CAREER COACH & LEAD DEV AI';
        markdownContent += `### ${role}\n\n`;
        markdownContent += `${chat.message}\n\n`;
        markdownContent += `---\n\n`;
    });
    
    markdownContent += `\n*Automated Mentorship log exported successfully from Personalized AI Life & Career Coach Workspace.*\n`;
    
    // Trigger direct client download
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `AI_Coach_Transcript_${new Date().toISOString().split('T')[0]}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Render dynamic chat bubble row
function renderChatMessage(text, role) {
    const log = document.getElementById("chat-messages-log");
    const bubble = document.createElement("div");
    
    const isUser = role === 'user';
    bubble.className = `chat-bubble ${isUser ? 'sent' : 'received'} flex gap-4 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`;
    
    const avatar = isUser ? '👤' : '🤖';
    const avatarClass = isUser ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400';
    const contentClass = isUser ? 'bg-slate-800 border-slate-700 rounded-2xl rounded-tr-none' : 'bg-slate-900/80 border-slate-800 rounded-2xl rounded-tl-none';
    
    // Convert basic Markdown to rich HTML output
    const formattedHtml = isUser ? escapeHtml(text) : parseMarkdown(text);
    
    bubble.innerHTML = `
        <div class="bubble-avatar w-8 h-8 rounded-lg border ${avatarClass} flex items-center justify-center text-sm shrink-0">${avatar}</div>
        <div class="bubble-content ${contentClass} p-4 text-sm leading-relaxed max-w-full overflow-hidden">
            ${formattedHtml}
        </div>
    `;
    
    log.appendChild(bubble);
    scrollChatToBottom();
}

// Inject loading status typing bubble
function injectTypingIndicator() {
    const log = document.getElementById("chat-messages-log");
    const loaderId = `indicator-${Date.now()}`;
    const indicator = document.createElement("div");
    
    indicator.id = loaderId;
    indicator.className = `chat-bubble received flex gap-4 max-w-[85%] self-start`;
    indicator.innerHTML = `
        <div class="bubble-avatar w-8 h-8 rounded-lg border bg-purple-500/10 border-purple-500/30 text-purple-400 flex items-center justify-center text-sm shrink-0">🤖</div>
        <div class="bubble-content bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-none p-4 flex items-center gap-1.5 h-10 shrink-0">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    
    log.appendChild(indicator);
    scrollChatToBottom();
    return loaderId;
}

// Remove loading status indicator
function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.remove();
    }
}

function scrollChatToBottom() {
    const log = document.getElementById("chat-messages-log");
    log.scrollTop = log.scrollHeight;
}


// --- Modular Markdown Parsing Engine ---
function parseMarkdown(text) {
    let html = text;
    
    // Escaping generic HTML nodes first to secure output
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // 1. Triple backtick Code Blocks conversion with pre formatting
    html = html.replace(/```(?:python|javascript|js|html|css)?\n([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });
    
    // 2. Single backtick inline code conversion
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 3. Headers formats (###, ####)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    
    // 4. Double asterisks bold format
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // 5. Unordered List Items conversions (starting with - or *)
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    
    // Wraps raw <li> items in <ul> tags
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    // Remove duplicate consecutive <ul><ul> boundaries
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    
    // 6. Split text lines into paragraphs unless enclosed in blocks
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        
        // Skip tags
        if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('</pre') || trimmed.startsWith('<code') || trimmed.startsWith('<ul') || trimmed.startsWith('</ul') || trimmed.startsWith('<li') || trimmed.startsWith('</li')) {
            return line;
        }
        return `<p>${line}</p>`;
    });
    
    return processedLines.join('\n');
}

// Simple text escape protection
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// --- HTML5 Canvas Interactive Charting System & ML Analytics ---

// Fetch summary metrics and ML predictions from FastAPI endpoints
async function fetchAnalyticsData() {
    const totalHoursEl = document.getElementById("stat-total-hours");
    const totalTasksEl = document.getElementById("stat-total-tasks");
    const completionRateEl = document.getElementById("stat-completion-rate");
    
    const mlScoreEl = document.getElementById("ml-prediction-score");
    const mlRecsEl = document.getElementById("ml-recommendations-list");
    
    // Inject dynamic loading shimmer initially
    if (mlRecsEl) {
        mlRecsEl.innerHTML = `
            <div class="animate-pulse bg-slate-950/40 rounded-lg p-2.5 h-10 border border-slate-800/80"></div>
        `;
    }
    
    try {
        // A. Query database statistics summary
        const summaryRes = await fetch(`${API_BASE}/api/v1/analytics/summary`);
        if (!summaryRes.ok) throw new Error("Could not load stats summary.");
        const summary = await summaryRes.json();
        
        // Update dashboard widgets
        if (totalHoursEl) totalHoursEl.innerText = `${summary.total_focus_hours}h`;
        if (totalTasksEl) totalTasksEl.innerText = `${summary.total_tasks_completed}`;
        if (completionRateEl) completionRateEl.innerText = `${summary.completion_rate}%`;
        
        // B. Query Scikit-Learn predictions and advice
        const predictRes = await fetch(`${API_BASE}/api/v1/analytics/predict`);
        if (!predictRes.ok) throw new Error("Could not load model prediction.");
        const prediction = await predictRes.json();
        
        // Update predictive widgets
        if (mlScoreEl) mlScoreEl.innerText = `${prediction.prediction_percentage}%`;
        
        if (mlRecsEl && prediction.recommendations) {
            mlRecsEl.innerHTML = prediction.recommendations.map(rec => `
                <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3">
                    <span class="text-indigo-400 mt-0.5">⭐</span>
                    <p class="text-xs text-slate-300 leading-relaxed font-medium">${rec}</p>
                </div>
            `).join("");
        }
        
        // C. Render canvas segmentation donut chart
        drawCanvasChart(summary.category_distribution);
        
        // Remove fallback banner if it exists
        const existingBanner = document.getElementById("analytics-fallback-banner");
        if (existingBanner) existingBanner.remove();
        
    } catch (err) {
        console.error("Analytics loading pipeline failed:", err);
        
        // Display visible fallback message banner
        const section = document.getElementById("section-analytics");
        const existingBanner = document.getElementById("analytics-fallback-banner");
        if (existingBanner) existingBanner.remove();
        
        const alertBanner = document.createElement("div");
        alertBanner.id = "analytics-fallback-banner";
        alertBanner.className = "mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-3";
        alertBanner.innerHTML = "<span>⚠️</span> <div><strong>Analytics Loading Error:</strong> Failed to fetch live analytics from the backend. Displaying offline fallback indicators.</div>";
        if (section) {
            section.insertBefore(alertBanner, section.children[1]);
        }
        
        if (mlRecsEl) {
            mlRecsEl.innerHTML = `
                <div class="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-rose-400 text-xs font-semibold">
                    ⚠️ Analytics Error: Failed to contact the backend ML service. Ensure server is online.
                </div>
            `;
        }
    }
}

// Render dynamic vector donut chart based on database category counts
function drawCanvasChart(distribution) {
    const canvas = document.getElementById("analytics-canvas-chart");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear drawing context
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fallback data if DB has zero accumulated topics
    const categoriesCounts = distribution || {
        "Python Full Stack": 3,
        "AI Full Stack": 2,
        "Data Analytics": 1,
        "Productivity": 2
    };
    
    const totalUnits = Object.values(categoriesCounts).reduce((a, b) => a + b, 0);
    if (totalUnits === 0) {
        // Prevent division by zero, draw clear empty text
        ctx.font = "600 11px 'Inter', sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.fillText("No tasks recorded yet", canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Color matching mappings
    const themeColors = {
        "Python Full Stack": "#6366f1",
        "AI Full Stack": "#a855f7",
        "Data Analytics": "#10b981",
        "Productivity": "#ec4899"
    };
    
    const centerX = canvas.width / 2 - 60;
    const centerY = canvas.height / 2;
    const radius = 68;
    const innerRadius = 46;
    
    let startAngle = -Math.PI / 2;
    
    // A. Render segment arcs
    Object.keys(categoriesCounts).forEach(cat => {
        const count = categoriesCounts[cat];
        if (count === 0) return;
        
        const proportion = count / totalUnits;
        const endAngle = startAngle + (proportion * 2 * Math.PI);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        
        ctx.fillStyle = themeColors[cat] || "#6366f1";
        ctx.fill();
        
        startAngle = endAngle;
    });
    
    // B. Render central stats text
    ctx.font = "bold 16px 'Outfit', sans-serif";
    ctx.fillStyle = "#f1f5f9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${totalUnits}`, centerX, centerY - 6);
    
    ctx.font = "600 9px 'Inter', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("TASKS", centerX, centerY + 10);
    
    // C. Render sidebar color legend boxes
    const legendX = canvas.width - 130;
    let legendY = 32;
    
    Object.keys(categoriesCounts).forEach(cat => {
        const count = categoriesCounts[cat];
        
        ctx.beginPath();
        ctx.arc(legendX, legendY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = themeColors[cat] || "#6366f1";
        ctx.fill();
        
        ctx.font = "600 10px 'Inter', sans-serif";
        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(cat, legendX + 14, legendY);
        
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "right";
        ctx.fillText(`(${count})`, canvas.width - 10, legendY);
        
        legendY += 28;
    });
}

// --- Developer Health Hub API Client Layer ---

let currentHealth = null;

// Fetch or create today's physical activity metrics from FastAPI
async function fetchHealthData() {
    try {
        const response = await fetch(`${API_BASE}/api/v1/trainer/today`);
        if (!response.ok) throw new Error("Could not fetch daily fitness logs.");
        
        currentHealth = await response.json();
        renderHealthUI(currentHealth);
        
        // Remove health fallback banner if it exists
        const existingBanner = document.getElementById("health-fallback-banner");
        if (existingBanner) existingBanner.remove();
    } catch (err) {
        console.error("Health fetch error:", err);
        
        // Display visible fallback message banner
        const section = document.getElementById("section-health");
        const existingBanner = document.getElementById("health-fallback-banner");
        if (existingBanner) existingBanner.remove();
        
        const alertBanner = document.createElement("div");
        alertBanner.id = "health-fallback-banner";
        alertBanner.className = "mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-3";
        alertBanner.innerHTML = "<span>⚠️</span> <div><strong>Health Hub Loading Error:</strong> Failed to fetch live physical logs from the backend. Displaying offline fallback indicators.</div>";
        if (section) {
            section.insertBefore(alertBanner, section.children[1]);
        }
    }
}

// Render dynamic water cup, sleep statistics, and Desk Therapy stretches checklist
function renderHealthUI(health) {
    if (!health) return;
    
    // A. Update Water Glass Progression Fill
    const pct = Math.round((health.water_actual_ml / health.water_target_ml) * 100);
    const glassFill = document.getElementById("water-glass-fill");
    const glassText = document.getElementById("water-glass-text");
    const progressCount = document.getElementById("water-progress-count");
    
    if (glassFill) glassFill.style.height = `${Math.min(100, pct)}%`;
    if (glassText) glassText.innerText = `${pct}%`;
    if (progressCount) progressCount.innerText = `${health.water_actual_ml}ml / ${health.water_target_ml}ml`;
    
    // B. Update Sleep Duration Progress Text
    const sleepProgressText = document.getElementById("sleep-progress-text");
    const sleepInput = document.getElementById("sleep-hours-input");
    
    if (sleepProgressText) sleepProgressText.innerText = `${health.sleep_actual_hours}h / ${health.sleep_target_hours}h`;
    if (sleepInput && health.sleep_actual_hours > 0) sleepInput.value = health.sleep_actual_hours;
    
    // C. Update Workout Stretches Button visual state
    const workoutBtn = document.getElementById("workout-complete-btn");
    if (workoutBtn) {
        if (health.is_workout_completed) {
            workoutBtn.innerText = "Stretches Completed! 💪";
            workoutBtn.className = "py-2 px-4 bg-emerald-600 text-white border border-emerald-500 rounded-xl text-xs font-bold active:scale-95 transition-all shrink-0 shadow-md shadow-emerald-500/10";
        } else {
            workoutBtn.innerText = "Mark Stretches Complete";
            workoutBtn.className = "py-2 px-4 bg-slate-850 hover:bg-emerald-600 hover:text-white border border-slate-700 text-slate-300 rounded-xl text-xs font-bold active:scale-95 transition-all shrink-0";
        }
    }
    
    // D. Render individual Desk Therapy Stretches checklists
    const stretchesContainer = document.getElementById("stretches-list-container");
    if (stretchesContainer && health.workout_notes) {
        // Parse the list representation: "Neck tilts (desc)|[PEND]; Shoulder rolls (desc)|[PEND]"
        const stretches = health.workout_notes.split("; ").filter(s => s.trim());
        
        stretchesContainer.innerHTML = stretches.map((stretch, index) => {
            const parts = stretch.split("|");
            if (parts.length < 2) return "";
            
            const titleDesc = parts[0];
            const isCompleted = health.is_workout_completed; // Sync individual rows with overall status for simplicity
            const statusIcon = isCompleted ? "✔" : "⏳";
            const rowClass = isCompleted ? "completed" : "";
            
            // Separate title and description if mapped by parenthesis
            const regex = /(.*?)\((.*?)\)/;
            const match = titleDesc.match(regex);
            const title = match ? match[1].trim() : titleDesc;
            const desc = match ? match[2].trim() : "";
            
            return `
                <div class="task-row-card ${rowClass} flex items-center justify-between p-3.5 gap-4">
                    <div class="flex items-center gap-3.5 min-w-0">
                        <div class="task-checkbox shrink-0">
                            ${isCompleted ? '✔' : ''}
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-outfit font-bold text-slate-200 text-xs md:text-sm truncate">${title}</h4>
                            <p class="text-[10px] md:text-xs text-slate-500 leading-relaxed mt-0.5 truncate">${desc}</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0 uppercase tracking-widest">${statusIcon}</span>
                </div>
            `;
        }).join("");
    }
}

// Log water consumption increment
async function handleLogWater(ml) {
    try {
        const response = await fetch(`${API_BASE}/api/v1/trainer/water?ml=${ml}`, {
            method: "PATCH"
        });
        if (!response.ok) throw new Error("Failed to log fluid increment.");
        
        currentHealth = await response.json();
        renderHealthUI(currentHealth);
    } catch (err) {
        console.error(err);
        alert("Hydration logs save failed. Check connection.");
    }
}

// Log Sleep duration
async function handleLogSleep() {
    const sleepInput = document.getElementById("sleep-hours-input");
    const hours = parseInt(sleepInput.value);
    
    if (isNaN(hours) || hours < 0 || hours > 24) {
        alert("Please enter a valid sleep duration between 0 and 24 hours.");
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/trainer/sleep?hours=${hours}`, {
            method: "PATCH"
        });
        if (!response.ok) throw new Error("Failed to log sleep duration.");
        
        currentHealth = await response.json();
        renderHealthUI(currentHealth);
        alert("Success! Your sleep duration has been recorded.");
    } catch (err) {
        console.error(err);
        alert("Sleep logs save failed. Check connection.");
    }
}

// Toggle workout completion
async function handleToggleWorkout() {
    if (!currentHealth) return;
    
    const newStatus = !currentHealth.is_workout_completed;
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/trainer/workout?is_completed=${newStatus}`, {
            method: "PATCH"
        });
        if (!response.ok) throw new Error("Failed to toggle workout state.");
        
        currentHealth = await response.json();
        renderHealthUI(currentHealth);
    } catch (err) {
        console.error(err);
        alert("Desk Therapy log update failed. Check connection.");
    }
}

// --- Drag and Drop RAG Uploader Implementation ---
function setupDragAndDropUploader() {
    const dropZone = document.getElementById("drop-zone");
    const uploader = document.getElementById("file-uploader");
    
    if (!dropZone || !uploader) return;
    
    // Clicking drop-zone triggers click on hidden file input
    dropZone.addEventListener("click", () => uploader.click());
    
    uploader.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleUploadFile(e.target.files[0]);
        }
    });
    
    // Dragover & dragleave styling highlights
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });
    
    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });
    
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            handleUploadFile(e.dataTransfer.files[0]);
        }
    });
}

// Upload file to FastAPI POST endpoint
async function handleUploadFile(file) {
    const allowed = ["txt", "md", "pdf"];
    const ext = file.name.split(".").pop().toLowerCase();
    
    if (!allowed.includes(ext)) {
        alert("Invalid file format. Please upload a PDF, TXT, or MD document.");
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Maximum supported file size is 5MB.");
        return;
    }
    
    const dropZone = document.getElementById("drop-zone");
    const originalContent = dropZone.innerHTML;
    
    // Set uploader spinner
    dropZone.innerHTML = `
        <span class="loading-spinner text-xl animate-spin mb-1">⏳</span>
        <h5 class="text-xs font-bold text-slate-300">Parsing and Indexing...</h5>
        <p class="text-[9px] text-indigo-400 mt-0.5 font-semibold">TF-IDF Vector Model Building</p>
    `;
    dropZone.style.pointerEvents = "none";
    
    try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch(`${API_BASE}/api/v1/career_coach/upload`, {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            const errDetail = await response.json();
            throw new Error(errDetail.detail || "Upload indexing failed.");
        }
        
        // Refresh active document inventory listing
        await fetchIndexedDocuments();
        alert(`Success! '${file.name}' has been successfully indexed and loaded as active AI grounding context.`);
    } catch (err) {
        console.error("File upload index failed:", err);
        alert(`Failed to parse and index document: ${err.message}`);
    } finally {
        dropZone.innerHTML = originalContent;
        dropZone.style.pointerEvents = "auto";
    }
}

// Retrieve document inventory lists from database
async function fetchIndexedDocuments() {
    const list = document.getElementById("uploaded-files-list");
    if (!list) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/career_coach/documents`);
        if (!response.ok) throw new Error("Retrieving active files failed.");
        
        const docs = await response.json();
        renderUploadedDocuments(docs);
    } catch (err) {
        console.error(err);
        list.innerHTML = `<span class="text-[10px] text-rose-400 font-semibold italic text-center">Failed listing files.</span>`;
    }
}

// Render active doc inventory cards in the sidebar
function renderUploadedDocuments(docs) {
    const list = document.getElementById("uploaded-files-list");
    if (!list) return;
    
    if (!docs || docs.length === 0) {
        list.innerHTML = `
            <div class="p-4 bg-slate-950/20 border border-slate-900 rounded-xl text-center">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">No active grounding files</p>
                <p class="text-[9px] text-slate-600 mt-0.5 leading-relaxed">Ground the AI coach by uploading a technical PDF or text resume.</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = docs.map(doc => `
        <div class="doc-card flex items-center justify-between gap-3" id="doc-card-${doc.id}">
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-base shrink-0">📄</span>
                <div class="min-w-0">
                    <h5 class="text-[11px] font-bold text-slate-200 truncate" title="${escapeHtml(doc.filename)}">${escapeHtml(doc.filename)}</h5>
                    <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">${escapeHtml(doc.file_type)}</p>
                </div>
            </div>
            <button class="doc-delete-btn shrink-0" onclick="handleDeleteDocument(${doc.id})" title="Delete index">
                🗑️
            </button>
        </div>
    `).join("");
}

// Delete document index
async function handleDeleteDocument(docId) {
    if (!confirm("Are you sure you want to delete this document? The RAG vector search index will be cleared.")) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/v1/career_coach/documents/${docId}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Delete request failed.");
        
        await fetchIndexedDocuments();
        alert("Index cleared successfully. Document context deleted from database.");
    } catch (err) {
        console.error(err);
        alert("Could not remove document index. Check server status.");
    }
}

// Global function to sync range sliders and circular SVG rings
function updateSliderMetric(track, value) {
    // 1. Update text label
    const labelId = `slider-val-${track}`;
    const labelEl = document.getElementById(labelId);
    if (labelEl) {
        labelEl.innerText = `${value}%`;
    }
    
    // 2. Synchronize circular progress SVGs
    // Circumference of our SVG circles is 2 * PI * r = 2 * Math.PI * 28 = 175.929
    const circumference = 175.929;
    
    if (track === 'python') {
        const circleEl = document.getElementById('circle-weekly');
        if (circleEl) {
            const offset = circumference - (value / 100) * circumference;
            circleEl.style.strokeDashoffset = offset;
        }
    } else if (track === 'ai') {
        const circleEl = document.getElementById('circle-skill');
        if (circleEl) {
            const offset = circumference - (value / 100) * circumference;
            circleEl.style.strokeDashoffset = offset;
        }
    } else if (track === 'data') {
        const circleEl = document.getElementById('circle-streak');
        if (circleEl) {
            const offset = circumference - (value / 100) * circumference;
            circleEl.style.strokeDashoffset = offset;
        }
    }
}

// Toggle Fullscreen Mode via Browser API
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => {
                console.error(`Error exiting fullscreen mode: ${err.message}`);
            });
        }
    }
}


