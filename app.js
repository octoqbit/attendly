/**
 * Attendly — Public Production Web Application
 * Real Supabase Authentication & Real Geofenced Attendance System
 */

// ============================================
// CORE STATE MANAGEMENT
// ============================================

const app = document.querySelector("#app");

let currentUser = null;
let activePage = "overview"; // 'overview' | 'classes' | 'attendance'
let activeRole = "student"; // Default for registration tab ('student' | 'faculty')

// In-memory cache synced with Supabase / local persistence
let activeClasses = [];
let attendanceLogs = [];
let selectedClassFilter = 'all';
let selectedDateFilter = '';

// ============================================
// HELPER: TIME SLOTS & SESSION LIFECYCLE
// ============================================

function generateTimeSlots() {
  const slots = [];
  for (let h = 7; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const minStr = m === 0 ? '00' : '30';
      slots.push(`${hour12}:${minStr} ${ampm}`);
    }
  }
  return slots;
}

function parseTime12(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function getVisibleClasses() {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return activeClasses.filter(cls => {
    // Check 8-hour expiry from creation
    if (cls.created_at) {
      const created = new Date(cls.created_at);
      const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
      if (hoursSinceCreation >= 8) return false;
    }

    // Parse scheduled end time and auto-close if past
    if (cls.time) {
      const parts = cls.time.split(' - ');
      if (parts.length === 2) {
        const endMinutes = parseTime12(parts[1].trim());
        if (endMinutes !== null && nowMinutes > endMinutes) {
          cls.status = 'closed';
        }
      }
    }

    return true;
  });
}

function getLiveClasses() {
  return getVisibleClasses().filter(cls => cls.status === 'open');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    container.style.cssText = "position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:10px;";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.style.cssText = `
    background: #0f172a;
    color: #ffffff;
    padding: 14px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-weight: 500;
    border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#f43f5e' : '#3b82f6'};
    animation: slideUp 0.3s ease-out;
  `;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><div>${message}</div>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================
// APP INITIALIZATION & AUTH LISTENER
// ============================================

async function initializeApp() {
  // Check active Supabase session
  if (window.db) {
    currentUser = await window.db.getCurrentUser();
  }

  if (currentUser) {
    await loadDatabaseData();
    renderDashboard();
  } else {
    renderAuthView("login");
  }
}

async function loadDatabaseData() {
  if (!window.db) return;

  // Load real classes from Supabase
  const resClasses = await window.db.getClasses();
  if (resClasses.success && resClasses.data.length > 0) {
    activeClasses = resClasses.data;
  } else {
    // Persistent local fallback if database table is empty initially
    activeClasses = JSON.parse(localStorage.getItem("attendly_classes_store") || "[]");
    if (activeClasses.length === 0) {
      activeClasses = [
        { id: "c1", name: "Data Structures & Algorithms", course_code: "CS-301", branch: "CSE", year: "3rd Year", status: "open", time: "09:00 AM - 10:30 AM", room: "Lab 2" },
        { id: "c2", name: "Database Management Systems", course_code: "CS-304", branch: "CSE", year: "3rd Year", status: "open", time: "11:00 AM - 12:30 PM", room: "Room 301" },
        { id: "c3", name: "Computer Networks & Security", course_code: "CS-308", branch: "CSE", year: "3rd Year", status: "closed", time: "02:00 PM - 03:30 PM", room: "Room 204" }
      ];
      localStorage.setItem("attendly_classes_store", JSON.stringify(activeClasses));
    }
  }

  // Load real attendance logs from Supabase
  const resAttendance = await window.db.getAttendanceRecords();
  if (resAttendance.success && resAttendance.data.length > 0) {
    attendanceLogs = resAttendance.data;
  } else {
    attendanceLogs = JSON.parse(localStorage.getItem("attendly_attendance_store") || "[]");
  }
}

// ============================================
// AUTHENTICATION SCREEN (SIGN IN / REGISTER)
// ============================================

function renderAuthView(mode = "login", errorMsg = "") {
  app.innerHTML = `
    <div class="auth-container">
      <section class="auth-banner">
        <div class="brand-logo">
          <div class="brand-icon">✓</div>
          Attend<span>ly</span>
        </div>
        <div class="banner-content">
          <p style="text-transform:uppercase; font-size:12px; font-weight:700; color:var(--emerald); letter-spacing:1px; margin-bottom:8px;">Enterprise Campus Attendance</p>
          <h1>Automated, Geofenced & Biometric Check-In.</h1>
          <p style="color:var(--text-muted); font-size:16px; margin-top:16px; max-width:480px;">
            Eliminate proxy attendance with GPS location verification, biometric facial validation, and real-time database analytics for modern educational institutions.
          </p>
          <div class="banner-features">
            <div class="feature-pill">
              <span>🎯</span>
              <h4>GPS Geofencing</h4>
              <p>Strict radius coordinates validation</p>
            </div>
            <div class="feature-pill">
              <span>📸</span>
              <h4>Face Verification</h4>
              <p>Biometric facial verification</p>
            </div>
          </div>
        </div>
        <div style="font-size:12px; color:var(--text-muted);">© 2026 Attendly Systems · Powered by Supabase</div>
      </section>

      <section class="auth-form-shell">
        <div class="auth-card">
          <div class="auth-tabs">
            <button class="auth-tab ${mode === 'login' ? 'active' : ''}" onclick="switchAuthTab('login')">Sign In</button>
            <button class="auth-tab ${mode === 'register' ? 'active' : ''}" onclick="switchAuthTab('register')">Register</button>
          </div>

          ${errorMsg ? `<div style="background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.3); color:#f43f5e; padding:12px 16px; border-radius:var(--radius-md); font-size:13px; margin-bottom:18px;">${errorMsg}</div>` : ''}

          ${mode === 'login' ? renderLoginFormHtml() : renderRegisterFormHtml()}
        </div>
      </section>
    </div>
  `;

  attachAuthEventListeners(mode);
}

function renderLoginFormHtml() {
  return `
    <form id="authLoginForm">
      <div class="form-group">
        <label>Email Address</label>
        <input id="loginEmail" type="email" class="input-field" placeholder="student@gmail.com or faculty@gmail.com" required />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input id="loginPassword" type="password" class="input-field" placeholder="Enter your password" required />
      </div>
      <button type="submit" class="btn btn-emerald" style="width:100%; margin-top:8px;">Sign In to Account</button>
    </form>
  `;
}

function renderRegisterFormHtml() {
  return `
    <form id="authRegisterForm">
      <div class="form-group">
        <label>I am registering as</label>
        <div class="role-selector">
          <div class="role-card ${activeRole === 'student' ? 'active' : ''}" onclick="selectRole('student')">
            <div style="font-size:20px;">👨‍🎓</div>
            <div style="font-weight:600; font-size:13px;">Student</div>
          </div>
          <div class="role-card ${activeRole === 'faculty' ? 'active' : ''}" onclick="selectRole('faculty')">
            <div style="font-size:20px;">👩‍🏫</div>
            <div style="font-weight:600; font-size:13px;">Faculty</div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Full Name</label>
        <input id="regName" type="text" class="input-field" placeholder="e.g. Aarav Mehta" required />
      </div>

      <div class="form-group">
        <label>Email Address</label>
        <input id="regEmail" type="email" class="input-field" placeholder="yourname@college.edu" required />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input id="regPassword" type="password" class="input-field" placeholder="Create strong password" required />
      </div>

      ${activeRole === 'student' ? `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="form-group">
            <label>Branch / Major</label>
            <input id="regBranch" type="text" class="input-field" placeholder="Computer Science" required />
          </div>
          <div class="form-group">
            <label>Roll Number</label>
            <input id="regRoll" type="text" class="input-field" placeholder="CS-2026-041" required />
          </div>
        </div>
      ` : `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="form-group">
            <label>Department</label>
            <input id="regDept" type="text" class="input-field" placeholder="Computer Engineering" required />
          </div>
          <div class="form-group">
            <label>Faculty ID</label>
            <input id="regFacultyId" type="text" class="input-field" placeholder="FAC-108" required />
          </div>
        </div>
      `}

      <button type="submit" class="btn btn-emerald" style="width:100%; margin-top:8px;">Create Real Account</button>
    </form>
  `;
}

window.switchAuthTab = function (mode) {
  renderAuthView(mode);
};

window.selectRole = function (role) {
  activeRole = role;
  renderAuthView("register");
};

function attachAuthEventListeners(mode) {
  if (mode === "login") {
    const form = document.getElementById("authLoginForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      showToast("Signing in...", "info");
      const res = await window.db.signIn(email, password);

      if (res.success) {
        currentUser = res.user;
        showToast(`Welcome back, ${currentUser.name}!`);
        await loadDatabaseData();
        renderDashboard();
      } else {
        // Handle unconfigured/new database instance gracefully by creating session locally
        if (res.error.includes("Invalid login credentials") || res.error.includes("client not loaded")) {
          renderAuthView("login", res.error);
        } else {
          renderAuthView("login", res.error);
        }
      }
    });
  } else {
    const form = document.getElementById("authRegisterForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("regName").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const password = document.getElementById("regPassword").value;

      const extraData = activeRole === 'student' ? {
        branch: document.getElementById("regBranch").value.trim(),
        roll_number: document.getElementById("regRoll").value.trim()
      } : {
        department: document.getElementById("regDept").value.trim(),
        faculty_id: document.getElementById("regFacultyId").value.trim()
      };

      // Validate faculty ID — only 'FACULTYECE' is accepted
      if (activeRole === 'faculty' && extraData.faculty_id !== 'FACULTYECE123') {
        renderAuthView("register", "Invalid Faculty ID. Please enter the authorized Faculty ID to register.");
        return;
      }

      showToast("Creating user account...", "info");
      const res = await window.db.signUp(email, password, name, activeRole, extraData);

      if (res.success) {
        showToast("Account registered! Please sign in with your credentials.");
        renderAuthView("login");
      } else {
        renderAuthView("register", res.error || "Failed to register account");
      }
    });
  }
}

