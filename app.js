/**
 * C++ Online Judge - Static Web App
 * Uses Wandbox public API for compilation & execution.
 */

const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const COMPILER = 'gcc-13.2.0'; // stable C++ compiler on Wandbox

// State
let problems = {}; // { name: { tests: [ {name, input, output} ] } }
let currentProblem = null;
let isJudging = false;

// DOM
const zipInput = document.getElementById('zip-input');
const problemList = document.getElementById('problem-list');
const problemCount = document.getElementById('problem-count');
const currentTitle = document.getElementById('current-problem-title');
const codeInput = document.getElementById('code-input');
const timeLimitInput = document.getElementById('time-limit');
const memLimitInput = document.getElementById('mem-limit');
const btnRun = document.getElementById('btn-run');
const btnClear = document.getElementById('btn-clear');
const statusText = document.getElementById('status-text');
const resultsTable = document.getElementById('results-table');
const resultsBody = document.getElementById('results-body');
const resultsEmpty = document.getElementById('results-empty');
const summary = document.getElementById('summary');
const summaryPercent = document.getElementById('summary-percent');
const summaryDetail = document.getElementById('summary-detail');

// ---------- Upload & Parse ZIP ----------
zipInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  statusText.textContent = 'Đang đọc ZIP...';
  try {
    const zip = await JSZip.loadAsync(file);
    problems = parseZip(zip);
    renderProblemList();
    statusText.textContent = `Đã tải ${Object.keys(problems).length} bài.`;
  } catch (err) {
    console.error(err);
    statusText.textContent = 'Lỗi đọc ZIP: ' + err.message;
    alert('Không đọc được file ZIP. Hãy kiểm tra định dạng.');
  }
  zipInput.value = '';
});

function parseZip(zip) {
  const result = {};
  const files = {};

  // Collect all files with content
  const promises = [];
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    // skip macOS junk
    if (relativePath.includes('__MACOSX') || relativePath.startsWith('.')) return;

    promises.push(
      zipEntry.async('string').then((content) => {
        files[relativePath.replace(/\\/g, '/')] = content;
      })
    );
  });

  // Wait is handled outside, but for simplicity we process after all loaded
  // Actually we need to return a Promise. Let's restructure.
  return Promise.all(promises).then(() => {
    // Group by top-level folder (problem name)
    const byProblem = {};

    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length < 2) continue; // need at least problem/file

      const problemName = parts[0];
      const fileName = parts[parts.length - 1].toLowerCase();

      if (!byProblem[problemName]) byProblem[problemName] = { ins: {}, outs: {} };

      // Detect input / output
      const isIn =
        fileName.endsWith('.in') ||
        fileName.endsWith('.inp') ||
        fileName.includes('input') ||
        /^(test|tc|case)?\d*\.in$/.test(fileName);

      const isOut =
        fileName.endsWith('.out') ||
        fileName.endsWith('.ans') ||
        fileName.includes('output') ||
        fileName.includes('answer');

      // Extract test id (number or name without extension)
      const base = fileName.replace(/\.(in|inp|out|ans|txt)$/i, '');

      if (isIn) byProblem[problemName].ins[base] = content;
      else if (isOut) byProblem[problemName].outs[base] = content;
    }

    // Build final structure
    const problems = {};
    for (const [name, data] of Object.entries(byProblem)) {
      const tests = [];
      const keys = new Set([...Object.keys(data.ins), ...Object.keys(data.outs)]);
      const sorted = [...keys].sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, ''), 10);
        const nb = parseInt(b.replace(/\D/g, ''), 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });

      for (const key of sorted) {
        if (data.ins[key] !== undefined && data.outs[key] !== undefined) {
          tests.push({
            name: key,
            input: data.ins[key],
            output: data.outs[key],
          });
        }
      }

      if (tests.length > 0) {
        problems[name] = { tests };
      }
    }

    return problems;
  });
}

