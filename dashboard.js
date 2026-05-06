// ===== CONFIG =====
const STORAGE_KEYS = {
    PROFILES: 'zsys_profiles',
    ACTIVE: 'zsys_active',
    DATA: 'zsys_data_',
    HISTORY: 'zsys_history_',
    LAST_DATE: 'zsys_lastDate'
};

const PRAYER_TIMES = {
    Fajr: { start: 4, end: 6, label: '4:30-6:00' },
    Dhuhr: { start: 12, end: 15, label: '12:00-15:00' },
    Asr: { start: 15.5, end: 18, label: '15:30-18:00' },
    Maghrib: { start: 18, end: 20, label: '18:00-20:00' },
    Isha: { start: 20, end: 23.99, label: '20:00-00:00' }
};

const DEFAULT_TASKS = [
    // CRITICAL (50 pts)
    { id: 1, name: 'Solved Past Paper', points: 14, category: 'critical' },
    { id: 2, name: 'Study Session (2 hrs)', points: 12, category: 'critical' },
    { id: 3, name: 'Study Session 2 (2 hrs)', points: 12, category: 'critical' },
    { id: 4, name: 'No Fap + No Smoke/Vape', points: 12, category: 'critical' },
    // WORSHIP (30 pts) - Rendered separately
    // IMPORTANT (54 pts)
    { id: 5, name: 'Sleep at 3 AM (Wake 10 AM)', points: 10, category: 'important' },
    { id: 6, name: 'Exercise/Running (30 min)', points: 8, category: 'important' },
    { id: 7, name: 'No Social Media Scrolling', points: 8, category: 'important' },
    { id: 8, name: 'Vocabulary + Current Affairs (1 hr)', points: 8, category: 'important' },
    { id: 9, name: 'Morning Revision (30 min)', points: 8, category: 'important' },
    { id: 10, name: '10k Steps Walking', points: 6, category: 'important' },
    { id: 11, name: 'Dinner Before 6 PM', points: 6, category: 'important' },
    // GOOD HABIT (36 pts)
    { id: 12, name: 'Breakfast After 10:30 AM', points: 6, category: 'good' },
    { id: 13, name: 'No Sugar/Junk Food Today', points: 6, category: 'good' },
    { id: 14, name: 'Cold Shower (Morning)', points: 6, category: 'good' },
    { id: 15, name: 'Water (10+ glasses)', points: 6, category: 'good' },
    { id: 16, name: 'Stretching (15 min)', points: 6, category: 'good' },
    { id: 17, name: 'Read 5 Pages (Book)', points: 6, category: 'good' },
    // BONUS (30 pts)
    { id: 18, name: 'Shower Before Sleep', points: 6, category: 'bonus' },
    { id: 19, name: 'Skin Care Routine', points: 6, category: 'bonus' },
    { id: 20, name: 'Gratitude/Journal (5 min)', points: 6, category: 'bonus' },
    { id: 21, name: 'Custom Task Slot 1', points: 6, category: 'bonus' },
    { id: 22, name: 'Custom Task Slot 2', points: 6, category: 'bonus' },
];

const TITLE_SYSTEM = {
    ROOKIE: { emoji: '🔰', minPoints: 0, name: 'ROOKIE' },
    GRINDER: { emoji: '⚙️', minPoints: 50, name: 'GRINDER' },
    WARRIOR: { emoji: '🥷', minPoints: 100, name: 'WARRIOR' },
    ELITE: { emoji: '🔥', minPoints: 150, name: 'ELITE' },
    SIGMA: { emoji: '🗿', minPoints: 200, minStreak: 7, name: 'SIGMA' },
    LEGEND: { emoji: '👁️‍🗨️', minPoints: 200, minStreak: 15, name: 'LEGEND' },
    IMMORTAL: { emoji: '♾️', minPoints: 200, minStreak: 30, name: 'IMMORTAL' },
};

// ===== STATE =====
let appState = null;
let activeProfileId = null;
let allProfiles = [];
let bonusPoints = 0;