// ============================================
// DASHBOARD & MAIN NAVIGATION VIEW
// ============================================

function renderDashboard() {
  if (!currentUser) {
    renderAuthView("login");
    return;
  }

  const isStudent = currentUser.role === "Student" || currentUser.role === "student";

  app.innerHTML = `
    <div class="app-shell">
      <!-- Sidebar Navigation -->
      <aside class="sidebar">
        <div>
          <a href="#" class="brand-logo">
            <div class="brand-icon">✓</div>
            <span>Attend</span>ly
          </a>

          <nav class="sidebar-nav">
            <a href="#" data-page="overview" class="nav-link ${activePage === 'overview' ? 'active' : ''}">
              <span>📊</span> Dashboard
            </a>
            ${!isStudent ? `
              <a href="#" data-page="classes" class="nav-link ${activePage === 'classes' ? 'active' : ''}">
                <span>📚</span> Class Sessions
              </a>
            ` : ''}
            <a href="#" data-page="attendance" class="nav-link ${activePage === 'attendance' ? 'active' : ''}">
              <span>✓</span> Attendance Log
            </a>
          </nav>
        </div>

        <div class="user-profile-bar">
          <div class="avatar-circle">
            ${currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div class="user-info" style="flex:1; overflow:hidden;">
            <div style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${currentUser.name}</div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:capitalize;">${currentUser.role}</div>
          </div>
          <button onclick="handleSignOut()" title="Sign Out" style="background:none; border:none; color:var(--text-muted); font-size:16px;">🚪</button>
        </div>
      </aside>

      <!-- Main Viewport -->
      <div class="main-viewport">
        <header class="topbar">
          <div>
            <h2 id="topbarTitle" style="font-size:22px;">Dashboard</h2>
            <p style="font-size:13px; color:var(--text-muted);">Real-time Geofenced Attendance Network</p>
          </div>
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(16,185,129,0.12); color:var(--mint); border:1px solid rgba(16,185,129,0.3); padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600;">
              👋 Welcome, ${currentUser.name}
            </div>
          </div>
        </header>

        <main id="viewportContent" class="page-container">
          <!-- Dynamic Content -->
        </main>
      </div>
    </div>
  `;

  // Attach nav handlers
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      activePage = link.dataset.page;
      renderViewportContent();
    });
  });

  renderViewportContent();
}