// Make parseZip async properly
async function loadZip(file) {
  const zip = await JSZip.loadAsync(file);
  const files = {};
  const promises = [];

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    if (relativePath.includes('__MACOSX') || relativePath.startsWith('.')) return;

    promises.push(
      zipEntry.async('string').then((content) => {
        files[relativePath.replace(/\\/g, '/')] = content;
      })
    );
  });

  await Promise.all(promises);

  const byProblem = {};

  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length < 2) continue;

    const problemName = parts[0];
    const fileName = parts[parts.length - 1].toLowerCase();

    if (!byProblem[problemName]) byProblem[problemName] = { ins: {}, outs: {} };

    const isIn =
      fileName.endsWith('.in') ||
      fileName.endsWith('.inp') ||
      /input/.test(fileName) ||
      /^\d+\.in$/.test(fileName);

    const isOut =
      fileName.endsWith('.out') ||
      fileName.endsWith('.ans') ||
      /output|answer/.test(fileName);

    const base = fileName.replace(/\.(in|inp|out|ans|txt)$/i, '');

    if (isIn) byProblem[problemName].ins[base] = content;
    else if (isOut) byProblem[problemName].outs[base] = content;
  }

  const result = {};
  for (const [name, data] of Object.entries(byProblem)) {
    const tests = [];
    const keys = new Set([...Object.keys(data.ins), ...Object.keys(data.outs)]);
    const sorted = [...keys].sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, '') || '0', 10);
      const nb = parseInt(b.replace(/\D/g, '') || '0', 10);
      if (!isNaN(na) && !isNaN(nb) && (na || nb)) return na - nb;
      return a.localeCompare(b);
    });

    for (const key of sorted) {
      if (data.ins[key] != null && data.outs[key] != null) {
        tests.push({
          name: key,
          input: data.ins[key],
          output: data.outs[key],
        });
      }
    }

    if (tests.length) result[name] = { tests };
  }
  return result;
}

// Re-bind upload with proper async
zipInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  statusText.textContent = 'Đang đọc ZIP...';
  btnRun.disabled = true;

  try {
    problems = await loadZip(file);
    const names = Object.keys(problems);
    if (names.length === 0) {
      statusText.textContent = 'Không tìm thấy test hợp lệ trong ZIP.';
      alert(
        'Không tìm thấy cặp .in/.out.\nCấu trúc gợi ý:\nBai1/01.in + 01.out\nBai2/test1.in + test1.out'
      );
    } else {
      renderProblemList();
      statusText.textContent = `Đã tải ${names.length} bài.`;
      // Auto select first
      selectProblem(names[0]);
    }
  } catch (err) {
    console.error(err);
    statusText.textContent = 'Lỗi: ' + err.message;
  }
  zipInput.value = '';
});

// ---------- Render problem list ----------
function renderProblemList() {
  const names = Object.keys(problems).sort();
  problemCount.textContent = names.length;

  if (names.length === 0) {
    problemList.innerHTML = `
      <div class="empty-state">
        <p>Chưa có bộ test.</p>
        <p class="hint">Upload file ZIP chứa các thư mục bài và file .in / .out</p>
      </div>`;
    return;
  }

  problemList.innerHTML = names
    .map(
      (name) => `
    <div class="problem-item ${currentProblem === name ? 'active' : ''}" data-name="${escapeHtml(name)}">
      <span class="name">${escapeHtml(name)}</span>
      <span class="tests">${problems[name].tests.length} test</span>
    </div>`
    )
    .join('');

  problemList.querySelectorAll('.problem-item').forEach((el) => {
    el.addEventListener('click', () => selectProblem(el.dataset.name));
  });
}

function selectProblem(name) {
  if (!problems[name]) return;
  currentProblem = name;
  currentTitle.textContent = name;
  btnRun.disabled = false;
  renderProblemList();
  // clear previous results
  clearResults();
  statusText.textContent = `${problems[name].tests.length} testcase sẵn sàng.`;
}

