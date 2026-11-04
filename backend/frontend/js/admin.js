// frontend/js/admin.js
// Admin dashboard logic

let deptList        = [];
let facultyList     = [];
let subjectList     = [];
let academicYears   = [];
let resetTarget     = { type: null, id: null };
let deptChart       = null;
let resultsChart    = null;

// ── Initialise ──────────────────────────────────────────────────────────────
(async () => {
  initSidebarToggle();

  const { ok, data } = await api.get('/auth/me');
  if (!ok || data.user?.role !== 'admin') {
    window.location.href = '/login.html';
    return;
  }
  setSidebarUser({ ...data.user, role: 'admin' });
  await Promise.all([loadDashboard(), loadMetaData()]);
})();

// ── Meta data (departments, faculty, subjects, years) ────────────────────────
async function loadMetaData() {
  const [deptRes, facRes, subRes, ayRes] = await Promise.all([
    api.get('/admin/departments'),
    api.get('/admin/faculty'),
    api.get('/admin/subjects'),
    api.get('/admin/academic-years'),
  ]);

  deptList      = deptRes.ok    ? deptRes.data.data    : [];
  facultyList   = facRes.ok     ? facRes.data.data     : [];
  subjectList   = subRes.ok     ? subRes.data.data     : [];
  academicYears = ayRes.ok      ? ayRes.data.data      : [];

  populateDeptSelects();
  populateFacultySelect();
  populateSubjectSelect();
  populateAYSelect();
}

function populateDeptSelects() {
  const opts = deptList.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  const filterOpts = deptList.map(d => `<option value="${d.code}">${d.name}</option>`).join('');

  ['s-dept', 'f-dept', 'sub-dept'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<option value="">-- Select Department --</option>' + opts;
  });
  ['stu-dept-filter','subj-dept-filter','res-dept-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<option value="">All Departments</option>' + filterOpts;
  });
}

function populateFacultySelect() {
  const el = document.getElementById('assign-fac');
  if (!el) return;
  el.innerHTML = '<option value="">-- Select Faculty --</option>' +
    facultyList.map(f => `<option value="${f.id}">${f.faculty_id} – ${f.full_name}</option>`).join('');
}

function populateSubjectSelect() {
  const el = document.getElementById('assign-sub');
  if (!el) return;
  el.innerHTML = '<option value="">-- Select Subject --</option>' +
    subjectList.map(s => `<option value="${s.id}">[Sem ${s.semester_no}] ${s.subject_code} – ${s.subject_name}</option>`).join('');
}

function populateAYSelect() {
  const el = document.getElementById('assign-ay');
  if (!el) return;
  el.innerHTML = '<option value="">-- Select Academic Year --</option>' +
    academicYears.map(ay => `<option value="${ay.id}" ${ay.is_current ? 'selected':''}>${ay.year_label}</option>`).join('');
}

// ── Dashboard ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  const { ok, data } = await api.get('/admin/dashboard');
  if (!ok) { showToast('Failed to load dashboard.', 'error'); return; }

  const { stats, deptStats, auditLogs } = data.data;

  document.getElementById('ds-students').textContent  = stats.totalStudents;
  document.getElementById('ds-faculty').textContent   = stats.totalFaculty;
  document.getElementById('ds-depts').textContent     = stats.totalDepartments;
  document.getElementById('ds-subjects').textContent  = stats.totalSubjects;
  document.getElementById('ds-published').textContent = stats.publishedResults;
  document.getElementById('ds-pending').textContent   = stats.pendingResults;
  document.getElementById('ds-total').textContent     = stats.totalResults;

  // Dept chart
  const dctx = document.getElementById('dept-chart')?.getContext('2d');
  if (dctx) {
    if (deptChart) deptChart.destroy();
    deptChart = new Chart(dctx, {
      type: 'bar',
      data: {
        labels: deptStats.map(d => d.code),
        datasets: [{ label: 'Students', data: deptStats.map(d => parseInt(d.student_count)),
          backgroundColor: '#2c7be5', borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } },
    });
  }

  // Results overview chart
  const rctx = document.getElementById('results-overview-chart')?.getContext('2d');
  if (rctx) {
    if (resultsChart) resultsChart.destroy();
    resultsChart = new Chart(rctx, {
      type: 'doughnut',
      data: {
        labels: ['Published', 'Draft'],
        datasets: [{ data: [stats.publishedResults, stats.pendingResults],
          backgroundColor: ['#16a34a','#d97706'], borderWidth: 2 }],
      },
      options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom' } } },
    });
  }

  // Audit log
  const tbody = document.getElementById('audit-tbody');
  if (tbody) {
    tbody.innerHTML = auditLogs.length
      ? auditLogs.map(l => `<tr>
          <td><span class="badge-custom badge-info">${l.action}</span></td>
          <td>${l.performer_name || '–'}</td>
          <td><span class="badge-custom badge-navy">${l.role || '–'}</span></td>
          <td>${formatDateTime(l.created_at)}</td>
        </tr>`).join('')
      : `<tr><td colspan="4"><div class="empty-state"><p>No activity yet.</p></div></td></tr>`;
  }
}