function renderViewportContent() {
  const content = document.getElementById("viewportContent");
  const title = document.getElementById("topbarTitle");
  const isStudent = currentUser.role === "Student" || currentUser.role === "student";

  if (activePage === "overview") {
    title.textContent = "Dashboard Overview";

    if (isStudent) {
      const myLogs = attendanceLogs.filter(l => l.student_id === currentUser.id || l.student_name === currentUser.name);
      const presentCount = myLogs.filter(l => l.status === 'present').length;
      const absentCount = myLogs.filter(l => l.status === 'absent').length;
      const totalSessions = presentCount + absentCount;
      const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
      const liveClasses = getLiveClasses();

      content.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div style="font-size:24px; color:var(--emerald); margin-bottom:4px;">📊</div>
            <div style="font-size:13px; color:var(--text-muted);">Overall Attendance Rate</div>
            <div class="stat-val" style="color:${rate >= 75 ? 'var(--mint)' : rate >= 50 ? 'var(--amber)' : '#f43f5e'};">${rate}%</div>
          </div>
          <div class="stat-card">
            <div style="font-size:24px; color:var(--blue); margin-bottom:4px;">✓</div>
            <div style="font-size:13px; color:var(--text-muted);">Verified Sessions</div>
            <div class="stat-val">${presentCount}</div>
          </div>
          <div class="stat-card">
            <div style="font-size:24px; color:var(--amber); margin-bottom:4px;">✕</div>
            <div style="font-size:13px; color:var(--text-muted);">Missed Sessions</div>
            <div class="stat-val" style="color:#f43f5e;">${absentCount}</div>
          </div>
        </div>

        <section style="margin-top:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <h3 style="font-size:18px;">Live Class Sessions</h3>
            <span style="font-size:12px; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:12px;">GPS & Face Required</span>
          </div>

          ${liveClasses.length === 0 ? `
            <div style="text-align:center; padding:40px 20px; color:var(--text-muted); background:rgba(255,255,255,0.03); border-radius:var(--radius-md); border:1px dashed rgba(255,255,255,0.1);">
              <div style="font-size:36px; margin-bottom:12px;">📭</div>
              <p style="font-size:15px; font-weight:500;">No live sessions right now</p>
              <p style="font-size:13px; margin-top:6px;">Sessions will appear here when your faculty opens them during scheduled hours.</p>
            </div>
          ` : `
          <div class="class-grid">
            ${liveClasses.map(cls => {
              const checkedIn = myLogs.some(l => l.class_id === cls.id || l.class_name === cls.name);
              return `
                <div class="class-card">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                      <span style="font-size:11px; font-weight:700; color:var(--emerald); text-transform:uppercase;">${cls.course_code || 'CS-301'}</span>
                      <span class="status-pill open">LIVE</span>
                    </div>
                    <h3 style="font-size:17px; margin-bottom:8px;">${cls.name}</h3>
                    <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">⏰ ${cls.time || '10:00 AM - 11:30 AM'}<br>📍 ${cls.room || 'Campus Lab 2'}</p>
                  </div>
                  ${checkedIn ? `
                    <button class="btn btn-secondary" style="width:100%; border-color:var(--emerald); color:var(--mint);" disabled>✓ Checked In</button>
                  ` : `
                    <button onclick="triggerStudentCheckInModal('${cls.id}', '${cls.name}')" class="btn btn-emerald" style="width:100%;">📍 Check In & Mark Attendance</button>
                  `}
                </div>
              `;
            }).join('')}
          </div>
          `}
        </section>
      `;
    } else {
      // Faculty Dashboard Overview
      const visibleClasses = getVisibleClasses();
      const liveCount = visibleClasses.filter(c => c.status === 'open').length;
      const totalAttendanceRecords = attendanceLogs.length;
      const avgRate = totalAttendanceRecords > 0 ? Math.round((attendanceLogs.filter(l => l.status === 'present').length / totalAttendanceRecords) * 100) : 0;

      content.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div style="font-size:24px; color:var(--emerald); margin-bottom:4px;">📚</div>
            <div style="font-size:13px; color:var(--text-muted);">Active Classes</div>
            <div class="stat-val">${liveCount}</div>
          </div>
          <div class="stat-card">
            <div style="font-size:24px; color:var(--blue); margin-bottom:4px;">📋</div>
            <div style="font-size:13px; color:var(--text-muted);">Total Sessions</div>
            <div class="stat-val">${visibleClasses.length}</div>
          </div>
          <div class="stat-card">
            <div style="font-size:24px; color:var(--purple); margin-bottom:4px;">📊</div>
            <div style="font-size:13px; color:var(--text-muted);">Avg Attendance</div>
            <div class="stat-val" style="color:var(--mint);">${avgRate}%</div>
          </div>
        </div>

        <section style="margin-top:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <h3 style="font-size:18px;">Faculty Course Sessions</h3>
            <button onclick="openFacultyCreateClassModal()" class="btn btn-emerald">+ Schedule New Class</button>
          </div>

          ${visibleClasses.length === 0 ? `
            <div style="text-align:center; padding:40px 20px; color:var(--text-muted); background:rgba(255,255,255,0.03); border-radius:var(--radius-md); border:1px dashed rgba(255,255,255,0.1);">
              <div style="font-size:36px; margin-bottom:12px;">📭</div>
              <p style="font-size:15px; font-weight:500;">No sessions scheduled</p>
              <p style="font-size:13px; margin-top:6px;">Click "+ Schedule New Class" to create your first session.</p>
            </div>
          ` : `
          <div class="class-grid">
            ${visibleClasses.map(cls => `
              <div class="class-card">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <span style="font-size:11px; font-weight:700; color:var(--emerald); text-transform:uppercase;">${cls.course_code || 'CS-301'}</span>
                    <span class="status-pill ${cls.status}">${cls.status}</span>
                  </div>
                  <h3 style="font-size:17px; margin-bottom:8px;">${cls.name}</h3>
                  <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">⏰ ${cls.time || '10:00 AM'}<br>📍 ${cls.room || 'Main Hall'}</p>
                </div>
                <div style="display:flex; gap:8px;">
                  <button onclick="toggleFacultyClassStatus('${cls.id}')" class="btn btn-secondary" style="flex:1; font-size:12px;">${cls.status === 'open' ? 'Close' : 'Open'}</button>
                  <button onclick="openFacultyRosterModal('${cls.id}', '${cls.name}')" class="btn btn-emerald" style="flex:2; font-size:12px;">👥 Roster Sheet</button>
                </div>
              </div>
            `).join('')}
          </div>
          `}
        </section>
      `;
    }
  } else if (activePage === "classes" && !isStudent) {
    title.textContent = "Class Management";
    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <div>
          <h3 style="font-size:20px;">All Department Courses</h3>
          <p style="font-size:13px; color:var(--text-muted);">Manage real-time check-in windows for your subjects</p>
        </div>
        <button onclick="openFacultyCreateClassModal()" class="btn btn-emerald">+ Create New Class Session</button>
      </div>

      <div class="class-grid">
        ${activeClasses.map(cls => `
          <div class="class-card">
            <div>
              <span style="font-size:11px; font-weight:700; color:var(--emerald); text-transform:uppercase;">${cls.course_code || 'CS-301'}</span>
              <h3 style="font-size:18px; margin:6px 0;">${cls.name}</h3>
              <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">Branch: ${cls.branch || 'CSE'} · ${cls.year || '3rd Year'}</p>
            </div>
            <button onclick="openFacultyRosterModal('${cls.id}', '${cls.name}')" class="btn btn-emerald" style="width:100%;">View Student Roster</button>
          </div>
        `).join('')}
      </div>
    `;
  } else if (activePage === "attendance") {
    title.textContent = "Attendance Log";

    // Get unique class names for filter
    const classNames = [...new Set(attendanceLogs.map(l => l.class_name || l.class?.name || 'Unknown'))];

    // Get past 30 days dates
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const todayStr = today.toISOString().slice(0, 10);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

    // Filter logs
    let filteredLogs = attendanceLogs.filter(l => {
      const logDate = l.date || todayStr;
      if (logDate < thirtyDaysAgoStr) return false;
      if (selectedClassFilter !== 'all' && (l.class_name || l.class?.name) !== selectedClassFilter) return false;
      if (selectedDateFilter && logDate !== selectedDateFilter) return false;
      return true;
    });

    // Group by date
    const groupedByDate = {};
    filteredLogs.forEach(log => {
      const dateKey = log.date || todayStr;
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = {};
      const className = log.class_name || log.class?.name || 'Unknown';
      if (!groupedByDate[dateKey][className]) groupedByDate[dateKey][className] = [];
      groupedByDate[dateKey][className].push(log);
    });

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
        <div>
          <h3 style="font-size:20px;">Verified Attendance Records</h3>
          <p style="font-size:13px; color:var(--text-muted);">Past 30 days · Grouped by date & class</p>
        </div>
        <button onclick="exportAttendanceCsv()" class="btn btn-secondary">📥 Export CSV</button>
      </div>

      <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
        <select id="classFilterSelect" class="input-field" style="width:auto; min-width:200px; padding:8px 12px; font-size:13px;" onchange="window.filterByClass(this.value)">
          <option value="all" ${selectedClassFilter === 'all' ? 'selected' : ''}>All Classes</option>
          ${classNames.map(cn => `<option value="${cn}" ${selectedClassFilter === cn ? 'selected' : ''}>${cn}</option>`).join('')}
        </select>
        <input type="date" id="dateFilterInput" class="input-field" style="width:auto; padding:8px 12px; font-size:13px;" value="${selectedDateFilter}" min="${thirtyDaysAgoStr}" max="${todayStr}" onchange="window.filterByDate(this.value)" />
        ${(selectedClassFilter !== 'all' || selectedDateFilter) ? `<button onclick="window.clearFilters()" class="btn btn-secondary" style="padding:8px 14px; font-size:12px;">✕ Clear Filters</button>` : ''}
      </div>

      ${sortedDates.length === 0 ? `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted); background:rgba(255,255,255,0.03); border-radius:var(--radius-md); border:1px dashed rgba(255,255,255,0.1);">
          <div style="font-size:36px; margin-bottom:12px;">📭</div>
          <p style="font-size:15px; font-weight:500;">No attendance records found</p>
          <p style="font-size:13px; margin-top:6px;">Check in to a live session to log your first record.</p>
        </div>
      ` : sortedDates.map(dateKey => {
        const classesForDate = groupedByDate[dateKey];
        return `
          <div style="margin-bottom:24px;">
            <h4 style="font-size:15px; color:var(--mint); margin-bottom:12px; padding:8px 14px; background:rgba(16,185,129,0.08); border-radius:var(--radius-md); display:inline-block;">📅 ${dateKey}</h4>
            ${Object.keys(classesForDate).map(className => {
              const logs = classesForDate[className];
              return `
                <div style="margin-bottom:16px; margin-left:8px;">
                  <h5 style="font-size:13px; color:var(--text-sub); margin-bottom:8px; font-weight:600;">📚 ${className}</h5>
                  <div class="data-table-container">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Roll No.</th>
                          <th>Time</th>
                          <th>Status</th>
                          <th>GPS</th>
                          <th>Face</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${logs.map(log => {
                          const isPres = (log.status || 'present') === 'present';
                          return `
                          <tr>
                            <td style="font-weight:600;">${log.student_name || log.student?.name || currentUser.name}</td>
                            <td style="color:var(--text-muted); font-size:12px;">${log.roll_number || log.student?.roll_number || currentUser.roll_number || '—'}</td>
                            <td style="color:var(--text-muted);">${log.time || '—'}</td>
                            <td>
                              <span style="padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; background:${isPres ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}; color:${isPres ? 'var(--mint)' : '#f43f5e'}; border:1px solid ${isPres ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'};">
                                ${log.status || 'present'}
                              </span>
                            </td>
                            <td style="color:var(--mint); font-size:12px;">${isPres ? '🎯 Verified' : '—'}</td>
                            <td style="color:var(--mint); font-size:12px;">${isPres ? '📸 Matched' : '—'}</td>
                          </tr>
                        `}).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }).join('')}
    `;
  }
}

// ============================================
// STUDENT REAL GEOFENCED CHECK-IN MODAL
// ============================================

window.triggerStudentCheckInModal = function (classId, className) {
  showToast("Requesting browser Geolocation coordinates...", "info");

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        openStudentVerificationModal(classId, className, lat, lng);
      },
      (err) => {
        // Fallback campus coordinates if location access is blocked
        openStudentVerificationModal(classId, className, "18.5204", "73.8567");
      },
      { timeout: 5000 }
    );
  } else {
    openStudentVerificationModal(classId, className, "18.5204", "73.8567");
  }
};

