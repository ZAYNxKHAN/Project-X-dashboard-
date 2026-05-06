// ===== CONFIG =====
const STORAGE_KEY = 'zsys_userData';
const RESTORE_KEY = 'zsys_restores';
const HISTORY_KEY = 'zsys_history';

const PRAYER_TIMES = {
    Fajr:    { start: 4, end: 6,   label: '4:30-6:00' },
    Dhuhr:   { start: 12, end: 15,  label: '12-3 PM' },
    Asr:     { start: 15.5, end: 18, label: '3:30-6 PM' },
    Maghrib: { start: 18, end: 20,  label: '6-8 PM' },
    Isha:    { start: 20, end: 23.99, label: '8-12 AM' }
};

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const TIER_CONFIG = {
    easy: {
        name: 'EASY', emoji: '🔰', label: 'ROOKIE',
        prayers: [
            { name: 'Fajr Prayer', pts: 8 }, { name: 'Dhuhr Prayer', pts: 8 },
            { name: 'Asr Prayer', pts: 8 }, { name: 'Maghrib Prayer', pts: 8 },
            { name: 'Isha Prayer', pts: 8 }
        ],
        tasks: [
            { name: 'Focus Work (1 hr)', pts: 20, locked: true },
            { name: 'Sleep on Time', pts: 20, locked: true },
            { name: 'No Bad Habits', pts: 20, locked: true }
        ],
        customSlots: 0
    },
    medium: {
        name: 'MEDIUM', emoji: '⚔️', label: 'WARRIOR',
        prayers: [
            { name: 'Fajr Prayer', pts: 7 }, { name: 'Dhuhr Prayer', pts: 7 },
            { name: 'Asr Prayer', pts: 7 }, { name: 'Maghrib Prayer', pts: 7 },
            { name: 'Isha Prayer', pts: 7 }
        ],
        tasks: [
            { name: 'Focus Work (2 hrs)', pts: 12, locked: true },
            { name: 'Sleep on Time', pts: 8, locked: true },
            { name: 'No Fap/Smoke', pts: 10, locked: true },
            { name: 'Exercise (30 min)', pts: 8, locked: true },
            { name: 'No Social Media', pts: 8, locked: true }
        ],
        customSlots: 2
    },
    hard: {
        name: 'HARD', emoji: '🗿', label: 'SIGMA',
        prayers: [
            { name: 'Fajr Prayer', pts: 5 }, { name: 'Dhuhr Prayer', pts: 5 },
            { name: 'Asr Prayer', pts: 5 }, { name: 'Maghrib Prayer', pts: 5 },
            { name: 'Isha Prayer', pts: 5 }
        ],
        tasks: [
            { name: 'Study 3 hrs', pts: 8, locked: true },
            { name: 'Past Paper Solved', pts: 8, locked: true },
            { name: 'Sleep on Time', pts: 6, locked: true },
            { name: 'No Fap/Smoke', pts: 8, locked: true },
            { name: 'Exercise (45 min)', pts: 6, locked: true },
            { name: 'No Social Media', pts: 6, locked: true },
            { name: 'Current Affairs', pts: 6, locked: true },
            { name: 'Revision (30 min)', pts: 6, locked: true }
        ],
        customSlots: 4
    }
};

// ===== STATE =====
let userData = null;

function getDefaultData(name, gender, tier) {
    const cfg = TIER_CONFIG[tier];
    const today = getTodayKey();
    return {
        name, gender, tier,
        startDate: today,
        totalDays: 30,
        streak: { current: 1, best: 1 },
        today: {
            dateKey: today,
            checked: [],
            prayers: {},
            score: 0
        },
        customTasks: Array(cfg.customSlots).fill(null).map((_, i) => ({
            name: `Custom Task ${i+1}`,
            pts: tier === 'hard' ? 5 : tier === 'medium' ? (i === 0 ? 7 : 6) : 0,
            locked: false
        })),
        history: {},
        lastResetMonth: new Date().getMonth()
    };
}