// ===== KARACHI TIME =====
function getKarachiTime() {
    const now = new Date();
    const offset = 5 * 60;
    const localOffset = now.getTimezoneOffset();
    return new Date(now.getTime() + (offset + localOffset) * 60000);
}

function getTodayKey() {
    const t = getKarachiTime();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}

function getCurrentHour() {
    return getKarachiTime().getHours() + getKarachiTime().getMinutes() / 60;
}

// ===== STORAGE =====
function loadProfiles() {
    try { allProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '[]'); }
    catch(e) { allProfiles = []; }
}

function saveProfiles() {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(allProfiles));
}

function getDefaultState() {
    return {
        settings: { totalDays: 30, goal: 'exam', age: 18 },
        streak: { current: 1, best: 1 },
        tasks: JSON.parse(JSON.stringify(DEFAULT_TASKS)),
        today: {
            dateKey: getTodayKey(),
            checked: [],
            prayers: {},
            proofs: {},
            score: 0
        },
        bonusPoints: 0
    };
}

function loadProfile(id) {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.DATA + id);
        appState = data ? JSON.parse(data) : getDefaultState();
    } catch(e) {
        appState = getDefaultState();
    }
    if (!appState.today.prayers) appState.today.prayers = {};
    if (!appState.today.proofs) appState.today.proofs = {};
    if (!appState.bonusPoints) appState.bonusPoints = 0;
    bonusPoints = appState.bonusPoints || 0;
    
    checkDayReset();
}

function saveState() {
    if (!activeProfileId) return;
    appState.bonusPoints = bonusPoints;
    localStorage.setItem(STORAGE_KEYS.DATA + activeProfileId, JSON.stringify(appState));
}

// ===== AUTO RESET CHECK =====
function checkDayReset() {
    const today = getTodayKey();
    if (appState.today.dateKey !== today) {
        // Archive yesterday
        archiveDay();
        // Reset daily
        appState.today.dateKey = today;
        appState.today.checked = [];
        appState.today.prayers = {};
        appState.today.proofs = {};
        appState.today.score = 0;
        saveState();
    }
}

function archiveDay() {
    const historyKey = STORAGE_KEYS.HISTORY + activeProfileId;
    let history = [];
    try { history = JSON.parse(localStorage.getItem(historyKey) || '[]'); } catch(e) {}
    history.push({
        date: appState.today.dateKey,
        score: appState.today.score,
        checked: [...appState.today.checked],
        prayers: {...appState.today.prayers}
    });
    if (history.length > 90) history = history.slice(-90);
    localStorage.setItem(historyKey, JSON.stringify(history));
}

// ===== STARFIELD =====
function initStarfield() {
    const canvas = document.getElementById('starfieldCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const stars = Array(150).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005
    }));
    
    function draw() {
        ctx.fillStyle = '#020408';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        stars.forEach(s => {
            s.twinkle += s.speed;
            const alpha = 0.3 + Math.sin(s.twinkle) * 0.3;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
            ctx.fill();
        });
        
        requestAnimationFrame(draw);
    }
    
    draw();
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ===== RENDER ALL =====
function renderAll() {
    if (!appState) return;
    renderPrayers();
    renderTasks();
    updateUI();
    updateResetTimer();
}

function updateUI() {
    document.getElementById('pilotName').textContent = activeProfileId ? 
        (allProfiles.find(p => p.id === activeProfileId)?.name || 'ZAYN') : 'ZAYN';
    document.getElementById('currentDayDisplay').textContent = appState.streak.current;
    document.getElementById('totalDaysInput').value = appState.settings.totalDays;
    document.getElementById('streakCount').textContent = appState.streak.current;
    document.getElementById('bestStreak').textContent = appState.streak.best;
    updateProgress();
    updateTitle();
    renderProfileDropdown();
}

