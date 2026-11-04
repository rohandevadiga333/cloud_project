// frontend/js/faculty.js
// Faculty dashboard logic

let facultyData   = null;
let allSubjects   = null;
let allFacResults = null;
let currentStudent = null;
let editingResultId = null;

// ── Initialise ──────────────────────────────────────────────────────────────
(async () => {
  initSidebarToggle();

  const { ok, data } = await api.get('/auth/me');
  if (!ok || data.user?.role !== 'faculty') {
    window.location.href = '/login.html';
    return;
  }

  setSidebarUser({ ...data.user, role: 'faculty' });
  await loadDashboard();
  await loadAcademicYears();
})();

// ── Dashboard ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  const { ok, data } = await api.get('/faculty/dashboard');
  if (!ok) { showToast('Failed to load dashboard.', 'error'); return; }

  facultyData = data.data;
  const { faculty, stats, recentResults } = facultyData;

  document.getElementById('topbar-title').textContent    = `Welcome, ${faculty.name.split(' ')[0]}!`;
  document.getElementById('topbar-subtitle').textContent = faculty.department || '';
  document.getElementById('fac-id-badge').textContent    = faculty.facultyId;
  document.getElementById('fac-welcome').textContent     = `Welcome, ${faculty.name}!`;
  document.getElementById('fac-dept-prog').textContent   = `${faculty.department || ''} · ${faculty.email || ''}`;

  document.getElementById('stat-subjects').textContent  = stats.totalSubjects || 0;
  document.getElementById('stat-published').textContent = stats.publishedCount || 0;
  document.getElementById('stat-draft').textContent     = stats.draftCount     || 0;

  // Recent results table
  const tbody = document.getElementById('recent-results-tbody');
  if (!recentResults.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-journal-x"></i><p>No results entered yet.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = recentResults.map(r => `
      <tr>
        <td><strong>${r.registration_no}</strong></td>
        <td>${r.student_name}</td>
        <td>${r.subject_name}</td>
        <td>${parseFloat(r.total_marks||0).toFixed(0)}</td>
        <td><span class="result-grade">${r.grade || '–'}</span></td>
        <td><span class="badge-custom ${r.status==='published' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
        <td>${formatDate(r.created_at)}</td>
      </tr>`).join('');
  }
}

// ── Academic Years ───────────────────────────────────────────────────────────
async function loadAcademicYears() {
  const { ok, data } = await api.get('/admin/academic-years');
  if (!ok) return;

  const aySelect = document.getElementById('f-ay');
  if (aySelect) {
    aySelect.innerHTML = '<option value="">-- Select Academic Year --</option>' +
      data.data.map(ay => `<option value="${ay.id}" ${ay.is_current ? 'selected' : ''}>${ay.year_label}</option>`).join('');
  }
  await loadSubjectsForAY();
}

// ── Subjects ─────────────────────────────────────────────────────────────────
async function loadSubjectsForAY() {
  const ayId = document.getElementById('f-ay')?.value;
  const url   = ayId ? `/faculty/subjects?academicYearId=${ayId}` : '/faculty/subjects';
  const { ok, data } = await api.get(url);
  if (!ok) return;

  allSubjects = data.data;

  const subjectSelect = document.getElementById('f-subject');
  if (subjectSelect) {
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>' +
      allSubjects.map(s =>
        `<option value="${s.id}" data-int="${s.max_internal_marks}" data-ext="${s.max_external_marks}" data-sem="${s.semester_no}">
          [Sem ${s.semester_no}] ${s.subject_code} – ${s.subject_name}
        </option>`
      ).join('');
  }
}

async function filterSubjects() { await loadSubjectsForAY(); }

async function loadSubjects() {
  const tbody = document.getElementById('subjects-tbody');
  if (!tbody) return;
  if (allSubjects) { renderSubjectsTable(allSubjects); return; }
  const { ok, data } = await api.get('/faculty/subjects');
  if (!ok) return;
  allSubjects = data.data;
  renderSubjectsTable(allSubjects);
}

function renderSubjectsTable(subjects) {
  const tbody = document.getElementById('subjects-tbody');
  if (!tbody) return;
  if (!subjects.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-book"></i><p>No subjects assigned.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = subjects.map(s => `
    <tr>
      <td><strong>${s.subject_code}</strong></td>
      <td>${s.subject_name}</td>
      <td>Semester ${s.semester_no}</td>
      <td>${s.credits}</td>
      <td>${s.max_internal_marks}</td>
      <td>${s.max_external_marks}</td>
      <td>${s.academic_year || '–'}</td>
    </tr>`).join('');
}

// ── Student Search ────────────────────────────────────────────────────────────
async function searchStudent() {
  const regNo = document.getElementById('search-reg').value.trim();
  if (!regNo) { showToast('Please enter a registration number.', 'warning'); return; }

  const { ok, data } = await api.get(`/faculty/student/${encodeURIComponent(regNo)}`);
  if (!ok) {
    showToast(data.message || 'Student not found.', 'error');
    document.getElementById('student-info-box').style.display = 'none';
    document.getElementById('marks-form-card').style.display  = 'none';
    return;
  }

  currentStudent = data.data;
  showStudentInfo(currentStudent);
  document.getElementById('marks-form-card').style.display = 'block';
  editingResultId = null;
}

function showStudentInfo(student) {
  const box  = document.getElementById('student-info-box');
  const grid = document.getElementById('student-info-grid');
  box.style.display = 'block';

  const item = (icon, label, val) =>
    `<div style="background:white;border-radius:var(--r-sm);padding:12px;border:1px solid var(--border);">
      <div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;">${label}</div>
      <div style="font-weight:700;color:var(--navy);margin-top:4px;">${val || '–'}</div>
    </div>`;

  grid.innerHTML =
    item('person', 'Name',        student.full_name) +
    item('card',   'Reg No',      student.registration_no) +
    item('building','Department', student.department) +
    item('book',   'Programme',   student.programme) +
    item('hash',   'Semester',    `Semester ${student.current_semester}`);
}

// ── Subject change → show max marks ──────────────────────────────────────────
function onSubjectChange() {
  const sel = document.getElementById('f-subject');
  const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return;

  const maxInt = opt.getAttribute('data-int') || 50;
  const maxExt = opt.getAttribute('data-ext') || 100;
  document.getElementById('f-max-int').textContent = `(max ${maxInt})`;
  document.getElementById('f-max-ext').textContent = `(max ${maxExt})`;
  document.getElementById('f-internal').max = maxInt;
  document.getElementById('f-external').max = maxExt;
  calcTotal();
}

// ── Live total calculation ────────────────────────────────────────────────────
function calcTotal() {
  const intVal = parseFloat(document.getElementById('f-internal').value) || 0;
  const extVal = parseFloat(document.getElementById('f-external').value) || 0;
  const total  = intVal + extVal;

  document.getElementById('total-display').style.display = 'block';
  document.getElementById('total-val').textContent       = total.toFixed(0);

  const sel = document.getElementById('f-subject');
  const opt = sel.options[sel.selectedIndex];
  if (opt.value) {
    const maxInt = parseFloat(opt.getAttribute('data-int') || 50);
    const maxExt = parseFloat(opt.getAttribute('data-ext') || 100);
    const maxTot = maxInt + maxExt;
    const pct    = (total / maxTot) * 100;

    const grades = [
      { g:'O',  gp:10, min:90  },
      { g:'A+', gp:9,  min:80  },
      { g:'A',  gp:8,  min:70  },
      { g:'B+', gp:7,  min:60  },
      { g:'B',  gp:6,  min:50  },
      { g:'C',  gp:5,  min:45  },
      { g:'F',  gp:0,  min:0   },
    ];
    const found = grades.find(entry => pct >= entry.min) || grades[grades.length - 1];
    const color = found.g === 'F' ? 'var(--danger)' : 'var(--success)';
    document.getElementById('grade-preview').innerHTML =
      `<span style="color:${color};">Grade: ${found.g} &nbsp; (${found.gp.toFixed(1)} pts) &nbsp; ${pct.toFixed(1)}%</span>`;
  }
}

// ── Save Marks ───────────────────────────────────────────────────────────────
async function saveMarks(action) {
  const alertEl = document.getElementById('marks-alert');
  alertEl.innerHTML = '';

  if (!currentStudent) { showToast('Please search a student first.', 'warning'); return; }

  const ayId      = document.getElementById('f-ay').value;
  const subjectId = document.getElementById('f-subject').value;
  const internal  = document.getElementById('f-internal').value;
  const external  = document.getElementById('f-external').value;

  if (!ayId)      { alertEl.innerHTML = `<div class="alert alert-warning">Please select an academic year.</div>`; return; }
  if (!subjectId) { alertEl.innerHTML = `<div class="alert alert-warning">Please select a subject.</div>`;       return; }
  if (internal === '' || external === '') {
    alertEl.innerHTML = `<div class="alert alert-warning">Please enter both internal and external marks.</div>`; return;
  }

  const sel    = document.getElementById('f-subject');
  const opt    = sel.options[sel.selectedIndex];
  const semNo  = opt.getAttribute('data-sem') || currentStudent.current_semester;

  const payload = {
    studentRegNo:   currentStudent.registration_no,
    subjectId:      parseInt(subjectId),
    academicYearId: parseInt(ayId),
    semesterNo:     parseInt(semNo),
    internalMarks:  parseFloat(internal),
    externalMarks:  parseFloat(external),
  };

  let resp;
  if (editingResultId) {
    resp = await api.put(`/faculty/results/${editingResultId}`, { internalMarks: payload.internalMarks, externalMarks: payload.externalMarks });
  } else {
    resp = await api.post('/faculty/results', payload);
  }

  if (!resp.ok) {
    alertEl.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle"></i> ${resp.data.message}</div>`;
    return;
  }

  const resultId = resp.data.data.id;

  // Publish immediately if requested
  if (action === 'publish') {
    const pubResp = await api.put(`/faculty/results/${resultId}/publish`, {});
    if (!pubResp.ok) {
      alertEl.innerHTML = `<div class="alert alert-warning">Marks saved but publish failed: ${pubResp.data.message}</div>`;
      return;
    }
  }

  showToast(
    action === 'publish'
      ? 'Marks saved and published successfully!'
      : 'Marks saved as draft.',
    'success'
  );
  clearMarksForm();
  alertEl.innerHTML = `<div class="alert alert-success"><i class="bi bi-check-circle"></i> ${action === 'publish' ? 'Published' : 'Draft saved'} successfully!</div>`;
  await loadDashboard();
}