// ---------- Judging ----------
btnRun.addEventListener('click', async () => {
  if (!currentProblem || isJudging) return;

  const code = codeInput.value.trim();
  if (!code) {
    alert('Hãy dán code C++ trước khi chấm.');
    return;
  }

  const tests = problems[currentProblem].tests;
  const timeLimit = parseFloat(timeLimitInput.value) || 1; // seconds
  // memLimit currently informational (Wandbox does not expose precise memory easily)

  isJudging = true;
  btnRun.disabled = true;
  statusText.textContent = 'Đang chấm...';
  clearResults();
  resultsTable.classList.remove('hidden');
  resultsEmpty.style.display = 'none';
  summary.classList.remove('hidden');

  let acCount = 0;
  const total = tests.length;

  for (let i = 0; i < total; i++) {
    const test = tests[i];
    statusText.textContent = `Đang chấm test ${i + 1}/${total}...`;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(test.name)}</td>
      <td><span class="status-badge">...</span></td>
      <td>—</td>
      <td>Đang chạy...</td>`;
    resultsBody.appendChild(row);

    const start = performance.now();
    let result;

    try {
      result = await runOnWandbox(code, test.input, timeLimit);
    } catch (err) {
      result = {
        status: 'RE',
        message: err.message || 'Network / API error',
        time: ((performance.now() - start) / 1000).toFixed(3),
        output: '',
      };
    }

    const elapsed = ((performance.now() - start) / 1000).toFixed(3);

    // Decide final status
    let finalStatus = result.status;
    let note = result.message || '';

    if (finalStatus === 'OK') {
      const got = normalizeOutput(result.output);
      const expected = normalizeOutput(test.output);
      if (got === expected) {
        finalStatus = 'AC';
        acCount++;
        note = '';
      } else {
        finalStatus = 'WA';
        note = 'Sai kết quả';
      }
    } else if (finalStatus === 'TLE') {
      note = `Vượt quá ${timeLimit}s`;
    } else if (finalStatus === 'CE') {
      note = result.message || 'Compile Error';
    } else if (finalStatus === 'RE') {
      note = result.message || 'Runtime Error';
    }

    // Update row
    const isAC = finalStatus === 'AC';
    row.className = isAC ? 'ac' : 'fail';
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(test.name)}</td>
      <td><span class="status-badge ${finalStatus.toLowerCase()}">${finalStatus}</span></td>
      <td>${elapsed}s</td>
      <td title="${escapeHtml(note)}">${escapeHtml(note.length > 40 ? note.slice(0, 40) + '…' : note)}</td>`;

    // Update summary live
    const percent = Math.round((acCount / (i + 1)) * 100);
    summaryPercent.textContent = percent + '%';
    summaryDetail.textContent = `${acCount}/${i + 1} AC`;
    summaryPercent.style.color = percent === 100 ? 'var(--success)' : percent >= 50 ? 'var(--warning)' : 'var(--danger)';

    // Small delay to be polite to the free API
    if (i < total - 1) await sleep(400);
  }

  const finalPercent = Math.round((acCount / total) * 100);
  summaryPercent.textContent = finalPercent + '%';
  summaryDetail.textContent = `${acCount}/${total} AC`;
  statusText.textContent = `Hoàn thành: ${acCount}/${total} test đúng (${finalPercent}%)`;

  isJudging = false;
  btnRun.disabled = false;
});

function clearResults() {
  resultsBody.innerHTML = '';
  resultsTable.classList.add('hidden');
  resultsEmpty.style.display = '';
  summary.classList.add('hidden');
}

btnClear.addEventListener('click', () => {
  codeInput.value = '';
  codeInput.focus();
});

// ---------- Wandbox runner ----------
async function runOnWandbox(code, stdin, timeLimitSec) {
  const controller = new AbortController();
  const timeoutMs = Math.max(timeLimitSec * 1000 + 8000, 15000); // extra for compile + network
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(WANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        compiler: COMPILER,
        stdin: stdin || '',
        options: 'warning,c++17',
        'compiler-option-raw': '-std=c++17 -O2',
        save: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    // Wandbox fields: status, program_message, program_output, compiler_error, compiler_message...
    if (data.compiler_error || (data.status === '1' && data.compiler_message)) {
      return {
        status: 'CE',
        message: (data.compiler_error || data.compiler_message || '').slice(0, 200),
        output: '',
        time: null,
      };
    }

    // status "0" usually means success
    const exitStatus = data.status;
    const output = data.program_output ?? data.program_message ?? '';

    if (exitStatus === '0' || exitStatus === 0) {
      return { status: 'OK', output, message: '', time: null };
    }

    // Non-zero exit → treat as RE (or could be TLE if signal)
    const msg = (data.program_message || data.program_error || '').slice(0, 150);
    if (/time|timeout|killed|signal/i.test(msg)) {
      return { status: 'TLE', message: msg, output, time: null };
    }

    return { status: 'RE', message: msg || `Exit ${exitStatus}`, output, time: null };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { status: 'TLE', message: `Timeout > ${timeLimitSec}s`, output: '', time: null };
    }
    throw err;
  }
}

// ---------- Helpers ----------
function normalizeOutput(s) {
  if (s == null) return '';
  // Common olympiad: strip trailing whitespace on each line + trailing newlines
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Allow Tab in textarea
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    codeInput.value =
      codeInput.value.substring(0, start) + '    ' + codeInput.value.substring(end);
    codeInput.selectionStart = codeInput.selectionEnd = start + 4;
  }
});

// Initial
statusText.textContent = 'Sẵn sàng. Hãy upload ZIP bộ test.';
