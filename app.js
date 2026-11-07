/* ==========================================================
   ZeroTrace Planner — ლოგიკა (ES6+)
   ყველა მონაცემი ინახება მხოლოდ localStorage-ში (კლიენტის მხარეს).
   ========================================================== */

(() => {
  'use strict';

  // ---------- მუდმივები ----------
  const STORAGE_KEY = 'zerotrace_planner_tasks_v1';

  // ---------- DOM ელემენტები ----------
  const form          = document.getElementById('taskForm');
  const input         = document.getElementById('taskInput');
  const list          = document.getElementById('taskList');
  const emptyState    = document.getElementById('emptyState');
  const listFooter    = document.getElementById('listFooter');
  const clearDoneBtn  = document.getElementById('clearDoneBtn');
  const clearAllBtn   = document.getElementById('clearAllBtn');
  const progressBar   = document.getElementById('progressBar');
  const progressFill  = document.getElementById('progressFill');
  const progressText  = document.getElementById('progressText');
  const progressPct   = document.getElementById('progressPercent');
  const progressCount = document.getElementById('progressCount');
  const todayDate     = document.getElementById('todayDate');

  // ---------- მდგომარეობა ----------
  /** @type {{id: string, text: string, done: boolean}[]} */
  let tasks = loadTasks();

  // ---------- localStorage ----------

  /** ჩატვირთვა — უსაფრთხოდ, შეცდომების დამუშავებით */
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      // ვტოვებთ მხოლოდ სწორი სტრუქტურის ჩანაწერებს
      return parsed.filter(
        (t) => t && typeof t.id === 'string' && typeof t.text === 'string'
      ).map((t) => ({ id: t.id, text: t.text, done: Boolean(t.done) }));
    } catch (err) {
      console.warn('მონაცემების ჩატვირთვა ვერ მოხერხდა:', err);
      return [];
    }
  }

  /** შენახვა (მაგ. კერძო რეჟიმში შეიძლება შეუძლებელი იყოს) */
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn('მონაცემების შენახვა ვერ მოხერხდა:', err);
    }
  }

  // ---------- დავალებების ოპერაციები ----------

  /** უნიკალური ID (ლოკალურად, გარე ბიბლიოთეკის გარეშე) */
  const makeId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function addTask(text) {
    const clean = text.trim();
    if (!clean) return;
    tasks.push({ id: makeId(), text: clean, done: false });
    commit();
  }

  function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    commit();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    commit();
  }

  function clearDone() {
    tasks = tasks.filter((t) => !t.done);
    commit();
  }

  function clearAll() {
    if (tasks.length && confirm('ნამდვილად გინდა ყველა დავალების წაშლა?')) {
      tasks = [];
      commit();
    }
  }

  /** ცვლილების შემდეგ: შენახვა + ხელახალი რენდერი */
  function commit() {
    saveTasks();
    render();
  }

  // ---------- რენდერი ----------

  /** ერთი დავალების <li> ელემენტის აგება (textContent — XSS-ისგან დასაცავად) */
  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task' + (task.done ? ' done' : '');
    li.dataset.id = task.id;

    const label = document.createElement('label');
    label.className = 'task-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-check';
    checkbox.checked = task.done;

    const mark = document.createElement('span');
    mark.className = 'checkmark';
    mark.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    label.append(checkbox, mark, text);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'task-delete';
    del.setAttribute('aria-label', `წაშლა: ${task.text}`);
    del.textContent = '✕';

    li.append(label, del);
    return li;
  }

  /** სიის, პროგრესის და მდგომარეობების განახლება */
  function render() {
    list.replaceChildren(...tasks.map(createTaskElement));

    const hasTasks = tasks.length > 0;
    emptyState.hidden = hasTasks;
    listFooter.hidden = !hasTasks;
    clearDoneBtn.disabled = !tasks.some((t) => t.done);
    clearDoneBtn.style.opacity = clearDoneBtn.disabled ? '0.4' : '';

    updateProgress();
  }

  /** პროცენტის გამოთვლა და ზოლის განახლება რეალურ დროში */
  function updateProgress() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    progressFill.style.width = percent + '%';
    progressPct.textContent = percent + '%';
    progressCount.textContent = `${done} / ${total} შესრულებულია`;
    progressBar.setAttribute('aria-valuenow', String(percent));
    progressBar.classList.toggle('complete', total > 0 && percent === 100);

    if (total === 0) {
      progressText.textContent = 'დავალებები ჯერ არ არის დამატებული';
    } else if (percent === 100) {
      progressText.textContent = 'შესრულებულია 100% — შესანიშნავი დღე! 🎉';
    } else {
      progressText.textContent = `შესრულებულია ${percent}%`;
    }
  }

  /** დღევანდელი თარიღის გამოტანა ქართულად */
  function showToday() {
    try {
      todayDate.textContent = new Date().toLocaleDateString('ka-GE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      todayDate.textContent = new Date().toLocaleDateString();
    }
  }

  // ---------- მოვლენები ----------

  // ახალი დავალების დამატება
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(input.value);
    form.reset();
    input.focus();
  });

  // სტატუსის შეცვლა (event delegation)
  list.addEventListener('change', (e) => {
    if (!e.target.classList.contains('task-check')) return;
    const li = e.target.closest('.task');
    if (li) toggleTask(li.dataset.id);
  });

  // წაშლა (event delegation) — მცირე გასვლის ანიმაციით
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.task-delete');
    if (!btn) return;
    const li = btn.closest('.task');
    if (!li) return;
    li.classList.add('removing');
    setTimeout(() => deleteTask(li.dataset.id), 220);
  });

  clearDoneBtn.addEventListener('click', clearDone);
  clearAllBtn.addEventListener('click', clearAll);

  // სხვა ტაბში ცვლილებისას სინქრონიზაცია
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      tasks = loadTasks();
      render();
    }
  });

  // ---------- გაშვება ----------
  showToday();
  render();
})();
