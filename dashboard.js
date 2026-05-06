// ===== CONFIG =====
const STORAGE_KEY = 'zsys_userData';
const RESTORE_KEY = 'zsys_restores';

const PRAYER_TIMES = {
    Fajr:    { start: 4, end: 6,   label: '4:30-6' },
    Dhuhr:   { start: 12, end: 15,  label: '12-3' },
    Asr:     { start: 15.5, end: 18, label: '3:30-6' },
    Maghrib: { start: 18, end: 20,  label: '6-8' },
    Isha:    { start: 20, end: 23.99, label: '8-12' }
};

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const TIER_CONFIG = {
    easy: {
        name: 'EASY', label: 'ROOKIE',
        prayers: [8,8,8,8,8],
        tasks: [
            { name: 'Focus Work (1 hr)', pts: 20, locked: true },
            { name: 'Sleep on Time', pts: 20, locked: true },
            { name: 'No Bad Habits', pts: 20, locked: true }
        ],
        customSlots: 0
    },
    medium: {
        name: 'MEDIUM', label: 'WARRIOR',
        prayers: [7,7,7,7,7],
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
        name: 'HARD', label: 'SIGMA',
        prayers: [5,5,5,5,5],
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

const QUOTES = [
    "Discipline is the code.",
    "Your rival is grinding. Are you?",
    "No excuses. Just results.",
    "Legends don't make excuses.",
    "Prove them wrong. Right now.",
    "Comfort zone is a cage.",
    "Every checkbox is a victory.",
    "3 AM grind hits different.",
    "Sigma mode: Activated.",
    "Stay hard. Stay focused."
];

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
        today: { dateKey: today, checked: [], prayers: {}, score: 0 },
        customTasks: Array(cfg.customSlots).fill(null).map((_, i) => ({
            name: `Custom Task ${i+1}`, pts: tier === 'hard' ? 5 : tier === 'medium' ? 7 : 0, locked: false
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

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ===== STORAGE =====
function loadData() {
    try { userData = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) { userData = null; }
    if (!userData) {
        userData = getDefaultData('ZAYN', 'male', 'hard');
        saveData();
    }
    checkDayReset();
    return true;
}

function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(userData)); }

function checkDayReset() {
    const today = getTodayKey();
    if (userData.today.dateKey !== today) {
        if (!userData.history) userData.history = {};
        userData.history[userData.today.dateKey] = {
            score: userData.today.score,
            checked: [...userData.today.checked],
            prayers: {...userData.today.prayers}
        };
        userData.today.dateKey = today;
        userData.today.checked = [];
        userData.today.prayers = {};
        userData.today.score = 0;
        userData.streak.current = getDayNumber();
        const m = new Date().getMonth();
        if (userData.lastResetMonth !== m) {
            userData.lastResetMonth = m;
            localStorage.setItem(RESTORE_KEY, '5');
        }
        saveData();
    }
}

function getRestores() {
    const stored = localStorage.getItem(RESTORE_KEY);
    if (!stored) { localStorage.setItem(RESTORE_KEY, '5'); return 5; }
    return parseInt(stored);
}

function useRestore() {
    let r = getRestores();
    if (r > 0) { r--; localStorage.setItem(RESTORE_KEY, String(r)); return true; }
    return false;
}

// ===== QUOTE =====
function animateQuote() {
    let i = 0;
    const el = document.getElementById('quoteText');
    
    function next() {
        el.style.opacity = '0';
        setTimeout(() => {
            el.textContent = QUOTES[i];
            el.style.opacity = '1';
            i = (i + 1) % QUOTES.length;
        }, 400);
    }
    
    next();
    setInterval(next, 5000);
}

// ===== RENDER =====
function renderAll() {
    const cfg = TIER_CONFIG[userData.tier];
    const day = getDayNumber();
    
    document.getElementById('pilotName').textContent = userData.name;
    document.getElementById('pilotMode').textContent = `${cfg.label} • ${cfg.name} MODE`;
    document.getElementById('dayBadge').textContent = `DAY ${day}`;
    document.getElementById('currentDay').textContent = day;
    document.getElementById('totalDays').textContent = userData.totalDays;
    
    const pct = Math.round((day / userData.totalDays) * 100);
    document.getElementById('progressPercent').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('startDate').textContent = formatDate(userData.startDate);
    
    document.getElementById('streakCount').textContent = userData.streak.current;
    document.getElementById('bestStreak').textContent = userData.streak.best;
    document.getElementById('restoreCount').textContent = getRestores();
    document.getElementById('restoreLeft').textContent = getRestores() + ' left this month';
    
    renderWeek();
    renderPrayers();
    renderTasks();
    updateScore();
}

// ===== WEEK =====
function renderWeek() {
    const today = getKarachiTime();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const isToday = key === getTodayKey();
        const isFuture = d > today;
        
        let cls = '';
        let icon = '⬜';
        
        if (userData.history && userData.history[key]) {
            cls = userData.history[key].score >= 60 ? 'pass' : 'fail';
            icon = cls === 'pass' ? '✅' : '❌';
        } else if (isToday) { cls = 'today'; icon = '🔥'; }
        else if (isFuture) { icon = '⏳'; }
        
        days.push({ name: ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()], icon, cls });
    }
    
    document.getElementById('weekGrid').innerHTML = days.map(d => 
        `<div class="week-day ${d.cls}"><span class="day-label">${d.name}</span><span class="day-icon">${d.icon}</span></div>`
    ).join('');
}

// ===== PRAYERS =====
function renderPrayers() {
    const hour = getCurrentHour();
    document.getElementById('prayerGrid').innerHTML = PRAYER_ORDER.map(name => {
        const time = PRAYER_TIMES[name];
        const status = userData.today.prayers[name];
        let cls = 'prayer-slot';
        let icon = '⏳';
        
        if (status === true) { cls += ' done'; icon = '✅'; }
        else if (status === false) { cls += ' miss'; icon = '❌'; }
        else {
            const locked = hour < time.start || hour > time.end + 0.5;
            if (locked) cls += ' locked';
        }
        
        return `<div class="${cls}" onclick="togglePrayer('${name}')">
            <span class="p-icon">${icon}</span>
            <span class="p-name">${name}</span>
            <span class="p-time">${time.label}</span>
        </div>`;
    }).join('');
    
    const vals = Object.values(userData.today.prayers);
    const done = vals.filter(v => v === true).length;
    document.getElementById('prayerCount').textContent = `${done}/5`;
    
    const msg = document.getElementById('prayerMsg');
    msg.classList.add('hidden');
    if (done === 5) { msg.classList.remove('hidden'); msg.className = 'msg success'; msg.textContent = '⚡ ALL UPLINKS CONNECTED!'; }
    else if (vals.filter(v=>v===false).length >= 3) { msg.classList.remove('hidden'); msg.className = 'msg danger'; msg.textContent = '⚠️ MULTIPLE UPLINKS FAILED!'; }
}

function togglePrayer(name) {
    const hour = getCurrentHour();
    const time = PRAYER_TIMES[name];
    if ((hour < time.start || hour > time.end + 0.5) && userData.today.prayers[name] === undefined) return;
    
    const cur = userData.today.prayers[name];
    userData.today.prayers[name] = (cur === undefined || cur === false) ? true : false;
    saveData();
    renderPrayers();
    updateScore();
}

// ===== TASKS =====
function renderTasks() {
    const cfg = TIER_CONFIG[userData.tier];
    let html = '';
    
    // Prayer tasks
    PRAYER_ORDER.forEach((p, i) => {
        const key = 'p_' + i;
        const checked = userData.today.checked.includes(key);
        html += taskHTML(key, p + ' Prayer', cfg.prayers[i], true, checked, 'locked');
    });
    
    // Locked tasks
    cfg.tasks.forEach((t, i) => {
        const key = 't_' + i;
        const checked = userData.today.checked.includes(key);
        html += taskHTML(key, t.name, t.pts, true, checked, 'locked');
    });
    
    // Custom tasks
    userData.customTasks.forEach((t, i) => {
        if (t) {
            const key = 'c_' + i;
            const checked = userData.today.checked.includes(key);
            html += taskHTML(key, t.name, t.pts, false, checked, 'custom', i);
        }
    });
    
    document.getElementById('tasksList').innerHTML = html;
}

function taskHTML(key, name, pts, locked, checked, cls, customIdx) {
    return `<div class="task-row ${cls} ${checked ? 'done' : ''}" onclick="toggleTask('${key}')">
        <input type="checkbox" class="task-check" ${checked ? 'checked' : ''} onclick="event.stopPropagation(); toggleTask('${key}')">
        <span class="task-name">${name}</span>
        <span class="task-pts">${pts}</span>
        ${!locked ? `<span class="task-edit" onclick="event.stopPropagation(); editCustom(${customIdx})">✏️</span>` : ''}
    </div>`;
}

function toggleTask(key) {
    const idx = userData.today.checked.indexOf(key);
    if (idx >= 0) userData.today.checked.splice(idx, 1);
    else userData.today.checked.push(key);
    saveData();
    renderTasks();
    updateScore();
}

function editCustom(idx) {
    const task = userData.customTasks[idx];
    const name = prompt('Task name:', task?.name || '');
    if (name && name.trim()) {
        task.name = name.trim();
        const pts = parseInt(prompt('Points (1-10):', task.pts));
        if (pts >= 1 && pts <= 10) task.pts = pts;
        saveData();
        renderTasks();
        updateScore();
    }
}

// ===== SCORE =====
function calculateScore() {
    const cfg = TIER_CONFIG[userData.tier];
    let score = 0;
    
    // Prayers
    PRAYER_ORDER.forEach((p, i) => {
        if (userData.today.checked.includes('p_' + i)) score += cfg.prayers[i];
    });
    
    // Tasks
    cfg.tasks.forEach((t, i) => {
        if (userData.today.checked.includes('t_' + i)) score += t.pts;
    });
    
    // Custom
    userData.customTasks.forEach((t, i) => {
        if (t && userData.today.checked.includes('c_' + i)) score += t.pts;
    });
    
    if (Object.values(userData.today.prayers).filter(v => v === true).length === 5) score += 2;
    
    userData.today.score = score;
    saveData();
    return score;
}

function updateScore() {
    const score = calculateScore();
    document.getElementById('scoreBadge').textContent = `${score}/100`;
}

function displayScore(score) {
    const div = document.getElementById('scoreResult');
    const msg = document.getElementById('scoreMsg');
    const emoji = document.getElementById('scoreEmoji');
    
    div.classList.remove('hidden', 'success', 'warn', 'danger');
    document.getElementById('scoreBadge').textContent = `${score}/100`;
    
    if (score >= 85) {
        div.classList.add('success'); msg.textContent = 'Beast mode. Even your rival is scared.'; emoji.textContent = '🗿';
    } else if (score >= 70) {
        div.classList.add('warn'); msg.textContent = 'Decent. But grind harder.'; emoji.textContent = '⚡';
    } else if (score >= 50) {
        div.classList.add('warn'); msg.textContent = 'Bare minimum. Step it up.'; emoji.textContent = '💀';
    } else {
        div.classList.add('danger'); msg.textContent = 'Weak. Your rival just won.'; emoji.textContent = '😤';
    }
}

// ===== NEXT DAY =====
function nextDay() {
    const score = userData.today.score;
    if (score >= 60) {
        userData.streak.current = getDayNumber() + 1;
        if (userData.streak.current > userData.streak.best) userData.streak.best = userData.streak.current;
    } else {
        userData.streak.current = Math.max(1, getDayNumber() - 1);
    }
    
    userData.history[userData.today.dateKey] = {
        score, checked: [...userData.today.checked], prayers: {...userData.today.prayers}
    };
    userData.today.dateKey = getTodayKey();
    userData.today.checked = [];
    userData.today.prayers = {};
    userData.today.score = 0;
    saveData();
    renderAll();
    document.getElementById('scoreResult').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== RESTORE =====
function restoreStreak() {
    document.getElementById('restoreModalCount').textContent = getRestores();
    document.getElementById('restoreModal').classList.remove('hidden');
}

// ===== THEME =====
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('darkBtn').classList.toggle('active', theme === 'dark');
    document.getElementById('lightBtn').classList.toggle('active', theme === 'light');
    localStorage.setItem('zsys_theme', theme);
}

// ===== SETTINGS =====
function openSettings() {
    document.getElementById('editName').value = userData.name;
    document.getElementById('editTier').value = userData.tier;
    document.getElementById('settingsModal').classList.remove('hidden');
}

function saveSettings() {
    const name = document.getElementById('editName').value.trim();
    const tier = document.getElementById('editTier').value;
    if (name) userData.name = name;
    if (tier !== userData.tier) {
        userData.tier = tier;
        const cfg = TIER_CONFIG[tier];
        userData.customTasks = Array(cfg.customSlots).fill(null).map((_, i) => ({
            name: `Custom Task ${i+1}`, pts: 5, locked: false
        }));
    }
    saveData();
    document.getElementById('settingsModal').classList.add('hidden');
    renderAll();
}

// ===== EVENTS =====
function setupEvents() {
    document.getElementById('calculateBtn').addEventListener('click', () => displayScore(calculateScore()));
    document.getElementById('nextDayBtn').addEventListener('click', nextDay);
    document.getElementById('resetDailyBtn').addEventListener('click', () => {
        if (confirm('ABORT MISSION?')) {
            userData.today.checked = [];
            userData.today.prayers = {};
            userData.today.score = 0;
            saveData();
            renderAll();
        }
    });
    
    document.getElementById('restoreBtn').addEventListener('click', restoreStreak);
    document.getElementById('confirmRestore').addEventListener('click', () => {
        if (useRestore()) { userData.streak.current = Math.max(userData.streak.current, getDayNumber()); saveData(); renderAll(); }
        document.getElementById('restoreModal').classList.add('hidden');
    });
    document.getElementById('closeRestore').addEventListener('click', () => document.getElementById('restoreModal').classList.add('hidden'));
    
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('closeSettings').addEventListener('click', () => document.getElementById('settingsModal').classList.add('hidden'));
    
    document.getElementById('exportData').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `zsys-backup-${userData.name}.json`;
        a.click();
    });
    
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    });
}

// ===== INIT =====
function init() {
    // Load theme
    const savedTheme = localStorage.getItem('zsys_theme') || 'dark';
    setTheme(savedTheme);
    
    loadData();
    renderAll();
    animateQuote();
    setupEvents();
    
    setInterval(() => {
        if (userData && userData.today.dateKey !== getTodayKey()) {
            checkDayReset();
            renderAll();
        }
    }, 60000);
}

window.togglePrayer = togglePrayer;
window.toggleTask = toggleTask;
window.editCustom = editCustom;
window.setTheme = setTheme;

document.addEventListener('DOMContentLoaded', init);