function clearMarksForm() {
  document.getElementById('f-internal').value = '';
  document.getElementById('f-external').value = '';
  document.getElementById('total-display').style.display = 'none';
  editingResultId = null;
}

// ── Faculty Results ───────────────────────────────────────────────────────────
async function loadFacultyResults() {
  const search = document.getElementById('results-search')?.value || '';
  const status = document.getElementById('results-status-filter')?.value || '';
  let url = '/faculty/results?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (status) url += `status=${status}`;

  const { ok, data } = await api.get(url);
  if (!ok) { showToast('Failed to load results.', 'error'); return; }

  allFacResults = data.data;
  renderFacultyResults(allFacResults);
}

function filterResults() {
  if (!allFacResults) return;
  const search = document.getElementById('results-search').value.toLowerCase();
  const status = document.getElementById('results-status-filter').value;

  const filtered = allFacResults.filter(r => {
    const matchSearch = !search ||
      r.registration_no.toLowerCase().includes(search) ||
      r.student_name.toLowerCase().includes(search);
    const matchStatus = !status || r.status === status;
    return matchSearch && matchStatus;
  });
  renderFacultyResults(filtered);
}

function renderFacultyResults(results) {
  const tbody = document.getElementById('results-tbody');
  if (!results.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><i class="bi bi-journal-x"></i><p>No results found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = results.map(r => `
    <tr>
      <td><strong>${r.registration_no}</strong></td>
      <td>${r.student_name}</td>
      <td>${r.subject_code} – ${r.subject_name}</td>
      <td>${r.semester_no}</td>
      <td>${r.internal_marks}/${r.max_internal_marks}</td>
      <td>${r.external_marks}/${r.max_external_marks}</td>
      <td><strong>${parseFloat(r.total_marks||0).toFixed(0)}</strong></td>
      <td><span class="result-grade ${gradeColorClass(r.grade)}">${r.grade || '–'}</span></td>
      <td><span class="badge-custom ${r.status==='published' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
      <td style="display:flex;gap:6px;">
        ${r.status === 'draft' ? `
          <button class="btn btn-outline btn-sm" onclick="editResult(${r.id},${r.internal_marks},${r.external_marks})" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-success btn-sm" onclick="publishOne(${r.id})" title="Publish">
            <i class="bi bi-send"></i>
          </button>
        ` : '<span style="color:var(--text-muted);font-size:.78rem;">Published</span>'}
      </td>
    </tr>`).join('');
}

function editResult(id, intMarks, extMarks) {
  editingResultId = id;
  document.getElementById('f-internal').value = intMarks;
  document.getElementById('f-external').value = extMarks;
  calcTotal();
  showSection('sec-enter-marks');
  showToast('Edit mode: update marks and save.', 'info');
}

async function publishOne(id) {
  if (!confirm('Are you sure you want to publish this result? Students will be able to see it.')) return;
  const { ok, data } = await api.put(`/faculty/results/${id}/publish`, {});
  if (ok) {
    showToast('Result published successfully!', 'success');
    await loadFacultyResults();
    await loadDashboard();
  } else {
    showToast(data.message || 'Failed to publish.', 'error');
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