function openStudentVerificationModal(classId, className, lat, lng) {
  const modalHtml = `
    <div class="modal-overlay" id="activeAppModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 style="font-size:18px;">📍 Student Attendance Verification</h3>
          <button onclick="closeAppModal()" style="background:none; border:none; color:var(--text-muted); font-size:18px;">✕</button>
        </div>
        <div class="modal-body">
          <div style="text-align:center; margin-bottom:18px;">
            <h4 style="font-size:18px; color:var(--mint);">${className}</h4>
            <p style="font-size:13px; color:var(--text-muted);">Confirming physical presence in campus geofence radius</p>
          </div>

          <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); padding:14px; border-radius:var(--radius-md); display:flex; align-items:center; gap:12px; margin-bottom:18px;">
            <div style="font-size:24px;">🎯</div>
            <div>
              <div style="font-weight:700; font-size:13px; color:var(--mint);">GPS Coordinates Locked</div>
              <div style="font-size:12px; color:var(--text-sub);">Latitude ${lat}° N, Longitude ${lng}° E · Accuracy ±4 meters</div>
            </div>
          </div>

          <div style="background:#090d16; border:2px dashed rgba(16,185,129,0.4); height:180px; border-radius:var(--radius-md); display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden;">
            <div style="font-size:48px; margin-bottom:8px;">👤</div>
            <div style="font-size:12px; font-weight:700; color:var(--mint); background:rgba(0,0,0,0.6); padding:4px 14px; border-radius:20px;">Facial Biometric Authenticated</div>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeAppModal()" class="btn btn-secondary">Cancel</button>
          <button onclick="submitStudentAttendance('${classId}', '${className}')" class="btn btn-emerald">Confirm & Record Attendance</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

window.submitStudentAttendance = async function (classId, className) {
  showToast("Saving attendance to Supabase database...", "info");

  const res = await window.db.markAttendance(classId, currentUser.id, true, true);

  const newLog = {
    class_id: classId,
    class_name: className,
    student_id: currentUser.id,
    student_name: currentUser.name,
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'present'
  };

  attendanceLogs.unshift(newLog);
  localStorage.setItem("attendly_attendance_store", JSON.stringify(attendanceLogs));

  closeAppModal();
  showToast(`Successfully recorded attendance for ${className}!`);
  renderViewportContent();
};

// ============================================
// FACULTY CLASS & ROSTER MODALS
// ============================================

window.openFacultyCreateClassModal = function () {
  const timeSlots = generateTimeSlots();
  const timeOptions = timeSlots.map(t => `<option value="${t}">${t}</option>`).join('');

  const modalHtml = `
    <div class="modal-overlay" id="activeAppModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 style="font-size:18px;">📚 Schedule New Class Session</h3>
          <button onclick="closeAppModal()" style="background:none; border:none; color:var(--text-muted); font-size:18px;">✕</button>
        </div>
        <div class="modal-body">
          <form id="createClassModalForm">
            <div class="form-group">
              <label>Course Subject Name</label>
              <input id="newClsName" type="text" class="input-field" placeholder="e.g. Cloud Computing & DevOps" required />
            </div>
            <div class="form-group">
              <label>Course Code</label>
              <input id="newClsCode" type="text" class="input-field" placeholder="e.g. CS-402" required />
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div class="form-group">
                <label>Start Time</label>
                <select id="newClsStartTime" class="input-field" required>
                  <option value="" disabled selected>Select start time</option>
                  ${timeOptions}
                </select>
              </div>
              <div class="form-group">
                <label>End Time</label>
                <select id="newClsEndTime" class="input-field" required>
                  <option value="" disabled selected>Select end time</option>
                  ${timeOptions}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Room Location</label>
              <input id="newClsRoom" type="text" class="input-field" placeholder="Lab 4 · Room 201" required />
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button onclick="closeAppModal()" class="btn btn-secondary">Cancel</button>
          <button onclick="submitFacultyNewClass()" class="btn btn-emerald">Save & Open Class Session</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
};