function updateProgress() {
    const pct = Math.min((appState.streak.current / appState.settings.totalDays) * 100, 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressLabel').textContent = 
        `WARP: ${appState.streak.current} / ${appState.settings.totalDays} DAYS`;
}

function updateTitle() {
    const titles = Object.entries(TITLE_SYSTEM).reverse();
    let currentTitle = titles.find(([_, t]) => {
        if (t.minStreak) return bonusPoints >= t.minPoints && appState.streak.current >= t.minStreak;
        return bonusPoints >= t.minPoints;
    });
    if (!currentTitle) currentTitle = ['ROOKIE', TITLE_SYSTEM.ROOKIE];
    
    const [_, title] = currentTitle;
    document.getElementById('rankDisplay').innerHTML = `
        <span class="rank-icon">${title.emoji}</span>
        <span class="rank-text">${title.name}</span>
    `;
    document.getElementById('integrityScore').textContent = 
        Math.min(100, 70 + (appState.streak.current * 2)) + '%';
}

// ===== PRAYERS =====
function renderPrayers() {
    const grid = document.getElementById('prayerGrid');
    const currentHour = getCurrentHour();
    
    grid.innerHTML = Object.entries(PRAYER_TIMES).map(([name, time]) => {
        const status = appState.today.prayers[name];
        let className = 'prayer-slot';
        let icon = '⏳';
        
        if (status === true) { className += ' done'; icon = '✅'; }
        else if (status === false) { className += ' missed'; icon = '❌'; }
        
        const isLocked = currentHour < time.start || currentHour > time.end + 0.5;
        if (isLocked && status === undefined) className += ' locked';
        
        return `<div class="${className}" onclick="togglePrayer('${name}')" data-prayer="${name}">
            <span class="prayer-name">${name}</span>
            <span class="prayer-icon-status">${icon}</span>
            <span class="prayer-time-range">${time.label}</span>
        </div>`;
    }).join('');
    
    checkPrayerStatus();
}

function togglePrayer(name) {
    const currentHour = getCurrentHour();
    const time = PRAYER_TIMES[name];
    const isLocked = currentHour < time.start || currentHour > time.end + 0.5;
    
    if (isLocked && appState.today.prayers[name] === undefined) return;
    
    const current = appState.today.prayers[name];
    if (current === undefined || current === false) {
        appState.today.prayers[name] = true;
    } else if (current === true) {
        appState.today.prayers[name] = false;
    }
    
    saveState();
    renderPrayers();
}

function checkPrayerStatus() {
    const statusDiv = document.getElementById('prayerStatus');
    const prayers = Object.values(appState.today.prayers);
    const done = prayers.filter(v => v === true).length;
    const missed = prayers.filter(v => v === false).length;
    const total = 5;
    
    statusDiv.classList.remove('hidden', 'success', 'warning', 'danger');
    
    if (done === total) {
        statusDiv.classList.add('success');
        statusDiv.textContent = '⚡ ALL UPLINKS CONNECTED! +5 BONUS POINTS';
        if (!appState.today._prayerBonusGiven) {
            bonusPoints += 5;
            appState.today._prayerBonusGiven = true;
            saveState();
        }
    } else if (missed >= 3) {
        statusDiv.classList.add('danger');
        statusDiv.textContent = `⚠️ ${missed} UPLINKS FAILED! STREAK AT RISK!`;
    } else if (missed >= 1) {
        statusDiv.classList.add('warning');
        statusDiv.textContent = `⚡ ${missed} UPLINK MISSED. RECONNECT.`;
    } else {
        statusDiv.classList.add('hidden');
    }
}

// ===== TASKS =====
function renderTasks() {
    const categories = {
        critical: { container: 'criticalTasks', points: 'criticalPoints' },
        important: { container: 'importantTasks', points: 'importantPoints' },
        good: { container: 'goodTasks', points: 'goodPoints' },
        bonus: { container: 'bonusTasks', points: 'bonusPoints' }
    };
    
    Object.entries(categories).forEach(([cat, els]) => {
        const tasks = appState.tasks.filter(t => t.category === cat);
        const container = document.getElementById(els.container);
        const pointsEl = document.getElementById(els.points);
        
        const catPoints = tasks.reduce((s, t) => s + t.points, 0);
        pointsEl.textContent = catPoints + ' PTS';
        
        container.innerHTML = tasks.map(task => {
            const checked = appState.today.checked.includes(task.id);
            const hasProof = appState.today.proofs[task.id];
            
            return `<div class="task-row ${checked ? 'completed' : ''}" onclick="toggleTask(${task.id})">
                <input type="checkbox" class="task-checkbox" ${checked ? 'checked' : ''} 
                    onclick="event.stopPropagation(); toggleTask(${task.id})">
                <span class="task-name">${task.name}</span>
                <span class="proof-upload ${hasProof ? 'has-proof' : ''}" 
                    onclick="event.stopPropagation(); uploadProof(${task.id})" 
                    title="Add proof">📸</span>
                <span class="task-points-badge">${task.points}</span>
            </div>`;
        }).join('');
    });
}

function toggleTask(id) {
    const idx = appState.today.checked.indexOf(id);
    if (idx >= 0) {
        appState.today.checked.splice(idx, 1);
    } else {
        appState.today.checked.push(id);
    }
    saveState();
    renderTasks();
}

function uploadProof(id) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
        if (input.files[0]) {
            appState.today.proofs[id] = true;
            bonusPoints += 2;
            saveState();
            renderTasks();
            updateTitle();
        }
    };
    input.click();
}