// ===== TIME =====
function getKarachiTime() {
    const now = new Date();
    const offset = 5 * 60;
    const local = now.getTimezoneOffset();
    return new Date(now.getTime() + (offset + local) * 60000);
}

function getTodayKey() {
    const t = getKarachiTime();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}

function getCurrentHour() {
    const t = getKarachiTime();
    return t.getHours() + t.getMinutes() / 60;
}

function getDayNumber() {
    const start = new Date(userData.startDate);
    const today = getKarachiTime();
    const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(diff, userData.totalDays));
}

// ===== STORAGE =====
function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        userData = raw ? JSON.parse(raw) : null;
    } catch(e) {
        userData = null;
    }
    
    if (!userData) {
        // Show onboarding
        showOnboarding();
        return false;
    }
    
    // Check day reset
    const today = getTodayKey();
    if (userData.today.dateKey !== today) {
        archiveToday();
        userData.today.dateKey = today;
        userData.today.checked = [];
        userData.today.prayers = {};
        userData.today.score = 0;
        userData.streak.current = getDayNumber();
        
        // Reset monthly restores
        const currentMonth = new Date().getMonth();
        if (userData.lastResetMonth !== currentMonth) {
            userData.lastResetMonth = currentMonth;
            localStorage.setItem(RESTORE_KEY, '5');
        }
        saveData();
    }
    
    return true;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
}

function archiveToday() {
    if (!userData.history) userData.history = {};
    userData.history[userData.today.dateKey] = {
        score: userData.today.score,
        checked: [...userData.today.checked],
        prayers: {...userData.today.prayers}
    };
}

function getRestores() {
    const month = new Date().getMonth();
    const stored = localStorage.getItem(RESTORE_KEY);
    if (!stored) {
        localStorage.setItem(RESTORE_KEY, '5');
        return 5;
    }
    return parseInt(stored);
}

function useRestore() {
    let restores = getRestores();
    if (restores > 0) {
        restores--;
        localStorage.setItem(RESTORE_KEY, String(restores));
        return true;
    }
    return false;
}

// ===== ONBOARDING =====
function showOnboarding() {
    document.body.innerHTML = `
        <div class="onboard-overlay" id="onboardOverlay">
            <div class="onboard-card" id="onboardCard">
                <div id="onboardStep1">
                    <h2>⚡ ENTER THE VOID</h2>
                    <input type="text" id="onboardName" placeholder="Your Name" class="modal-input" maxlength="20">
                    <button class="scan-btn full" onclick="onboardNext1()">NEXT</button>
                </div>
                <div id="onboardStep2" class="hidden">
                    <h2>⚡ IDENTITY</h2>
                    <div class="gender-select">
                        <button class="gender-btn" onclick="onboardSelectGender('male')">👦 MALE</button>
                        <button class="gender-btn" onclick="onboardSelectGender('female')">👧 FEMALE</button>
                    </div>
                </div>
                <div id="onboardStep3" class="hidden">
                    <h2>⚡ CHOOSE YOUR GRIND</h2>
                    <button class="tier-btn easy" onclick="onboardSelectTier('easy')">🟢 EASY<br><small>8 Tasks • 100 Pts</small></button>
                    <button class="tier-btn medium" onclick="onboardSelectTier('medium')">🟡 MEDIUM<br><small>12 Tasks • 100 Pts</small></button>
                    <button class="tier-btn hard" onclick="onboardSelectTier('hard')">🔴 HARD<br><small>17 Tasks • 100 Pts</small></button>
                </div>
            </div>
        </div>
        <style>
            .onboard-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:#000; display:flex; justify-content:center; align-items:center; z-index:9999; }
            .onboard-card { text-align:center; padding:30px 20px; width:90%; max-width:380px; }
            .onboard-card h2 { color:#00FF88; font-size:1.2rem; letter-spacing:3px; margin-bottom:20px; font-family:monospace; }
            .gender-select { display:flex; gap:10px; flex-direction:column; }
            .gender-btn, .tier-btn { width:100%; padding:14px; background:#0A0A0A; border:1px solid #1A1A1A; color:#E0E0E0; font-family:monospace; font-size:0.9rem; cursor:pointer; border-radius:8px; margin-bottom:8px; letter-spacing:2px; }
            .tier-btn small { font-size:0.6rem; color:#666; display:block; margin-top:4px; }
            .tier-btn.easy:active { border-color:#00FF88; }
            .tier-btn.medium:active { border-color:#FBBF24; }
            .tier-btn.hard:active { border-color:#8B5CF6; }
            .hidden { display:none !important; }
        </style>
    `;
}

