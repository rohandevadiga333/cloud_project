// frontend/js/student.js
// Student dashboard logic

let allResults = null;
let sgpaChart  = null;
let gradeChart = null;
let currentSemesterData = null;

// ── Initialise ──────────────────────────────────────────────────────────────
(async () => {
  initSidebarToggle();

  // Guard: must be logged in as student
  const { ok, data } = await api.get('/auth/me');
  if (!ok || data.user?.role !== 'student') {
    window.location.href = '/login.html';
    return;
  }

  setSidebarUser({ ...data.user, role: 'student' });
  await Promise.all([loadDashboard(), loadAllResults()]);
})();

// ── Dashboard ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  const { ok, data } = await api.get('/student/dashboard');
  if (!ok) { showToast('Failed to load dashboard data.', 'error'); return; }

  const { student, academics } = data.data;

  document.getElementById('topbar-title').textContent    = `Welcome, ${student.name.split(' ')[0]}!`;
  document.getElementById('topbar-subtitle').textContent = `${student.department || ''} · ${student.programme || ''}`;
  document.getElementById('current-sem-badge').textContent = `Semester ${student.currentSemester}`;
  document.getElementById('reg-badge').textContent          = student.registrationNo;
  document.getElementById('welcome-msg').textContent        = `Welcome back, ${student.name}!`;

  document.getElementById('stat-cgpa').textContent    = (academics.cgpa   || 0).toFixed(2);
  document.getElementById('stat-sgpa').textContent    = (academics.latestSGPA || 0).toFixed(2);
  document.getElementById('stat-credits').textContent = academics.totalCredits || 0;
  document.getElementById('stat-passed').textContent  = academics.passed || 0;
  document.getElementById('stat-failed').textContent  = academics.failed || 0;
  document.getElementById('stat-total').textContent   = academics.totalPublished || 0;

  document.getElementById('profile-avatar').textContent   = getInitials(student.name);
  document.getElementById('profile-name').textContent     = student.name;
  document.getElementById('profile-regno').textContent    = student.registrationNo;
  document.getElementById('profile-dept').textContent     = student.department || '–';
  document.getElementById('profile-prog').textContent     = student.programme  || '–';
  document.getElementById('profile-cgpa-big').textContent = (academics.cgpa || 0).toFixed(2);
  document.getElementById('profile-sem-big').textContent  = student.currentSemester || '–';
  document.getElementById('profile-year-big').textContent = student.admissionYear   || '–';

  const pRow = (label, val) =>
    `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:.875rem;">
       <span style="color:var(--text-light);font-weight:500;">${label}</span>
       <span style="font-weight:600;color:var(--navy);">${val || '–'}</span>
     </div>`;

  document.getElementById('profile-personal').innerHTML =
    pRow('Full Name', student.name) +
    pRow('Email',     student.email) +
    pRow('Phone',     student.phone) +
    pRow('Reg. No.',  student.registrationNo);

  document.getElementById('profile-academic').innerHTML =
    pRow('Department',     student.department) +
    pRow('Programme',      student.programme) +
    pRow('Admission Year', student.admissionYear) +
    pRow('Current Sem',    `Semester ${student.currentSemester}`);

  drawSGPAChart(academics.semesterSGPAs || []);
}

// ── All Results ─────────────────────────────────────────────────────────────
async function loadAllResults() {
  const { ok, data } = await api.get('/student/results');
  if (!ok) return;

  allResults = data.data;
  populateSemesterSelects(allResults.semesters || []);
  drawGradeChart(allResults.semesters || []);

  const sems = allResults.semesters || [];
  renderRecentTable(sems.length ? sems[sems.length - 1].subjects : []);
}