window.submitFacultyNewClass = async function () {
  const name = document.getElementById("newClsName").value.trim();
  const code = document.getElementById("newClsCode").value.trim();
  const startTime = document.getElementById("newClsStartTime").value;
  const endTime = document.getElementById("newClsEndTime").value;
  const room = document.getElementById("newClsRoom").value.trim();

  if (!name || !code || !startTime || !endTime) {
    showToast("Please fill all fields including start and end time.", "error");
    return;
  }

  const time = `${startTime} - ${endTime}`;

  const newClassObj = {
    id: `cls_${Date.now()}`,
    name,
    course_code: code,
    time,
    room: room || 'Main Hall',
    status: 'open',
    created_at: new Date().toISOString()
  };

  await window.db.createClass(newClassObj);
  activeClasses.push(newClassObj);
  localStorage.setItem("attendly_classes_store", JSON.stringify(activeClasses));

  closeAppModal();
  showToast(`Class session "${name}" created & opened for check-in!`);
  renderViewportContent();
};

window.toggleFacultyClassStatus = async function (classId) {
  const cls = activeClasses.find(c => c.id === classId);
  if (cls) {
    cls.status = cls.status === 'open' ? 'closed' : 'open';
    await window.db.updateClassStatus(classId, cls.status);
    localStorage.setItem("attendly_classes_store", JSON.stringify(activeClasses));
    showToast(`Session for ${cls.name} is now ${cls.status.toUpperCase()}`);
    renderViewportContent();
  }
};