// ===== SCORE =====
function calculateScore() {
    let score = 0;
    appState.today.checked.forEach(id => {
        const task = appState.tasks.find(t => t.id === id);
        if (task) score += task.points;
    });
    
    // Prayer bonus
    const allPrayersDone = Object.values(appState.today.prayers).filter(v => v === true).length === 5;
    if (allPrayersDone) score += 5;
    
    appState.today.score = score;
    saveState();
    displayScore(score);
}

function displayScore(score) {
    const resultDiv = document.getElementById('scoreResult');
    const msgDiv = document.getElementById('scoreMessage');
    const emojiDiv = document.getElementById('scoreEmoji');
    
    document.getElementById('currentScore').textContent = score;
    resultDiv.classList.remove('hidden', 'reward', 'neutral', 'punishment');
    
    if (score >= 180) {
        resultDiv.classList.add('reward');
        msgDiv.textContent = 'Beast mode. Even your rival is scared.';
        emojiDiv.textContent = '🗿';
        bonusPoints += 10;
    } else if (score >= 140) {
        resultDiv.classList.add('neutral');
        msgDiv.textContent = 'Decent. But decent won\'t beat your competition.';
        emojiDiv.textContent = '⚡';
        bonusPoints += 5;
    } else if (score >= 100) {
        resultDiv.classList.add('neutral');
        msgDiv.textContent = 'Bare minimum. Your crush isn\'t impressed.';
        emojiDiv.textContent = '💀';
    } else {
        resultDiv.classList.add('punishment');
        msgDiv.textContent = 'Pathetic. Your rival just overtook you.';
        emojiDiv.textContent = '😤';
    }
    
    saveState();
    updateTitle();
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// ===== NEXT DAY =====
function nextDay() {
    const score = appState.today.score || 0;
    const allPrayersMissed = Object.values(appState.today.prayers).filter(v => v === false).length === 5;
    
    if (score >= 100 && !allPrayersMissed) {
        appState.streak.current += 1;
        if (appState.streak.current > appState.streak.best) {
            appState.streak.best = appState.streak.current;
        }
        bonusPoints += 5;
    } else {
        appState.streak.current = Math.max(3, appState.streak.current - 1);
    }
    
    archiveDay();
    appState.today.checked = [];
    appState.today.prayers = {};
    appState.today.proofs = {};
    appState.today.score = 0;
    appState.today.dateKey = getTodayKey();
    appState.today._prayerBonusGiven = false;
    
    saveState();
    renderAll();
    document.getElementById('scoreResult').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetDaily() {
    if (confirm('ABORT MISSION? This clears today\'s progress. Continue?')) {
        appState.today.checked = [];
        appState.today.prayers = {};
        appState.today.proofs = {};
        appState.today.score = 0;
        appState.today._prayerBonusGiven = false;
        saveState();
        renderAll();
        document.getElementById('scoreResult').classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ===== RESET TIMER =====
function updateResetTimer() {
    const now = getKarachiTime();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    
    document.getElementById('resetTimer').textContent = 
        `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ===== PROFILES =====
function renderProfileDropdown() {
    const select = document.getElementById('profileSelect');
    select.innerHTML = '<option value="">Select Pilot</option>';
    allProfiles.forEach(p => {
        const emoji = { self: '👤', friend: '🤝', rival: '🆚', crush: '💕' }[p.type] || '👤';
        select.innerHTML += `<option value="${p.id}" ${p.id === activeProfileId ? 'selected' : ''}>
            ${emoji} ${p.name}
        </option>`;
    });
}

function createProfile(name, type, goal, age) {
    const id = 'p_' + Date.now();
    const profile = { id, name, type, goal, age, createdAt: new Date().toISOString() };
    allProfiles.push(profile);
    saveProfiles();
    localStorage.setItem(STORAGE_KEYS.DATA + id, JSON.stringify(getDefaultState()));
    switchProfile(id);
}

function switchProfile(id) {
    activeProfileId = id;
    localStorage.setItem(STORAGE_KEYS.ACTIVE, id);
    loadProfile(id);
    renderAll();
    renderProfileDropdown();
}

// ===== EVENT LISTENERS =====
function setupEvents() {
    document.getElementById('totalDaysInput').addEventListener('change', function() {
        let val = parseInt(this.value);
        if (isNaN(val) || val < 1) val = 30;
        if (val > 365) val = 365;
        appState.settings.totalDays = val;
        saveState();
        updateUI();
    });
    
    document.getElementById('calculateBtn').addEventListener('click', calculateScore);
    document.getElementById('nextDayBtn').addEventListener('click', nextDay);
    document.getElementById('resetDailyBtn').addEventListener('click', resetDaily);
    
    document.getElementById('profileSelect').addEventListener('change', function() {
        if (this.value) switchProfile(this.value);
    });
    
    document.getElementById('addProfileBtn').addEventListener('click', () => {
        document.getElementById('profileModal').classList.remove('hidden');
    });
    
    document.getElementById('cancelProfileBtn').addEventListener('click', () => {
        document.getElementById('profileModal').classList.add('hidden');
    });
    
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        const name = document.getElementById('newProfileName').value.trim();
        const type = document.getElementById('newProfileType').value;
        const goal = document.getElementById('newProfileGoal').value;
        const age = parseInt(document.getElementById('newProfileAge').value) || 18;
        
        if (!name) return alert('Enter pilot name!');
        createProfile(name, type, goal, age);
        document.getElementById('profileModal').classList.add('hidden');
        document.getElementById('newProfileName').value = '';
    });
    
    document.getElementById('closeScoreBtn').addEventListener('click', () => {
        document.getElementById('scoreDetailModal').classList.add('hidden');
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('profileModal').classList.add('hidden');
            document.getElementById('scoreDetailModal').classList.add('hidden');
        }
    });
}

// ===== INIT =====
function init() {
    initStarfield();
    loadProfiles();
    
    activeProfileId = localStorage.getItem(STORAGE_KEYS.ACTIVE);
    if (activeProfileId && allProfiles.find(p => p.id === activeProfileId)) {
        loadProfile(activeProfileId);
    } else if (allProfiles.length > 0) {
        activeProfileId = allProfiles[0].id;
        loadProfile(activeProfileId);
    } else {
        // Create default profile
        createProfile('ZAYN', 'self', 'exam', 18);
    }
    
    renderAll();
    renderProfileDropdown();
    setupEvents();
    
    // Update timer every second
    setInterval(updateResetTimer, 1000);
    
    // Check for day reset every minute
    setInterval(() => {
        if (appState && appState.today.dateKey !== getTodayKey()) {
            checkDayReset();
            renderAll();
        }
    }, 60000);
}

// Global functions for onclick
window.togglePrayer = togglePrayer;
window.toggleTask = toggleTask;
window.uploadProof = uploadProof;

document.addEventListener('DOMContentLoaded', init);
