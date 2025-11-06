"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // DOM elements
    const backgroundLayer = document.getElementById("background-layer");
    const contentLayer = document.getElementById("content-layer");
    const canvas = document.getElementById("analog-clock");
    const ctx = canvas.getContext("2d");
    const radius = canvas.width / 2;

    const digitalClock = document.getElementById("digital-clock");
    const countdownEl = document.getElementById("countdown");
    const calendarToggle = document.getElementById("calendar-toggle");
    const settingsToggle = document.getElementById("settings-toggle");
    const calendarPanel = document.getElementById("calendar-panel");
    const monthlyCalendarPanel = document.getElementById("monthly-calendar-panel");
    const settingsPanel = document.getElementById("settings-panel");
    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const calendarMonthYear = document.getElementById("calendar-month-year");
    const calendarGrid = document.getElementById("calendar-grid");

    // Settings inputs
    const hoursInput = document.getElementById("hours");
    const minutesInput = document.getElementById("minutes");
    const secondsInput = document.getElementById("seconds");
    const startTickInput = document.getElementById("start-tick");
    const tickProfileSelect = document.getElementById("tick-profile");
    const tickPitchInput = document.getElementById("tick-pitch");
    const pitchValue = document.getElementById("pitch-value");
    const tickVolumeInput = document.getElementById("tick-volume");
    const volumeValue = document.getElementById("volume-value");
    const enableSoundCheckbox = document.getElementById("enable-sound");
    const bgColorInput = document.getElementById("bg-color");
    const secretNoteInput = document.getElementById("secret-note");
    const stealthModeCheckbox = document.getElementById("stealth-mode");
    const devConsole = document.getElementById("dev-console");
    const toggleDevConsoleBtn = document.getElementById("toggle-dev-console");
    const exportDataBtn = document.getElementById("export-data");
    const importDataBtn = document.getElementById("import-data");
    const clearStatsBtn = document.getElementById("clear-stats");
    const exportJSONBtn = document.getElementById("export-json");
    const importJSONBtn = document.getElementById("import-json");
    const reloadJSONBtn = document.getElementById("reload-json");
    const startBtn = document.getElementById("start-countdown");
    const stopBtn = document.getElementById("stop-countdown");
    const resetBtn = document.getElementById("reset-countdown");
    const statusIndicator = document.getElementById("status-indicator");

    // State
    let countdownTimer = null;
    let bgTimer = null;
    let endTimestamp = null;
    let countdownTime = 0;
    let audioCtx = null;
    let isPaused = false;
    let pausedTime = 0;
    
    // Dragging state
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    // Analytics (local only, privacy-focused)
    let usageStats = {
        totalCountdowns: 0,
        totalTime: 0, // in seconds
        presetUsage: {},
        lastActive: null
    };

    // Default holidays (fallback)
    const defaultHolidays = {
        "2025-01-01": { name: "New Year's Day", country: "KE", emoji: "🇰🇪" },
        "2025-04-18": { name: "Good Friday", country: "KE", emoji: "🇰🇪" },
        "2025-04-21": { name: "Easter Monday", country: "KE", emoji: "🇰🇪" },
        "2025-05-01": { name: "Labour Day", country: "KE", emoji: "🇰🇪" },
        "2025-06-02": { name: "Madaraka Day", country: "KE", emoji: "🇰🇪" },
        "2025-03-30": { name: "Eid al-Fitr", country: "KE", emoji: "🇰🇪" },
        "2025-06-07": { name: "Eid al-Adha", country: "KE", emoji: "🇰🇪" },
        "2025-10-10": { name: "Utamaduni Day", country: "KE", emoji: "🇰🇪" },
        "2025-10-20": { name: "Mashujaa Day", country: "KE", emoji: "🇰🇪" },
        "2025-12-12": { name: "Jamhuri Day", country: "KE", emoji: "🇰🇪" },
        "2025-12-25": { name: "Christmas Day", country: "KE", emoji: "🇰🇪" },
        "2025-12-26": { name: "Boxing Day", country: "KE", emoji: "🇰🇪" }
    };

    // JSON Data Storage
    let jsonData = {
        holidays: {},
        events: [],
        plans: []
    };
    
    // Calendar state
    let currentCalendarMonth = new Date().getMonth();
    let currentCalendarYear = new Date().getFullYear();
    const firstFridayStart = new Date(2024, 9, 31); // Oct 31, 2024 (Thursday)
    const firstFriday = new Date(2024, 10, 1); // Nov 1, 2024 (Friday - first Friday after Oct 31)
    const sixWeekPeriod = 6 * 7 * 24 * 60 * 60 * 1000; // 6 weeks in milliseconds

    /* Audio Context */
    function ensureAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    /* Analog Clock Drawing */
    function drawAnalogClock() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(radius, radius);

        // Clock face
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.95, 0, 2 * Math.PI);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Clock marks
        for (let i = 0; i < 60; i++) {
            const angle = i * Math.PI / 30;
            const isMajor = i % 5 === 0;
            const start = radius * (isMajor ? 0.85 : 0.90);
            const end = radius * 0.95;
            ctx.beginPath();
            ctx.moveTo(start * Math.sin(angle), -start * Math.cos(angle));
            ctx.lineTo(end * Math.sin(angle), -end * Math.cos(angle));
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = isMajor ? 4 : 2;
            ctx.stroke();
        }

        // Clock numbers
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const numbers = [12, 3, 6, 9];
        const numberPositions = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
        for (let i = 0; i < 4; i++) {
            const angle = numberPositions[i];
            const x = (radius * 0.75) * Math.sin(angle);
            const y = -(radius * 0.75) * Math.cos(angle);
            ctx.fillText(numbers[i], x, y);
        }

        // Clock hands
        const now = new Date();
        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        const hourAngle = (hours + minutes / 60) * Math.PI / 6;
        const minuteAngle = (minutes + seconds / 60) * Math.PI / 30;
        const secondAngle = seconds * Math.PI / 30;

        // Hour hand
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius * 0.5 * Math.sin(hourAngle), -radius * 0.5 * Math.cos(hourAngle));
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Minute hand
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius * 0.7 * Math.sin(minuteAngle), -radius * 0.7 * Math.cos(minuteAngle));
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Second hand
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius * 0.8 * Math.sin(secondAngle), -radius * 0.8 * Math.cos(secondAngle));
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();

        ctx.translate(-radius, -radius);
    }

    /* Digital Clock */
    function updateDigitalClock() {
        const now = new Date();
        digitalClock.textContent = now.toLocaleTimeString("en-KE", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }

    /* Calendar Logic */
    function getISOWeekNumber(d) {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    }

    function daysLeftInYear(d) {
        const end = new Date(d.getFullYear(), 11, 31);
        return Math.ceil((end.setHours(0, 0, 0, 0) - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
    }

    function daysLeftInMonth(d) {
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return last.getDate() - d.getDate();
    }

    function daysLeftInWeek(d) {
        const isoDay = d.getDay() === 0 ? 7 : d.getDay();
        return 7 - isoDay;
    }

    /* JSON Data Management */
    async function loadJSONData() {
        try {
            // Try to load from localStorage first (user's custom data)
            const savedData = localStorage.getItem("clockJSONData");
            if (savedData) {
                jsonData = JSON.parse(savedData);
                return;
            }
            
            // Try to load from data.json file
            const response = await fetch("data.json");
            if (response.ok) {
                const data = await response.json();
                jsonData = {
                    holidays: data.holidays || {},
                    events: data.events || [],
                    plans: data.plans || []
                };
                // Save to localStorage for offline access
                localStorage.setItem("clockJSONData", JSON.stringify(jsonData));
            } else {
                // Fallback to defaults
                jsonData = {
                    holidays: defaultHolidays,
                    events: [],
                    plans: []
                };
            }
        } catch (e) {
            console.error("Failed to load JSON data:", e);
            // Fallback to defaults
            jsonData = {
                holidays: defaultHolidays,
                events: [],
                plans: []
            };
        }
    }

    function saveJSONData() {
        localStorage.setItem("clockJSONData", JSON.stringify(jsonData));
    }

    function exportJSONData() {
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clockwork-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importJSONData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    jsonData = {
                        holidays: data.holidays || {},
                        events: data.events || [],
                        plans: data.plans || []
                    };
                    saveJSONData();
                    resolve();
                } catch (err) {
                    reject(new Error("Invalid JSON file: " + err.message));
                }
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    }

    function getHolidayString(d) {
        const key = d.toISOString().split("T")[0];
        const holiday = jsonData.holidays[key];
        if (holiday) {
            return `${holiday.name} ${holiday.emoji || ""}`.trim();
        }
        return "";
    }

    function getEventsForDate(d) {
        const key = d.toISOString().split("T")[0];
        return jsonData.events.filter(event => event.date === key);
    }

    function getPlansForDate(d) {
        const key = d.toISOString().split("T")[0];
        return jsonData.plans.filter(plan => plan.date === key);
    }

    /* Event Countdown & Reminders */
    function getUpcomingEvents() {
        const now = new Date();
        const upcoming = [];
        
        jsonData.events.forEach(event => {
            const eventDate = new Date(event.date + (event.time ? "T" + event.time : ""));
            const diffMs = eventDate - now;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays <= 30) {
                upcoming.push({
                    ...event,
                    daysUntil: diffDays,
                    eventDate: eventDate
                });
            }
        });
        
        return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    }

    function formatEventCountdown(event) {
        const days = event.daysUntil;
        if (days === 0) return "Today";
        if (days === 1) return "Tomorrow";
        if (days <= 3) return `${days} days (${days === 3 ? "⚠️ Reminder!" : ""})`;
        return `${days} days`;
    }

    function updateUpcomingEvents() {
        const upcomingEventsEl = document.getElementById("upcoming-events");
        if (!upcomingEventsEl) return;
        
        const upcoming = getUpcomingEvents().slice(0, 5); // Show top 5
        
        if (upcoming.length === 0) {
            upcomingEventsEl.innerHTML = "";
            return;
        }
        
        let html = "<div style='margin-top: 8px;'><strong>Upcoming Events:</strong><ul style='margin: 4px 0; padding-left: 20px; font-size: 0.9rem;'>";
        upcoming.forEach(event => {
            const countdown = formatEventCountdown(event);
            const timeStr = event.time ? ` (${event.time})` : "";
            const reminderClass = event.daysUntil <= 3 ? " style='color: #f39c12; font-weight: bold;'" : "";
            html += `<li${reminderClass}>${event.name}${timeStr} - ${countdown}</li>`;
        });
        html += "</ul></div>";
        upcomingEventsEl.innerHTML = html;
    }

    function updateCalendarPanel() {
        const now = new Date();
        document.getElementById("calendar-date").textContent = now.toLocaleDateString("en-KE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        document.getElementById("calendar-week").textContent = `Week Number: ${getISOWeekNumber(now)}`;
        document.getElementById("calendar-days-year").textContent = `Days Left in Year: ${daysLeftInYear(now)}`;
        document.getElementById("calendar-days-month").textContent = `Days Left in Month: ${daysLeftInMonth(now)}`;
        document.getElementById("calendar-days-week").textContent = `Days Left in Week: ${daysLeftInWeek(now)}`;
        
        const holidayText = getHolidayString(now);
        const todayEvents = getEventsForDate(now);
        const todayPlans = getPlansForDate(now);
        
        let displayText = holidayText || "";
        if (todayEvents.length > 0) {
            displayText += (displayText ? " | " : "") + `Events: ${todayEvents.length}`;
        }
        if (todayPlans.length > 0) {
            displayText += (displayText ? " | " : "") + `Plans: ${todayPlans.length}`;
        }
        
        document.getElementById("calendar-holiday").textContent = displayText || "No events today";
        updateUpcomingEvents();
    }

    /* Monthly Calendar */
    function isEvery5thFriday(date) {
        // Check if date is a Friday
        if (date.getDay() !== 5) return false;
        
        // Check if date is within the 6-week period starting from Oct 31, 2024
        const periodStart = firstFridayStart.getTime();
        const periodEnd = periodStart + sixWeekPeriod;
        const dateTime = date.getTime();
        
        // Only mark Fridays within the 6-week interval
        if (dateTime < periodStart || dateTime > periodEnd) return false;
        
        // Calculate which Friday number this is (1st, 2nd, 3rd, etc.)
        // Nov 1, 2024 is the first Friday after Oct 31
        const diffTime = date - firstFriday;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weeksSince = Math.floor(diffDays / 7);
        const fridayNumber = weeksSince + 1; // 1-based: 1st, 2nd, 3rd, etc.
        
        // Mark every 5th Friday: 5th, 10th, 15th, etc.
        // Within 6 weeks, we'll have Fridays 1-6, so only the 5th Friday (week 4 = Nov 29)
        return fridayNumber % 5 === 0;
    }
    
    function isIn6WeekPeriod(date) {
        const periodStart = firstFridayStart.getTime();
        const periodEnd = periodStart + sixWeekPeriod;
        const dateTime = date.getTime();
        return dateTime >= periodStart && dateTime <= periodEnd;
    }

    function renderMonthlyCalendar() {
        const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
        const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        // Update month/year header
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        calendarMonthYear.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
        
        // Clear grid
        calendarGrid.innerHTML = "";
        
        // Add day headers
        const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayHeaders.forEach(day => {
            const header = document.createElement("div");
            header.textContent = day;
            header.style.cssText = "text-align: center; font-weight: 600; font-size: 0.85rem; padding: 4px;";
            calendarGrid.appendChild(header);
        });
        
        // Add empty cells for days before month starts
        for (let i = 0; i < firstDayOfWeek; i++) {
            const empty = document.createElement("div");
            empty.style.cssText = "padding: 8px; min-height: 32px;";
            calendarGrid.appendChild(empty);
        }
        
        // Add days of month
        const today = new Date();
        const isCurrentMonth = today.getMonth() === currentCalendarMonth && today.getFullYear() === currentCalendarYear;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement("div");
            const date = new Date(currentCalendarYear, currentCalendarMonth, day);
            const dateKey = date.toISOString().split("T")[0];
            
            cell.textContent = day;
            cell.style.cssText = "padding: 8px; min-height: 32px; text-align: center; border-radius: 4px; position: relative;";
            
            // Check if it's today
            if (isCurrentMonth && day === today.getDate()) {
                cell.style.background = "rgba(52, 152, 219, 0.3)";
                cell.style.border = "2px solid #3498db";
            }
            
            // Highlight Thursdays green
            if (date.getDay() === 4) {
                cell.style.background = cell.style.background || "rgba(46, 204, 113, 0.3)";
                cell.style.border = cell.style.border || "1px solid #2ecc71";
            }
            
            // Highlight every 5th Friday red (within 6-week period starting Oct 31)
            if (isEvery5thFriday(date)) {
                cell.style.background = "rgba(231, 76, 60, 0.5)";
                cell.style.border = "2px solid #e74c3c";
                cell.style.fontWeight = "bold";
            }
            
            // Optional: Light background for entire 6-week period
            if (isIn6WeekPeriod(date)) {
                if (!cell.style.background || !cell.style.background.includes("231")) {
                    cell.style.background = cell.style.background || "rgba(255, 255, 255, 0.05)";
                }
            }
            
            // Add event indicators
            const dayEvents = getEventsForDate(date);
            const dayPlans = getPlansForDate(date);
            const dayHoliday = getHolidayString(date);
            
            if (dayHoliday || dayEvents.length > 0 || dayPlans.length > 0) {
                const indicator = document.createElement("div");
                indicator.style.cssText = "position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; background: #f39c12; border-radius: 50%;";
                cell.appendChild(indicator);
            }
            
            calendarGrid.appendChild(cell);
        }
    }

    function changeMonth(delta) {
        currentCalendarMonth += delta;
        if (currentCalendarMonth < 0) {
            currentCalendarMonth = 11;
            currentCalendarYear--;
        } else if (currentCalendarMonth > 11) {
            currentCalendarMonth = 0;
            currentCalendarYear++;
        }
        renderMonthlyCalendar();
    }

    /* Background Animation */
    function lerp(a, b, t) {
        return Math.round(a + (b - a) * t);
    }

    function animateBackgroundStep() {
        if (!endTimestamp) return;
        const remainingMs = Math.max(0, endTimestamp - Date.now());
        if (remainingMs <= 0) {
            stopBackgroundAnimation();
            return;
        }
        const t = Math.min(1, (Date.now() - (endTimestamp - countdownTime)) / countdownTime);
        const r = lerp(52, 231, t);
        const g = lerp(152, 76, t);
        const b = lerp(219, 60, t);
        backgroundLayer.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }

    function startBackgroundAnimation() {
        if (bgTimer) clearInterval(bgTimer);
        bgTimer = setInterval(animateBackgroundStep, 100);
    }

    function stopBackgroundAnimation() {
        if (bgTimer) {
            clearInterval(bgTimer);
            bgTimer = null;
        }
        backgroundLayer.style.backgroundColor = "#2e2e2e";
    }

    /* Audio */
    function playTick(profile, pitch, volume) {
        if (!enableSoundCheckbox.checked || profile === "none") return;
        const actx = ensureAudioContext();
        const now = actx.currentTime;
        const o = actx.createOscillator();
        const g = actx.createGain();
        if (profile === "classic") {
            o.type = "square";
            o.frequency.value = pitch;
        } else if (profile === "vintage") {
            o.type = "sawtooth";
            o.frequency.value = pitch;
        } else {
            o.type = "sine";
            o.frequency.value = pitch;
        }
        g.gain.setValueAtTime(0, now);
        o.connect(g);
        g.connect(actx.destination);
        g.gain.linearRampToValueAtTime(Math.min(0.25, volume), now + 0.005);
        g.gain.linearRampToValueAtTime(0.0001, now + 0.06);
        o.start(now);
        o.stop(now + 0.07);
    }

    function playEndChime() {
        if (!enableSoundCheckbox.checked) return;
        const actx = ensureAudioContext();
        const now = actx.currentTime;
        const freqs = [800, 1000, 1200];
        freqs.forEach((f, i) => {
            const o = actx.createOscillator();
            const g = actx.createGain();
            o.type = "sine";
            o.frequency.value = f;
            g.gain.setValueAtTime(0, now);
            o.connect(g);
            g.connect(actx.destination);
            const start = now + i * 0.18;
            g.gain.linearRampToValueAtTime(0.12, start + 0.02);
            g.gain.linearRampToValueAtTime(0, start + 0.18);
            o.start(start);
            o.stop(start + 0.18);
        });
    }

    /* Background Color */
    function updateBackgroundColor(color) {
        // Convert hex to RGB for gradient
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Create darker variants for gradient
        const r1 = Math.max(0, r - 20);
        const g1 = Math.max(0, g - 20);
        const b1 = Math.max(0, b - 20);
        
        const r2 = Math.max(0, r - 40);
        const g2 = Math.max(0, g - 40);
        const b2 = Math.max(0, b - 40);
        
        const gradient = `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${r1}, ${g1}, ${b1}) 50%, rgb(${r2}, ${g2}, ${b2}) 100%)`;
        document.body.style.background = gradient;
        backgroundLayer.style.background = gradient;
    }

    /* Simple Encryption (XOR cipher for local storage) */
    function simpleEncrypt(text, key = "clockwork2025") {
        if (!text || text.trim() === "") return "";
        try {
            let result = "";
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return btoa(result); // Base64 encode
        } catch (e) {
            console.error("Encryption error:", e);
            return "";
        }
    }

    function simpleDecrypt(encrypted, key = "clockwork2025") {
        if (!encrypted || encrypted.trim() === "") return "";
        try {
            let text = atob(encrypted); // Base64 decode
            let result = "";
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (e) {
            console.error("Decryption error:", e);
            return "";
        }
    }

    /* Usage Statistics */
    function loadStats() {
        const saved = localStorage.getItem("clockStats");
        if (saved) {
            try {
                usageStats = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to load stats:", e);
            }
        }
        updateStatsDisplay();
    }

    function saveStats() {
        localStorage.setItem("clockStats", JSON.stringify(usageStats));
        updateStatsDisplay();
    }

    function updateStatsDisplay() {
        if (!devConsole) return;
        document.getElementById("stat-total").textContent = usageStats.totalCountdowns || 0;
        const hours = ((usageStats.totalTime || 0) / 3600).toFixed(1);
        document.getElementById("stat-time").textContent = hours;
        const mostUsed = Object.keys(usageStats.presetUsage || {}).reduce((a, b) => 
            (usageStats.presetUsage[a] || 0) > (usageStats.presetUsage[b] || 0) ? a : b, "-");
        document.getElementById("stat-preset").textContent = mostUsed === "-" ? "-" : `${mostUsed} min`;
        const last = usageStats.lastActive ? new Date(usageStats.lastActive).toLocaleString() : "Never";
        document.getElementById("stat-last").textContent = last;
    }

    function recordCountdown(duration, preset = null) {
        usageStats.totalCountdowns = (usageStats.totalCountdowns || 0) + 1;
        usageStats.totalTime = (usageStats.totalTime || 0) + duration;
        usageStats.lastActive = new Date().toISOString();
        if (preset) {
            usageStats.presetUsage[preset] = (usageStats.presetUsage[preset] || 0) + 1;
        }
        saveStats();
    }

    /* Settings Persistence */
    function saveSettings() {
        const settings = {
            tickProfile: tickProfileSelect.value,
            tickPitch: tickPitchInput.value,
            tickVolume: tickVolumeInput.value,
            enableSound: enableSoundCheckbox.checked,
            startTickAt: startTickInput.value,
            bgColor: bgColorInput.value,
            stealthMode: stealthModeCheckbox ? stealthModeCheckbox.checked : false,
            secretNote: secretNoteInput && secretNoteInput.value && secretNoteInput.value.trim() 
                ? simpleEncrypt(secretNoteInput.value.trim()) 
                : ""
        };
        localStorage.setItem("clockSettings", JSON.stringify(settings));
    }

    function loadSettings() {
        const saved = localStorage.getItem("clockSettings");
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.tickProfile) tickProfileSelect.value = settings.tickProfile;
                if (settings.tickPitch) {
                    tickPitchInput.value = settings.tickPitch;
                    pitchValue.textContent = settings.tickPitch;
                }
                if (settings.tickVolume) {
                    tickVolumeInput.value = settings.tickVolume;
                    volumeValue.textContent = parseFloat(settings.tickVolume).toFixed(2);
                }
                if (settings.enableSound !== undefined) enableSoundCheckbox.checked = settings.enableSound;
                if (settings.startTickAt) startTickInput.value = settings.startTickAt;
                if (settings.bgColor) {
                    bgColorInput.value = settings.bgColor;
                    updateBackgroundColor(settings.bgColor);
                }
                if (settings.stealthMode !== undefined) {
                    stealthModeCheckbox.checked = settings.stealthMode;
                    toggleStealthMode(settings.stealthMode);
                }
                if (settings.secretNote && secretNoteInput) {
                    try {
                        const decrypted = simpleDecrypt(settings.secretNote);
                        if (decrypted) {
                            secretNoteInput.value = decrypted;
                        }
                    } catch (e) {
                        console.error("Failed to decrypt note:", e);
                    }
                }
            } catch (e) {
                console.error("Failed to load settings:", e);
            }
        }
    }

    /* Stealth Mode */
    function toggleStealthMode(enabled) {
        if (enabled) {
            contentLayer.style.opacity = "0.3";
            contentLayer.style.transition = "opacity 0.3s ease";
            document.body.style.cursor = "none";
        } else {
            contentLayer.style.opacity = "1";
            document.body.style.cursor = "default";
        }
    }

    /* Countdown */
    function updateStartButton() {
        if (isPaused && pausedTime > 0) {
            startBtn.textContent = "Resume Countdown";
        } else {
            startBtn.textContent = "Start Countdown";
        }
    }

    function startCountdown() {
        // If paused, resume instead
        if (isPaused && pausedTime > 0) {
            endTimestamp = Date.now() + pausedTime;
            isPaused = false;
            pausedTime = 0;
            updateStartButton();
            startBackgroundAnimation();
            if (countdownTimer) clearInterval(countdownTimer);
            updateCountdownTick();
            countdownTimer = setInterval(updateCountdownTick, 1000);
            return;
        }

        const h = parseInt(hoursInput.value, 10) || 0;
        const m = parseInt(minutesInput.value, 10) || 0;
        const s = parseInt(secondsInput.value, 10) || 0;
        if (!Number.isInteger(h) || !Number.isInteger(m) || !Number.isInteger(s) ||
            h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return;

        const total = h * 3600 + m * 60 + s;
        if (total <= 0) return;

        ensureAudioContext();
        countdownTime = total * 1000;
        endTimestamp = Date.now() + countdownTime;
        isPaused = false;
        pausedTime = 0;

        // Don't auto-close settings panel - let user close it manually
        // settingsPanel.classList.add("hidden");
        digitalClock.classList.add("small");
        countdownEl.classList.add("large");
        updateStatusIndicator("running");
        updateStartButton();
        startBackgroundAnimation();

        if (countdownTimer) clearInterval(countdownTimer);
        updateCountdownTick();
        countdownTimer = setInterval(updateCountdownTick, 1000);
        
        // Record countdown start
        recordCountdown(total, null);
    }

    function stopCountdown() {
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        // Save remaining time if countdown was running
        if (endTimestamp && !isPaused) {
            const remaining = Math.max(0, endTimestamp - Date.now());
            if (remaining > 0) {
                isPaused = true;
                pausedTime = remaining;
            }
        }
        stopBackgroundAnimation();
        digitalClock.classList.remove("small");
        countdownEl.classList.remove("large");
        countdownEl.classList.remove("pulse");
        updateStatusIndicator(isPaused ? "paused" : "stopped");
        updateStartButton();
    }

    function resetCountdown() {
        stopCountdown();
        endTimestamp = null;
        countdownTime = 0;
        isPaused = false;
        pausedTime = 0;
        countdownEl.textContent = "00:00:00";
        hoursInput.value = "";
        minutesInput.value = "";
        secondsInput.value = "";
        startTickInput.value = "";
        tickProfileSelect.value = "classic";
        tickPitchInput.value = "750";
        pitchValue.textContent = "750";
        tickVolumeInput.value = "0.05";
        volumeValue.textContent = "0.05";
        enableSoundCheckbox.checked = true;
        updateStatusIndicator("stopped");
        updateStartButton();
    }

    function setQuickPreset(minutes) {
        hoursInput.value = "";
        minutesInput.value = minutes;
        secondsInput.value = "";
        startCountdown();
        // Record preset usage
        recordCountdown(minutes * 60, minutes);
    }

    function updateStatusIndicator(status) {
        if (!statusIndicator) return;
        statusIndicator.className = "status-indicator";
        switch (status) {
            case "running":
                statusIndicator.textContent = "● Running";
                statusIndicator.classList.add("running");
                break;
            case "paused":
                statusIndicator.textContent = "⏸ Paused";
                statusIndicator.classList.add("paused");
                break;
            case "stopped":
                statusIndicator.textContent = "";
                statusIndicator.classList.add("stopped");
                break;
            default:
                statusIndicator.textContent = "";
        }
    }

    function updateCountdownTick() {
        if (!endTimestamp) return;
        const remainingMs = Math.max(0, endTimestamp - Date.now());
        const remainingSec = Math.floor(remainingMs / 1000);
        const hh = String(Math.floor(remainingSec / 3600)).padStart(2, "0");
        const mm = String(Math.floor((remainingSec % 3600) / 60)).padStart(2, "0");
        const ss = String(remainingSec % 60).padStart(2, "0");
        countdownEl.textContent = `${hh}:${mm}:${ss}`;

        const startTickAt = parseInt(startTickInput.value, 10) || 0;
        if (!Number.isInteger(startTickAt) || startTickAt < 0) return;

        const tickProfile = tickProfileSelect.value || "classic";
        const tickPitch = parseInt(tickPitchInput.value, 10) || 750;
        const tickVol = parseFloat(tickVolumeInput.value) || 0.05;

        if (remainingSec <= startTickAt && remainingSec > 0) {
            countdownEl.classList.add("pulse");
            setTimeout(() => countdownEl.classList.remove("pulse"), 180);
            playTick(tickProfile, tickPitch, tickVol);
        }

        if (remainingSec <= 0) {
            stopCountdown();
            updateStatusIndicator("stopped");
            playEndChime();
        }
    }

    /* Event Listeners */
    startBtn.addEventListener("click", startCountdown);
    stopBtn.addEventListener("click", stopCountdown);
    resetBtn.addEventListener("click", resetCountdown);

    // Quick preset buttons
    document.querySelectorAll(".preset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const minutes = parseInt(btn.dataset.minutes, 10);
            setQuickPreset(minutes);
        });
    });

    settingsToggle.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent event from bubbling
        const isOpen = !settingsPanel.classList.contains("hidden");
        if (isOpen) {
            // Close settings panel if it's already open
            settingsPanel.classList.add("hidden");
        } else {
            // Open settings panel and close calendar if open
            settingsPanel.classList.remove("hidden");
            calendarPanel.classList.add("hidden");
        }
    });

    // Close settings panel when clicking outside (but not when clicking on settings button or any button inside)
    document.addEventListener("click", (e) => {
        if (!settingsPanel.classList.contains("hidden") && 
            !settingsPanel.contains(e.target) && 
            !settingsToggle.contains(e.target) &&
            !e.target.closest(".floating-panel")) {
            settingsPanel.classList.add("hidden");
        }
    });

    calendarToggle.addEventListener("click", () => {
        calendarPanel.classList.toggle("hidden");
        monthlyCalendarPanel.classList.toggle("hidden");
        if (!calendarPanel.classList.contains("hidden")) {
            settingsPanel.classList.add("hidden");
            updateCalendarPanel();
        }
        if (!monthlyCalendarPanel.classList.contains("hidden")) {
            settingsPanel.classList.add("hidden");
            renderMonthlyCalendar();
        }
    });

    prevMonthBtn.addEventListener("click", () => changeMonth(-1));
    nextMonthBtn.addEventListener("click", () => changeMonth(1));

    tickPitchInput.addEventListener("input", () => {
        pitchValue.textContent = tickPitchInput.value;
    });

    tickVolumeInput.addEventListener("input", () => {
        volumeValue.textContent = parseFloat(tickVolumeInput.value).toFixed(2);
        saveSettings();
    });

    // Background color picker
    bgColorInput.addEventListener("input", (e) => {
        updateBackgroundColor(e.target.value);
        saveSettings();
    });

    // Secret note encryption
    if (secretNoteInput) {
        secretNoteInput.addEventListener("input", () => {
            // Debounce to avoid too many saves
            clearTimeout(secretNoteInput.saveTimeout);
            secretNoteInput.saveTimeout = setTimeout(saveSettings, 500);
        });
        secretNoteInput.addEventListener("blur", saveSettings); // Save on focus loss
    } else {
        console.error("Secret note input element not found in DOM");
    }

    // Stealth mode
    stealthModeCheckbox.addEventListener("change", (e) => {
        toggleStealthMode(e.target.checked);
        saveSettings();
    });

    // Developer console
    toggleDevConsoleBtn.addEventListener("click", () => {
        devConsole.classList.toggle("hidden");
        if (!devConsole.classList.contains("hidden")) {
            updateStatsDisplay();
        }
    });

    // Export data
    exportDataBtn.addEventListener("click", () => {
        const data = {
            settings: JSON.parse(localStorage.getItem("clockSettings") || "{}"),
            stats: JSON.parse(localStorage.getItem("clockStats") || "{}"),
            position: JSON.parse(localStorage.getItem("clockPosition") || "{}")
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clockwork-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import data
    importDataBtn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (data.settings) localStorage.setItem("clockSettings", JSON.stringify(data.settings));
                        if (data.stats) localStorage.setItem("clockStats", JSON.stringify(data.stats));
                        if (data.position) localStorage.setItem("clockPosition", JSON.stringify(data.position));
                        location.reload(); // Reload to apply changes
                    } catch (err) {
                        alert("Failed to import data: " + err.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    });

    // Clear stats
    clearStatsBtn.addEventListener("click", () => {
        if (confirm("Clear all usage statistics? This cannot be undone.")) {
            usageStats = { totalCountdowns: 0, totalTime: 0, presetUsage: {}, lastActive: null };
            localStorage.removeItem("clockStats");
            updateStatsDisplay();
        }
    });

    // Export JSON data
    exportJSONBtn.addEventListener("click", () => {
        exportJSONData();
    });

    // Import JSON data
    importJSONBtn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await importJSONData(file);
                    updateCalendarPanel();
                    alert("JSON data imported successfully!");
                } catch (err) {
                    alert("Failed to import JSON data: " + err.message);
                }
            }
        };
        input.click();
    });

    // Reload JSON data
    reloadJSONBtn.addEventListener("click", async () => {
        try {
            await loadJSONData();
            updateCalendarPanel();
            alert("JSON data reloaded successfully!");
        } catch (err) {
            alert("Failed to reload JSON data: " + err.message);
        }
    });

    // Color preset buttons
    document.querySelectorAll(".color-preset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const color = btn.dataset.color;
            bgColorInput.value = color;
            updateBackgroundColor(color);
            saveSettings();
        });
    });

    // Save settings when changed
    tickProfileSelect.addEventListener("change", saveSettings);
    tickPitchInput.addEventListener("input", saveSettings);
    enableSoundCheckbox.addEventListener("change", saveSettings);
    startTickInput.addEventListener("input", saveSettings);

    [hoursInput, minutesInput, secondsInput].forEach(inp => {
        inp.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") startCountdown();
        });
    });

    /* Keyboard Shortcuts */
    let devModeKeySequence = [];
    document.addEventListener("keydown", (ev) => {
        // ESC to close panels
        if (ev.key === "Escape") {
            settingsPanel.classList.add("hidden");
            calendarPanel.classList.add("hidden");
            monthlyCalendarPanel.classList.add("hidden");
            devConsole.classList.add("hidden");
        }
        // Space to start/stop countdown (only if not typing in input)
        if (ev.key === " " && !["INPUT", "TEXTAREA", "SELECT"].includes(ev.target.tagName)) {
            ev.preventDefault();
            if (countdownTimer) {
                stopCountdown();
            } else if (isPaused && pausedTime > 0) {
                startCountdown(); // Resume
            } else {
                startCountdown(); // Start new
            }
        }
        // Hidden dev mode activation: Ctrl+Shift+D
        if (ev.ctrlKey && ev.shiftKey && ev.key === "D") {
            ev.preventDefault();
            document.getElementById("dev-mode-row").style.display = "block";
            devConsole.classList.remove("hidden");
            updateStatsDisplay();
        }
    });

    /* Dragging Functionality */
    function loadPosition() {
        const saved = localStorage.getItem("clockPosition");
        if (saved) {
            try {
                const pos = JSON.parse(saved);
                contentLayer.style.left = pos.x + "px";
                contentLayer.style.top = pos.y + "px";
                contentLayer.style.transform = "translate(-50%, -50%)";
            } catch (e) {
                console.error("Failed to load position:", e);
            }
        }
    }

    function savePosition() {
        const rect = contentLayer.getBoundingClientRect();
        const pos = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        localStorage.setItem("clockPosition", JSON.stringify(pos));
    }

    function startDrag(e) {
        // Don't start drag if clicking on interactive elements
        const target = e.target;
        const isInteractive = target.tagName === "BUTTON" || 
                              target.tagName === "INPUT" || 
                              target.tagName === "SELECT" ||
                              target.tagName === "CANVAS" ||
                              target.closest("button") ||
                              target.closest("input") ||
                              target.closest("select") ||
                              target.closest(".preset-btn") ||
                              target.closest(".btn") ||
                              target.closest(".controls");
        
        if (isInteractive) {
            return;
        }

        isDragging = true;
        contentLayer.classList.add("dragging");
        
        const rect = contentLayer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        dragOffset.x = clientX - (rect.left + rect.width / 2);
        dragOffset.y = clientY - (rect.top + rect.height / 2);

        e.preventDefault();
    }

    function drag(e) {
        if (!isDragging) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        let newX = clientX - dragOffset.x;
        let newY = clientY - dragOffset.y;

        // Constrain to viewport bounds
        const rect = contentLayer.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;
        const maxX = window.innerWidth - halfWidth;
        const maxY = window.innerHeight - halfHeight;
        const minX = halfWidth;
        const minY = halfHeight;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        contentLayer.style.left = newX + "px";
        contentLayer.style.top = newY + "px";
        contentLayer.style.transform = "translate(-50%, -50%)";

        e.preventDefault();
    }

    function constrainToViewport() {
        const rect = contentLayer.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;
        let left = parseFloat(contentLayer.style.left) || window.innerWidth / 2;
        let top = parseFloat(contentLayer.style.top) || window.innerHeight / 2;

        const maxX = window.innerWidth - halfWidth;
        const maxY = window.innerHeight - halfHeight;
        const minX = halfWidth;
        const minY = halfHeight;

        left = Math.max(minX, Math.min(maxX, left));
        top = Math.max(minY, Math.min(maxY, top));

        contentLayer.style.left = left + "px";
        contentLayer.style.top = top + "px";
        contentLayer.style.transform = "translate(-50%, -50%)";
        savePosition();
    }

    function endDrag(e) {
        if (!isDragging) return;
        
        isDragging = false;
        contentLayer.classList.remove("dragging");
        savePosition();
        
        e.preventDefault();
    }

    // Mouse events for main content
    contentLayer.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", endDrag);

    // Touch events for main content
    contentLayer.addEventListener("touchstart", startDrag, { passive: false });
    document.addEventListener("touchmove", drag, { passive: false });
    document.addEventListener("touchend", endDrag);

    /* Monthly Calendar Dragging */
    let isCalendarDragging = false;
    let calendarDragOffset = { x: 0, y: 0 };

    function startCalendarDrag(e) {
        const target = e.target;
        if (target.tagName === "BUTTON" || target.closest("button")) {
            return;
        }

        isCalendarDragging = true;
        monthlyCalendarPanel.classList.add("dragging");
        
        const rect = monthlyCalendarPanel.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        calendarDragOffset.x = clientX - (rect.left + rect.width / 2);
        calendarDragOffset.y = clientY - (rect.top + rect.height / 2);

        e.preventDefault();
    }

    function dragCalendar(e) {
        if (!isCalendarDragging) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        let newX = clientX - calendarDragOffset.x;
        let newY = clientY - calendarDragOffset.y;

        const rect = monthlyCalendarPanel.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;
        const maxX = window.innerWidth - halfWidth;
        const maxY = window.innerHeight - halfHeight;
        const minX = halfWidth;
        const minY = halfHeight;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        monthlyCalendarPanel.style.left = newX + "px";
        monthlyCalendarPanel.style.top = newY + "px";
        monthlyCalendarPanel.style.transform = "translate(-50%, -50%)";

        e.preventDefault();
    }

    function endCalendarDrag(e) {
        if (!isCalendarDragging) return;
        
        isCalendarDragging = false;
        monthlyCalendarPanel.classList.remove("dragging");
        
        e.preventDefault();
    }

    // Calendar dragging events
    monthlyCalendarPanel.addEventListener("mousedown", startCalendarDrag);
    document.addEventListener("mousemove", dragCalendar);
    document.addEventListener("mouseup", endCalendarDrag);
    monthlyCalendarPanel.addEventListener("touchstart", startCalendarDrag, { passive: false });
    document.addEventListener("touchmove", dragCalendar, { passive: false });
    document.addEventListener("touchend", endCalendarDrag);

    // Handle window resize
    let resizeTimeout;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(constrainToViewport, 100);
    });

    /* Initialize */
    async function initialize() {
        loadSettings();
        loadStats();
        loadPosition();
        await loadJSONData(); // Load JSON data
        updateStatusIndicator("stopped");
    drawAnalogClock();
    updateDigitalClock();
    updateCalendarPanel();
        renderMonthlyCalendar(); // Initial render
    setInterval(() => {
        drawAnalogClock();
        updateDigitalClock();
        updateCalendarPanel();
    }, 1000);
        
        // Also update monthly calendar periodically
        setInterval(() => {
            if (!monthlyCalendarPanel.classList.contains("hidden")) {
                renderMonthlyCalendar();
            }
        }, 60000); // Every minute
    }
    
    initialize();
});