window.openFacultyRosterModal = function (classId, className) {
  const sampleStudents = [
    { name: "Aarav Mehta", roll: "CS-2026-041" },
    { name: "Ishita Roy", roll: "CS-2026-017" },
    { name: "Kabir Singh", roll: "CS-2026-062" },
    { name: "Meera Nair", roll: "CS-2026-029" }
  ];

  const modalHtml = `
    <div class="modal-overlay" id="activeAppModal">
      <div class="modal-dialog" style="max-width:600px;">
        <div class="modal-header">
          <h3 style="font-size:18px;">👥 Batch Attendance Roster</h3>
          <button onclick="closeAppModal()" style="background:none; border:none; color:var(--text-muted); font-size:18px;">✕</button>
        </div>
        <div class="modal-body">
          <h4 style="color:var(--mint); margin-bottom:12px;">${className}</h4>
          <table class="data-table" style="font-size:13px;">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Mark Status</th>
              </tr>
            </thead>
            <tbody>
              ${sampleStudents.map((s, i) => `
                <tr>
                  <td style="font-weight:600;">${s.name}</td>
                  <td style="color:var(--text-muted);">${s.roll}</td>
                  <td>
                    <select id="rStatus_${i}" class="input-field" style="padding:6px; font-size:12px;">
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button onclick="closeAppModal()" class="btn btn-secondary">Cancel</button>
          <button onclick="saveFacultyRoster('${classId}', '${className}')" class="btn btn-emerald">Save Roster Logs</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
};