let onboardGender = '';

function onboardNext1() {
    const name = document.getElementById('onboardName').value.trim();
    if (!name) return alert('Enter your name!');
    document.getElementById('onboardStep1').classList.add('hidden');
    document.getElementById('onboardStep2').classList.remove('hidden');
    document.getElementById('onboardName').value = name;
}

function onboardSelectGender(g) {
    onboardGender = g;
    document.getElementById('onboardStep2').classList.add('hidden');
    document.getElementById('onboardStep3').classList.remove('hidden');
}

function onboardSelectTier(tier) {
    const name = document.getElementById('onboardName').value.trim();
    userData = getDefaultData(name, onboardGender, tier);
    saveData();
    localStorage.setItem(RESTORE_KEY, '5');
    location.reload();
}

// ===== PARTICLES =====
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = Array(80).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.2,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.1
    }));
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            
            ctx.fillStyle = `rgba(139, 92, 246, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }
    draw();
}

// ===== RENDER =====
function renderAll() {
    const cfg = TIER_CONFIG[userData.tier];
    document.getElementById('pilotName').textContent = userData.name;
    document.getElementById('pilotMode').textContent = `${cfg.label} • ${cfg.name} MODE`;
    document.getElementById('rankEmoji').textContent = getRankEmoji();
    
    const day = getDayNumber();
    document.getElementById('dayBadge').textContent = `DAY ${day}`;
    document.getElementById('currentDay').textContent = day;
    document.getElementById('totalDays').textContent = userData.totalDays;
    
    const pct = Math.round((day / userData.totalDays) * 100);
    document.getElementById('progressPercent').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('startDate').textContent = 'Started: ' + formatDate(userData.startDate);
    
    document.getElementById('streakCount').textContent = userData.streak.current;
    document.getElementById('bestStreak').textContent = userData.streak.best;
    document.getElementById('restoreCount').textContent = getRestores();
    document.getElementById('restoreLeft').textContent = getRestores() + ' left this month';
    
    renderWeek();
    renderPrayers();
    renderTasks();
    updateScore();
}

function getRankEmoji() {
    const day = getDayNumber();
    if (day >= 30) return '♾️';
    if (day >= 15) return '👁️‍🗨️';
    if (day >= 7) return '🔥';
    if (day >= 3) return '⚔️';
    return TIER_CONFIG[userData.tier].emoji;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ===== WEEK VIEW =====
function renderWeek() {
    const today = getKarachiTime();
    const dayOfWeek = today.getDay(); // 0=Sun
    
    const days = [];
    const weekRange = document.getElementById('weekRange');
    
    // Calculate week range
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    weekRange.textContent = `${formatDate(weekStart.toISOString().split('T')[0])} - ${formatDate(weekEnd.toISOString().split('T')[0])}`;
    
    // Get 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const isToday = key === getTodayKey();
        const isFuture = d > today;
        
        let status = 'future';
        let icon = '⏳';
        
        if (userData.history && userData.history[key]) {
            status = userData.history[key].score >= 60 ? 'passed' : 'failed';
            icon = status === 'passed' ? '✅' : '❌';
        } else if (isToday) {
            status = 'today';
            icon = '🔥';
        } else if (isFuture) {
            icon = '⏳';
        } else {
            // Past but no data
            icon = '⬜';
        }
        
        days.push({ name: ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()], icon, status, date: d.getDate() });
    }
    
    document.getElementById('weekGrid').innerHTML = days.map(d => `
        <div class="week-day ${d.status}">
            <span class="day-name">${d.name}</span>
            <span class="day-icon">${d.icon}</span>
        </div>
    `).join('');
}

// ===== PRAYERS =====
function renderPrayers() {
    const hour = getCurrentHour();
    const grid = document.getElementById('prayerGrid');
    
    grid.innerHTML = PRAYER_ORDER.map(name => {
        const time = PRAYER_TIMES[name];
        const status = userData.today.prayers[name];
        let cls = 'prayer-slot';
        let icon = '⏳';
        
        if (status === true) { cls += ' done'; icon = '✅'; }
        else if (status === false) { cls += ' missed'; icon = '❌'; }
        else {
            const isLocked = hour < time.start || hour > time.end + 0.5;
            if (isLocked) cls += ' locked';
        }
        
        return `<div class="${cls}" onclick="togglePrayer('${name}')">
            <span class="prayer-icon">${icon}</span>
            <span class="prayer-name">${name}</span>
            <span class="prayer-time">${time.label}</span>
        </div>`;
    }).join('');
    
    checkPrayerStatus();
}

function togglePrayer(name) {
    const hour = getCurrentHour();
    const time = PRAYER_TIMES[name];
    const isLocked = hour < time.start || hour > time.end + 0.5;
    if (isLocked && userData.today.prayers[name] === undefined) return;
    
    const cur = userData.today.prayers[name];
    if (cur === undefined || cur === false) {
        userData.today.prayers[name] = true;
    } else {
        userData.today.prayers[name] = false;
    }
    saveData();
    renderPrayers();
    updateScore();
}

function checkPrayerStatus() {
    const vals = Object.values(userData.today.prayers);
    const done = vals.filter(v => v === true).length;
    const missed = vals.filter(v => v === false).length;
    const total = 5;
    
    document.getElementById('prayerCount').textContent = `${done}/${total}`;
    const msgDiv = document.getElementById('prayerMsg');
    msgDiv.classList.add('hidden');
    
    if (done === total) {
        msgDiv.classList.remove('hidden');
        msgDiv.classList.add('success');
        msgDiv.textContent = '⚡ ALL UPLINKS CONNECTED!';
    } else if (missed >= 3) {
        msgDiv.classList.remove('hidden');
        msgDiv.classList.add('danger');
        msgDiv.textContent = '⚠️ MULTIPLE UPLINKS FAILED!';
    } else if (missed >= 1) {
        msgDiv.classList.remove('hidden');
        msgDiv.classList.add('warning');
        msgDiv.textContent = `⚡ ${missed} UPLINK MISSED`;
    }
}

// ===== TASKS =====
function renderTasks() {
    const cfg = TIER_CONFIG[userData.tier];
    const container = document.getElementById('tasksList');
    let html = '';
    let taskId = 0;
    
    // Prayer tasks
    cfg.prayers.forEach(p => {
        const checked = userData.today.checked.includes('p_' + taskId);
        html += taskRow(taskId, p.name, p.pts, true, checked, 'locked-task');
        taskId++;
    });
    
    // Locked tasks
    cfg.tasks.forEach(t => {
        const checked = userData.today.checked.includes('t_' + taskId);
        html += taskRow(taskId, t.name, t.pts, true, checked, 'locked-task');
        taskId++;
    });
    
    // Custom tasks
    userData.customTasks.forEach((t, i) => {
        if (t) {
            const checked = userData.today.checked.includes('c_' + i);
            html += taskRow(taskId, t.name, t.pts, false, checked, 'custom-task', i);
            taskId++;
        }
    });
    
    container.innerHTML = html;
    
    // Edit events
    container.querySelectorAll('.task-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.customIndex);
            editCustomTask(idx);
        });
    });
}

function taskRow(id, name, pts, locked, checked, cls, customIndex) {
    return `<div class="task-row ${cls} ${checked ? 'completed' : ''}" onclick="toggleTask('${locked ? 'lt' : 'c'}_${customIndex !== undefined ? customIndex : id}')">
        <input type="checkbox" class="task-checkbox" ${checked ? 'checked' : ''} onclick="event.stopPropagation(); toggleTask('${locked ? 'lt' : 'c'}_${customIndex !== undefined ? customIndex : id}')">
        <span class="task-name">${name}</span>
        <span class="task-points">${pts}</span>
        ${!locked ? `<span class="task-edit" data-custom-index="${customIndex}" onclick="event.stopPropagation(); editCustomTask(${customIndex})">✏️</span>` : ''}
    </div>`;
}

function toggleTask(key) {
    const idx = userData.today.checked.indexOf(key);
    if (idx >= 0) {
        userData.today.checked.splice(idx, 1);
    } else {
        userData.today.checked.push(key);
    }
    saveData();
    renderTasks();
    updateScore();
}

function editCustomTask(index) {
    const task = userData.customTasks[index];
    const newName = prompt('Edit task name:', task?.name || 'Custom Task');
    if (newName && newName.trim()) {
        task.name = newName.trim();
        const newPts = parseInt(prompt('Points (1-10):', task.pts));
        if (newPts >= 1 && newPts <= 10) {
            task.pts = newPts;
        }
        saveData();
        renderTasks();
        updateScore();
    }
}

// ===== SCORE =====
function calculateScore() {
    const cfg = TIER_CONFIG[userData.tier];
    let score = 0;
    let id = 0;
    
    // Prayer points
    cfg.prayers.forEach(() => {
        if (userData.today.checked.includes('p_' + id)) {
            score += cfg.prayers[id].pts;
        }
        id++;
    });
    
    // Locked task points
    cfg.tasks.forEach((t, i) => {
        if (userData.today.checked.includes('t_' + (id))) {
            score += t.pts;
        }
        id++;
    });
    
    // Custom task points
    userData.customTasks.forEach((t, i) => {
        if (t && userData.today.checked.includes('c_' + i)) {
            score += t.pts;
        }
    });
    
    // Prayer bonus
    const allPrayers = Object.values(userData.today.prayers).filter(v => v === true).length === 5;
    if (allPrayers) score += 2;
    
    userData.today.score = score;
    saveData();
    return score;
}

function updateScore() {
    const score = calculateScore();
    document.getElementById('scoreBadge').textContent = `${score}/100`;
    document.getElementById('currentScore')?.remove();
}

function displayScoreResult(score) {
    const div = document.getElementById('scoreResult');
    const msg = document.getElementById('scoreMsg');
    const emoji = document.getElementById('scoreEmoji');
    
    div.classList.remove('hidden', 'reward', 'neutral', 'punishment');
    document.getElementById('scoreBadge').textContent = `${score}/100`;
    
    if (score >= 85) {
        div.classList.add('reward');
        msg.textContent = 'Beast mode. Even your rival is scared.';
        emoji.textContent = '🗿';
    } else if (score >= 70) {
        div.classList.add('neutral');
        msg.textContent = 'Decent. But grind harder.';
        emoji.textContent = '⚡';
    } else if (score >= 50) {
        div.classList.add('neutral');
        msg.textContent = 'Bare minimum. Step it up.';
        emoji.textContent = '💀';
    } else {
        div.classList.add('punishment');
        msg.textContent = 'Weak. Your rival just won.';
        emoji.textContent = '😤';
    }
    
    div.scrollIntoView({ behavior: 'smooth' });
}

// ===== NEXT DAY =====
function nextDay() {
    const score = userData.today.score;
    
    if (score >= 60) {
        userData.streak.current = getDayNumber() + 1;
        if (userData.streak.current > userData.totalDays) {
            userData.streak.current = userData.totalDays;
        }
        if (userData.streak.current > userData.streak.best) {
            userData.streak.best = userData.streak.current;
        }
    } else {
        userData.streak.current = Math.max(1, getDayNumber() - 1);
    }
    
    archiveToday();
    userData.today.dateKey = getTodayKey();
    userData.today.checked = [];
    userData.today.prayers = {};
    userData.today.score = 0;
    
    saveData();
    renderAll();
    document.getElementById('scoreResult').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetDaily() {
    if (confirm('ABORT MISSION? Clear today\'s progress?')) {
        userData.today.checked = [];
        userData.today.prayers = {};
        userData.today.score = 0;
        saveData();
        renderAll();
        document.getElementById('scoreResult').classList.add('hidden');
    }
}

function restoreStreak() {
    const restores = getRestores();
    if (restores <= 0) {
        alert('No restores left this month!');
        return;
    }
    document.getElementById('restoreDay').textContent = getDayNumber();
    document.getElementById('restoreModalCount').textContent = restores;
    document.getElementById('restoreModal').classList.remove('hidden');
}

function confirmRestore() {
    if (useRestore()) {
        userData.streak.current = Math.max(userData.streak.current, getDayNumber());
        userData.today.checked = [];
        userData.today.prayers = {};
        userData.today.score = 0;
        saveData();
        renderAll();
    }
    document.getElementById('restoreModal').classList.add('hidden');
}

// ===== SETTINGS =====
function openSettings() {
    document.getElementById('editName').value = userData.name;
    document.getElementById('editMode').value = userData.tier;
    document.getElementById('settingsModal').classList.remove('hidden');
}

function saveSettings() {
    const name = document.getElementById('editName').value.trim();
    if (name) userData.name = name;
    saveData();
    document.getElementById('settingsModal').classList.add('hidden');
    renderAll();
}

// ===== EVENTS =====
function setupEvents() {
    document.getElementById('calculateBtn').addEventListener('click', () => {
        const score = calculateScore();
        displayScoreResult(score);
    });
    
    document.getElementById('nextDayBtn').addEventListener('click', nextDay);
    document.getElementById('resetDailyBtn').addEventListener('click', resetDaily);
    document.getElementById('restoreBtn').addEventListener('click', restoreStreak);
    document.getElementById('confirmRestore').addEventListener('click', confirmRestore);
    document.getElementById('closeRestore').addEventListener('click', () => {
        document.getElementById('restoreModal').classList.add('hidden');
    });
    
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('closeSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(o => o.classList.add('hidden'));
        }
    });
}

// ===== INIT =====
function init() {
    initParticles();
    
    if (!loadData()) return; // Onboarding shown
    
    renderAll();
    setupEvents();
    
    // Check reset every minute
    setInterval(() => {
        if (userData && userData.today.dateKey !== getTodayKey()) {
            archiveToday();
            userData.today.dateKey = getTodayKey();
            userData.today.checked = [];
            userData.today.prayers = {};
            userData.today.score = 0;
            userData.streak.current = getDayNumber();
            
            const currentMonth = new Date().getMonth();
            if (userData.lastResetMonth !== currentMonth) {
                userData.lastResetMonth = currentMonth;
                localStorage.setItem(RESTORE_KEY, '5');
            }
            saveData();
            renderAll();
        }
    }, 60000);
}

// Global functions
window.togglePrayer = togglePrayer;
window.toggleTask = toggleTask;
window.editCustomTask = editCustomTask;
window.onboardNext1 = onboardNext1;
window.onboardSelectGender = onboardSelectGender;
window.onboardSelectTier = onboardSelectTier;

document.addEventListener('DOMContentLoaded', init);