function renderRecentTable(subjects) {
  const tbody = document.getElementById('recent-tbody');
  if (!subjects || !subjects.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-journal-x"></i><p>No published results yet.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = subjects.map(s => `
    <tr>
      <td><strong>${s.subject_code}</strong></td>
      <td>${s.subject_name}</td>
      <td>${s.credits}</td>
      <td>${s.internal_marks}/${s.max_internal_marks}</td>
      <td>${s.external_marks}/${s.max_external_marks}</td>
      <td><strong>${parseFloat(s.total_marks).toFixed(0)}</strong></td>
      <td><span class="result-grade ${gradeColorClass(s.grade)}">${s.grade || '–'}</span></td>
      <td><span class="badge-custom ${s.is_pass ? 'badge-success' : 'badge-danger'}">${s.is_pass ? 'Pass' : 'Fail'}</span></td>
    </tr>`).join('');
}

// ── Semester selects ─────────────────────────────────────────────────────────
function populateSemesterSelects(semesters) {
  const opts = semesters.map(s =>
    `<option value="${s.semesterNo}" data-ay="${s.academicYear}">Semester ${s.semesterNo} – ${s.academicYear}</option>`
  ).join('');

  ['sem-select', 'marksheet-sem-select'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<option value="">-- Select semester --</option>' + opts;
  });
}

// ── Semester Results ─────────────────────────────────────────────────────────
async function loadSemesterResults() {
  const semNo = document.getElementById('sem-select').value;
  if (!semNo) return;

  const local = allResults?.semesters?.find(s => String(s.semesterNo) === String(semNo));
  if (local) { renderSemesterResults(local); return; }

  const { ok, data } = await api.get(`/student/results/${semNo}`);
  if (!ok) { showToast('Failed to load results.', 'error'); return; }
  renderSemesterResults(data.data);
}

function renderSemesterResults(semData) {
  currentSemesterData = semData;
  const isEmpty = !semData.subjects || !semData.subjects.length;

  document.getElementById('result-details').style.display = isEmpty ? 'none' : 'block';
  document.getElementById('result-empty').style.display   = isEmpty ? 'flex' : 'none';
  if (isEmpty) return;

  document.getElementById('result-card-title').textContent = `Semester ${semData.semesterNo} Results`;
  document.getElementById('result-card-sub').textContent   = semData.academicYear || '';
  document.getElementById('r-sgpa').textContent    = (semData.sgpa || 0).toFixed(2);
  document.getElementById('r-cgpa').textContent    = (allResults?.cgpa || 0).toFixed(2);
  document.getElementById('r-credits').textContent = semData.totalCredits || 0;

  const allPass  = semData.subjects.every(s => s.is_pass);
  const statusEl = document.getElementById('r-status');
  statusEl.textContent = allPass ? 'PASS' : 'FAIL';
  statusEl.style.color = allPass ? 'var(--success)' : 'var(--danger)';

  document.getElementById('result-tbody').innerHTML = semData.subjects.map(s => `
    <tr>
      <td><strong>${s.subject_code}</strong></td>
      <td>${s.subject_name}</td>
      <td>${s.credits}</td>
      <td>${s.internal_marks} / ${s.max_internal_marks}</td>
      <td>${s.external_marks} / ${s.max_external_marks}</td>
      <td><strong>${parseFloat(s.total_marks).toFixed(0)}</strong></td>
      <td><span class="result-grade ${gradeColorClass(s.grade)}">${s.grade || '–'}</span></td>
      <td>${parseFloat(s.grade_points || 0).toFixed(2)}</td>
      <td><span class="badge-custom ${s.is_pass ? 'badge-success' : 'badge-danger'}">
        <i class="bi bi-${s.is_pass ? 'check' : 'x'}"></i> ${s.is_pass ? 'Pass' : 'Fail'}
      </span></td>
    </tr>`).join('');
}

// ── PDF Downloads ────────────────────────────────────────────────────────────
function downloadMarksheet() {
  const semNo = document.getElementById('sem-select').value;
  if (!semNo) { showToast('Please select a semester first.', 'warning'); return; }
  triggerMarksheetDownload(semNo);
}

function downloadMarksheetFromPanel() {
  const semNo = document.getElementById('marksheet-sem-select').value;
  if (!semNo) { showToast('Please select a semester.', 'warning'); return; }
  triggerMarksheetDownload(semNo);
}

function triggerMarksheetDownload(semNo) {
  showToast('Generating PDF marks card…', 'info');
  window.open(`/api/student/marksheet/${semNo}`, '_blank');
}

// ── Charts ───────────────────────────────────────────────────────────────────
function drawSGPAChart(semSGPAs) {
  const ctx = document.getElementById('sgpa-chart')?.getContext('2d');
  if (!ctx) return;
  if (sgpaChart) sgpaChart.destroy();

  if (!semSGPAs.length) return;

  sgpaChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels:   semSGPAs.map(s => `Sem ${s.semesterNo}`),
      datasets: [{
        label: 'SGPA',
        data:  semSGPAs.map(s => s.sgpa),
        borderColor:     '#2c7be5',
        backgroundColor: 'rgba(44,123,229,.12)',
        borderWidth: 2.5,
        pointBackgroundColor: '#2c7be5',
        pointRadius: 5,
        tension: 0.4,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 10, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
        x: { grid: { display: false },                    ticks: { font: { size: 11 } } },
      },
    },
  });
}

function drawGradeChart(semesters) {
  const ctx = document.getElementById('grade-chart')?.getContext('2d');
  if (!ctx) return;
  if (gradeChart) gradeChart.destroy();

  const counts = {};
  for (const sem of semesters) {
    for (const s of (sem.subjects || [])) {
      counts[s.grade] = (counts[s.grade] || 0) + 1;
    }
  }
  if (!Object.keys(counts).length) return;

  const gradeOrder = ['O','A+','A','B+','B','C','F'];
  const colors     = { 'O':'#16a34a','A+':'#2563eb','A':'#0891b2','B+':'#7c3aed','B':'#6d28d9','C':'#d97706','F':'#dc2626' };
  const sorted     = gradeOrder.filter(g => counts[g]);

  gradeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   sorted,
      datasets: [{
        data:            sorted.map(g => counts[g]),
        backgroundColor: sorted.map(g => colors[g] || '#94a3b8'),
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 12 }, boxWidth: 14, padding: 12 } },
      },
      cutout: '60%',
    },
  });
}