// ── Students ─────────────────────────────────────────────────────────────────
async function loadStudents() {
  const search = document.getElementById('stu-search')?.value || '';
  const dept   = document.getElementById('stu-dept-filter')?.value || '';
  let url = '/admin/students?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (dept)   url += `department=${dept}`;

  const { ok, data } = await api.get(url);
  if (!ok) return;

  const tbody = document.getElementById('students-tbody');
  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-people"></i><p>No students found.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.data.map(s => `
    <tr>
      <td><strong>${s.registration_no}</strong></td>
      <td>${s.full_name}</td>
      <td>${s.dept_name || '–'}</td>
      <td>${s.programme || '–'}</td>
      <td>Semester ${s.current_semester}</td>
      <td><span class="badge-custom ${s.is_active ? 'badge-success':'badge-danger'}">${s.is_active ? 'Active':'Inactive'}</span></td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-outline btn-sm" onclick="toggleStudentStatus(${s.id},${!s.is_active})" title="${s.is_active ? 'Deactivate':'Activate'}">
          <i class="bi bi-${s.is_active ? 'pause-fill':'play-fill'}"></i>
        </button>
        <button class="btn btn-outline btn-sm" onclick="openResetPw('student',${s.id},'${s.registration_no}')" title="Reset Password">
          <i class="bi bi-key-fill"></i>
        </button>
      </td>
    </tr>`).join('');
}

async function createStudent() {
  const alertEl = document.getElementById('add-student-alert');
  const body = {
    fullName: document.getElementById('s-name').value,
    registrationNo: document.getElementById('s-regno').value,
    email: document.getElementById('s-email').value,
    phone: document.getElementById('s-phone').value,
    departmentId: document.getElementById('s-dept').value || null,
    programme: document.getElementById('s-prog').value,
    admissionYear: parseInt(document.getElementById('s-year').value),
    currentSemester: parseInt(document.getElementById('s-sem').value),
    password: document.getElementById('s-pass').value,
  };

  const { ok, data } = await api.post('/admin/students', body);
  if (ok) {
    showToast('Student created successfully!', 'success');
    closeModal('modal-add-student');
    ['s-name','s-regno','s-email','s-phone','s-pass'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    await loadStudents();
    await loadDashboard();
  } else {
    alertEl.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
  }
}

async function toggleStudentStatus(id, isActive) {
  const { ok } = await api.put(`/admin/students/${id}`, { isActive });
  if (ok) { showToast(`Student ${isActive ? 'activated':'deactivated'}.`, 'success'); await loadStudents(); }
}

// ── Faculty ───────────────────────────────────────────────────────────────────
async function loadFaculty() {
  const search = document.getElementById('fac-search')?.value || '';
  let url = '/admin/faculty?';
  if (search) url += `search=${encodeURIComponent(search)}`;

  const { ok, data } = await api.get(url);
  if (!ok) return;

  const tbody = document.getElementById('faculty-tbody');
  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-person-badge"></i><p>No faculty found.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.data.map(f => `
    <tr>
      <td><strong>${f.faculty_id}</strong></td>
      <td>${f.full_name}</td>
      <td>${f.dept_name || '–'}</td>
      <td>${f.email || '–'}</td>
      <td>${f.subject_count || 0}</td>
      <td><span class="badge-custom ${f.is_active ? 'badge-success':'badge-danger'}">${f.is_active ? 'Active':'Inactive'}</span></td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-outline btn-sm" onclick="toggleFacultyStatus(${f.id},${!f.is_active})">
          <i class="bi bi-${f.is_active ? 'pause':'play'}-fill"></i>
        </button>
        <button class="btn btn-outline btn-sm" onclick="openResetPw('faculty',${f.id},'${f.faculty_id}')">
          <i class="bi bi-key-fill"></i>
        </button>
      </td>
    </tr>`).join('');
}

async function createFaculty() {
  const alertEl = document.getElementById('add-faculty-alert');
  const body = {
    facultyId:    document.getElementById('f-fid').value,
    fullName:     document.getElementById('f-name').value,
    email:        document.getElementById('f-email').value,
    phone:        document.getElementById('f-phone').value,
    departmentId: document.getElementById('f-dept').value || null,
    password:     document.getElementById('f-pass').value,
  };

  const { ok, data } = await api.post('/admin/faculty', body);
  if (ok) {
    showToast('Faculty created successfully!', 'success');
    closeModal('modal-add-faculty');
    ['f-fid','f-name','f-email','f-phone','f-pass'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    await Promise.all([loadFaculty(), loadMetaData()]);
  } else {
    alertEl.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
  }
}

async function toggleFacultyStatus(id, isActive) {
  const { ok } = await api.put(`/admin/faculty/${id}`, { isActive });
  if (ok) { showToast(`Faculty ${isActive ? 'activated':'deactivated'}.`, 'success'); await loadFaculty(); }
}

// ── Departments ───────────────────────────────────────────────────────────────
async function loadDepartments() {
  const { ok, data } = await api.get('/admin/departments');
  if (!ok) return;
  deptList = data.data;
  populateDeptSelects();

  const tbody = document.getElementById('depts-tbody');
  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No departments yet.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.data.map(d => `
    <tr>
      <td><strong>${d.code}</strong></td>
      <td>${d.name}</td>
      <td>${d.student_count || 0}</td>
      <td>${d.faculty_count || 0}</td>
      <td><span class="badge-custom ${d.is_active ? 'badge-success':'badge-danger'}">${d.is_active ? 'Active':'Inactive'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="toggleDept(${d.id},${!d.is_active},'${d.name}')">
          <i class="bi bi-${d.is_active ? 'pause':'play'}-fill"></i>
        </button>
      </td>
    </tr>`).join('');
}

async function createDepartment() {
  const alertEl = document.getElementById('add-dept-alert');
  const body = {
    code:        document.getElementById('d-code').value,
    name:        document.getElementById('d-name').value,
    description: document.getElementById('d-desc').value,
  };
  const { ok, data } = await api.post('/admin/departments', body);
  if (ok) {
    showToast('Department created!', 'success');
    closeModal('modal-add-dept');
    await loadDepartments();
  } else {
    alertEl.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
  }
}

async function toggleDept(id, isActive, name) {
  const { ok } = await api.put(`/admin/departments/${id}`, { isActive, name });
  if (ok) { showToast('Department updated.', 'success'); await loadDepartments(); }
}

// ── Subjects ─────────────────────────────────────────────────────────────────
async function loadSubjects() {
  const sem  = document.getElementById('subj-sem-filter')?.value  || '';
  const dept = document.getElementById('subj-dept-filter')?.value || '';
  let url = '/admin/subjects?';
  if (sem)  url += `semester=${sem}&`;
  if (dept) url += `department=${dept}`;

  const { ok, data } = await api.get(url);
  if (!ok) return;
  subjectList = data.data;
  populateSubjectSelect();

  const tbody = document.getElementById('subjects-tbody');
  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>No subjects found.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.data.map(s => `
    <tr>
      <td><strong>${s.subject_code}</strong></td>
      <td>${s.subject_name}</td>
      <td>${s.semester_no}</td>
      <td>${s.credits}</td>
      <td>${s.max_internal_marks}</td>
      <td>${s.max_external_marks}</td>
      <td>${s.dept_name || '–'}</td>
      <td>
        <span class="badge-custom ${s.is_active ? 'badge-success':'badge-danger'}">${s.is_active ? 'Active':'Inactive'}</span>
      </td>
    </tr>`).join('');
}

async function createSubject() {
  const alertEl = document.getElementById('add-subject-alert');
  const body = {
    subjectCode:     document.getElementById('sub-code').value,
    subjectName:     document.getElementById('sub-name').value,
    credits:         parseInt(document.getElementById('sub-credits').value),
    semesterNo:      parseInt(document.getElementById('sub-sem').value),
    departmentId:    document.getElementById('sub-dept').value || null,
    maxInternalMarks: parseInt(document.getElementById('sub-int').value),
    maxExternalMarks: parseInt(document.getElementById('sub-ext').value),
  };
  const { ok, data } = await api.post('/admin/subjects', body);
  if (ok) {
    showToast('Subject created!', 'success');
    closeModal('modal-add-subject');
    await loadSubjects();
    await loadMetaData();
  } else {
    alertEl.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
  }
}

// ── Faculty Assignments ───────────────────────────────────────────────────────
async function loadAssignments() {
  const { ok, data } = await api.get('/admin/faculty-subjects');
  if (!ok) return;

  const tbody = document.getElementById('assignments-tbody');
  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No assignments found.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.data.map(a => `
    <tr>
      <td><strong>${a.faculty_code}</strong></td>
      <td>${a.faculty_name}</td>
      <td>${a.subject_code}</td>
      <td>${a.subject_name}</td>
      <td>Semester ${a.semester_no}</td>
      <td>${a.academic_year}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="removeAssignment(${a.id})" title="Remove">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');
}

async function assignFaculty() {
  const alertEl = document.getElementById('assign-faculty-alert');
  const body = {
    facultyId:      parseInt(document.getElementById('assign-fac').value),
    subjectId:      parseInt(document.getElementById('assign-sub').value),
    academicYearId: parseInt(document.getElementById('assign-ay').value),
  };
  if (!body.facultyId || !body.subjectId || !body.academicYearId) {
    alertEl.innerHTML = `<div class="alert alert-warning">All fields are required.</div>`; return;
  }
  const { ok, data } = await api.post('/admin/assign-faculty', body);
  if (ok) {
    showToast('Subject assigned to faculty!', 'success');
    closeModal('modal-assign-faculty');
    await loadAssignments();
  } else {
    alertEl.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
  }
}

async function removeAssignment(id) {
  if (!confirm('Remove this faculty-subject assignment?')) return;
  const { ok } = await api.delete(`/admin/faculty-subjects/${id}`);
  if (ok) { showToast('Assignment removed.', 'success'); await loadAssignments(); }
}

// ── Results ───────────────────────────────────────────────────────────────────
async function loadAdminResults() {
  const search = document.getElementById('res-search')?.value      || '';
  const dept   = document.getElementById('res-dept-filter')?.value  || '';
  const sem    = document.getElementById('res-sem-filter')?.value   || '';
  const status = document.getElementById('res-status-filter')?.value || '';
  let url = '/admin/results?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (dept)   url += `department=${dept}&`;
  if (sem)    url += `semester=${sem}&`;
  if (status) url += `status=${status}`;

  const { ok, data } = await api.get(url);
  if (!ok) return;

  const tbody = document.getElementById('admin-results-tbody');
  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><p>No results found.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.data.map(r => `
    <tr>
      <td><strong>${r.registration_no}</strong></td>
      <td>${r.student_name}</td>
      <td>${r.subject_code}</td>
      <td>${r.semester_no}</td>
      <td>${r.internal_marks}/${r.max_internal_marks}</td>
      <td>${r.external_marks}/${r.max_external_marks}</td>
      <td><strong>${parseFloat(r.total_marks||0).toFixed(0)}</strong></td>
      <td><span class="result-grade ${gradeColorClass(r.grade)}">${r.grade || '–'}</span></td>
      <td>${r.entered_by_id || '–'}</td>
      <td><span class="badge-custom ${r.status==='published'?'badge-success':'badge-warning'}">${r.status}</span></td>
      <td>
        ${r.status === 'draft'
          ? `<button class="btn btn-success btn-sm" onclick="adminPublish(${r.id})" title="Publish">
               <i class="bi bi-send"></i> Publish
             </button>`
          : `<button class="btn btn-outline btn-sm" onclick="openCorrectResult(${r.id})" title="Correct">
               <i class="bi bi-pencil"></i>
             </button>`}
      </td>
    </tr>`).join('');
}

async function adminPublish(id) {
  if (!confirm('Publish this result? It will become visible to the student.')) return;
  const { ok, data } = await api.put(`/admin/results/${id}/publish`, {});
  if (ok) { showToast('Result published.', 'success'); await loadAdminResults(); }
  else    { showToast(data.message, 'error'); }
}

function openCorrectResult(id) {
  const intMarks = prompt('Enter corrected Internal Marks:');
  const extMarks = prompt('Enter corrected External Marks:');
  if (intMarks === null || extMarks === null) return;
  const reason = prompt('Enter reason for correction:') || 'Admin correction';
  correctResult(id, intMarks, extMarks, reason);
}

async function correctResult(id, intMarks, extMarks, reason) {
  const { ok, data } = await api.put(`/admin/results/${id}/correct`, {
    internalMarks: parseFloat(intMarks),
    externalMarks: parseFloat(extMarks),
    reason,
  });
  if (ok) { showToast('Result corrected and audit log created.', 'success'); await loadAdminResults(); }
  else    { showToast(data.message || 'Failed to correct.', 'error'); }
}

// ── Grading Scale ─────────────────────────────────────────────────────────────
async function loadGradingScale() {
  const { ok, data } = await api.get('/admin/grading-scale');
  if (!ok) return;

  const tbody = document.getElementById('grading-tbody');
  tbody.innerHTML = data.data.map(g => `
    <tr>
      <td><strong style="font-size:1rem;color:var(--navy);">${g.grade}</strong></td>
      <td>${parseFloat(g.min_percent).toFixed(1)}%</td>
      <td>${parseFloat(g.max_percent).toFixed(1)}%</td>
      <td>${parseFloat(g.grade_points).toFixed(2)}</td>
      <td><span class="badge-custom ${g.is_pass ? 'badge-success':'badge-danger'}">${g.is_pass ? 'Yes':'No'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editGrade(${g.id},${g.grade_points},${g.min_percent},${g.max_percent},${g.is_pass})">
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    </tr>`).join('');
}

function editGrade(id, gp, min, max, isPass) {
  const newGP  = prompt('Grade Points:', gp);
  if (newGP === null) return;
  const newMin = prompt('Min Percent:', min);
  if (newMin === null) return;
  const newMax = prompt('Max Percent:', max);
  if (newMax === null) return;
  updateGrade(id, parseFloat(newGP), parseFloat(newMin), parseFloat(newMax), isPass);
}

async function updateGrade(id, gradePoints, minPercent, maxPercent, isPass) {
  const { ok } = await api.put(`/admin/grading-scale/${id}`, { gradePoints, minPercent, maxPercent, isPass });
  if (ok) { showToast('Grading scale updated!', 'success'); await loadGradingScale(); }
}

// ── Reports ───────────────────────────────────────────────────────────────────
async function loadReports() {
  const [deptRep, resultRep] = await Promise.all([
    api.get('/admin/reports/departments'),
    api.get('/admin/reports/results'),
  ]);

  if (deptRep.ok) {
    const tbody = document.getElementById('report-dept-tbody');
    tbody.innerHTML = deptRep.data.data.map(d => `
      <tr>
        <td><strong>${d.name}</strong> <small style="color:var(--text-muted);">(${d.code})</small></td>
        <td>${d.student_count}</td>
        <td>${d.faculty_count}</td>
        <td>${d.subject_count}</td>
      </tr>`).join('');
  }

  if (resultRep.ok) {
    const tbody = document.getElementById('report-result-tbody');
    tbody.innerHTML = resultRep.data.data.map(r => `
      <tr>
        <td>${r.department}</td>
        <td>${r.semester_no}</td>
        <td>${r.total}</td>
        <td style="color:var(--success);font-weight:600;">${r.passed}</td>
        <td style="color:var(--danger);font-weight:600;">${r.failed}</td>
        <td>${r.avg_marks || '–'}</td>
      </tr>`).join('');
  }
}

// ── Password Reset ────────────────────────────────────────────────────────────
function openResetPw(type, id, label) {
  resetTarget = { type, id };
  document.getElementById('reset-pw-target').textContent = label;
  document.getElementById('reset-pw-val').value = '';
  document.getElementById('reset-pw-alert').innerHTML = '';
  openModal('modal-reset-pw');
}

async function submitResetPassword() {
  const alertEl  = document.getElementById('reset-pw-alert');
  const newPw    = document.getElementById('reset-pw-val').value;
  if (!newPw || newPw.length < 8) {
    alertEl.innerHTML = `<div class="alert alert-warning">Password must be at least 8 characters.</div>`; return;
  }

  const endpoint = resetTarget.type === 'student'
    ? `/admin/students/${resetTarget.id}/reset-password`
    : `/admin/faculty/${resetTarget.id}/reset-password`;

  const { ok, data } = await api.put(endpoint, { newPassword: newPw });
  if (ok) {
    showToast('Password reset successfully!', 'success');
    closeModal('modal-reset-pw');
  } else {
    alertEl.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
  }
}

// ── Modal helpers ──────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