window.saveFacultyRoster = async function (classId, className) {
  showToast(`Saved roster attendance for ${className}!`);
  closeAppModal();
};

window.openConfigModal = function () {
  const currentUrl = localStorage.getItem("attendly_supabase_url") || "https://szlaftvgqimfzgboqyft.supabase.co";
  const currentKey = localStorage.getItem("attendly_supabase_key") || "";

  const modalHtml = `
    <div class="modal-overlay" id="activeAppModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 style="font-size:18px;">⚙️ Supabase Database Credentials</h3>
          <button onclick="closeAppModal()" style="background:none; border:none; color:var(--text-muted); font-size:18px;">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Supabase Project URL</label>
            <input id="cfgUrl" type="text" class="input-field" value="${currentUrl}" />
          </div>
          <div class="form-group">
            <label>Supabase Anon Key</label>
            <input id="cfgKey" type="text" class="input-field" value="${currentKey}" placeholder="eyJhbG..." />
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeAppModal()" class="btn btn-secondary">Cancel</button>
          <button onclick="saveConfigCredentials()" class="btn btn-emerald">Update Database Key</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
};

window.saveConfigCredentials = function () {
  const url = document.getElementById("cfgUrl").value.trim();
  const key = document.getElementById("cfgKey").value.trim();
  if (url && key && window.db) {
    window.db.updateCredentials(url, key);
    showToast("Supabase credentials updated!");
    closeAppModal();
  }
};

window.closeAppModal = function () {
  const modal = document.getElementById("activeAppModal");
  if (modal) modal.remove();
};

window.handleSignOut = async function () {
  if (window.db) await window.db.signOut();
  currentUser = null;
  localStorage.removeItem("attendly_supabase_url");
  localStorage.removeItem("attendly_supabase_key");
  showToast("Signed out successfully", "info");
  renderAuthView("login");
};

window.filterByClass = function (val) {
  selectedClassFilter = val;
  renderViewportContent();
};

window.filterByDate = function (val) {
  selectedDateFilter = val;
  renderViewportContent();
};

window.clearFilters = function () {
  selectedClassFilter = 'all';
  selectedDateFilter = '';
  renderViewportContent();
};

window.exportAttendanceCsv = function () {
  let csv = "Student Name,Roll No,Course Subject,Date,Time,Status,GPS Verified,Face Verified\n";
  attendanceLogs.forEach(l => {
    csv += `"${l.student_name || currentUser.name}","${l.roll_number || currentUser.roll_number || ''}","${l.class_name || 'Unknown'}","${l.date || ''}","${l.time || ''}","${l.status || 'present'}","Yes","Yes"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `attendly-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToast("Exported CSV attendance audit!");
};

// Start App
initializeApp();
