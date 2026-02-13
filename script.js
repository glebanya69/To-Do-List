// ===== CORPORATE TASK MANAGER =====

// DOM Elements
const taskInput = document.getElementById('taskInput');
const tagInput = document.getElementById('tagInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const clearCompletedBtn = document.getElementById('clearCompleted');
const filterBtns = document.querySelectorAll('.filter-btn');
const sortBtns = document.querySelectorAll('.sort-btn');
const toggleCompletedBtn = document.getElementById('toggleCompletedBtn');

// Statistics elements
const totalCount = document.getElementById('totalCount');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');

// Theme elements
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.querySelector('.theme-icon');
const themeText = document.querySelector('.theme-text');

// Toggle elements
const toggleIcon = document.querySelector('.toggle-icon');
const toggleText = document.querySelector('.toggle-text');

// State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let editingTaskId = null;
let currentSort = 'newest';
let hideCompleted = false; // false = показывать выполненные, true = скрывать

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupEventListeners();
    initTheme();
    initToggleButton(); // Инициализируем кнопку переключения
});

// ===== TASK MANAGEMENT =====

function loadTasks() {
    taskList.innerHTML = '';
    
    // 1. Фильтруем по выбранному фильтру (Все/Активные/Выполненные)
    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true;
    });
    
    // 2. Дополнительно фильтруем если скрыты выполненные
    const finalTasks = hideCompleted 
        ? filteredTasks.filter(task => !task.completed)
        : filteredTasks;
    
    // 3. Сортируем
    const sortedTasks = sortTasks(finalTasks);
    
    // 4. Рендерим
    sortedTasks.forEach(task => {
        createTaskElement(task);
    });
    
    // 5. Обновляем статистику
    updateStatistics();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''} priority-${task.priority}`;
    li.dataset.id = task.id;
    
    // Скрываем задачу если она выполнена И мы в режиме скрытия
    if (hideCompleted && task.completed) {
        li.style.display = 'none';
    }
    
    // Создаем HTML для тегов
    const tagsHTML = task.tags && task.tags.length > 0 
        ? `<div class="tag-container">${task.tags.map(tag => 
            `<span class="tag">${tag}</span>`
          ).join('')}</div>`
        : '';
    
    li.innerHTML = `
        <div class="task-status ${task.completed ? 'completed' : 'active'}"></div>
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="task-content">
            <span class="task-text" contenteditable="false">${task.text}</span>
            ${tagsHTML}
        </div>
        <span class="task-date">${formatDate(task.createdAt)}</span>
        <button class="delete-btn">×</button>
    `;
    
    // Checkbox handler
    const checkbox = li.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        li.className = `task-item ${task.completed ? 'completed' : ''} priority-${task.priority}`;
        li.querySelector('.task-status').className = `task-status ${task.completed ? 'completed' : 'active'}`;
        
        // Если скрываем выполненные и задача стала выполненной - скрываем её
        if (hideCompleted && task.completed) {
            li.style.display = 'none';
        }
        
        saveTasks();
        updateStatistics();
    });
    
    // Delete handler
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        if (confirm('Удалить эту задачу?')) {
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
            loadTasks();
        }
    });
    
    // Double-click to edit
    const taskText = li.querySelector('.task-text');
    taskText.addEventListener('dblclick', () => {
        if (editingTaskId === null) {
            editingTaskId = task.id;
            taskText.contentEditable = true;
            taskText.focus();
            
            // Select all text
            const range = document.createRange();
            range.selectNodeContents(taskText);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Save on blur or Enter
            const saveEdit = () => {
                const newText = taskText.textContent.trim();
                if (newText && newText !== task.text) {
                    task.text = newText;
                    saveTasks();
                }
                taskText.contentEditable = false;
                editingTaskId = null;
                taskText.removeEventListener('blur', saveEdit);
            };
            
            taskText.addEventListener('blur', saveEdit);
            taskText.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    taskText.blur();
                }
            });
        }
    });
    
    taskList.appendChild(li);
}

function addNewTask() {
    const text = taskInput.value.trim();
    const priority = document.getElementById('prioritySelect').value;
    const tagInputValue = tagInput.value.trim();
    
    // Разбиваем теги по запятой, чистим от пробелов
    const tags = tagInputValue 
        ? tagInputValue.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];
    
    if (!text) {
        showError('Пожалуйста, введите текст задачи');
        return;
    }
    
    const newTask = {
        id: Date.now(),
        text: text,
        priority: priority,
        tags: tags,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    taskInput.value = '';
    tagInput.value = '';
    saveTasks();
    loadTasks();
    
    // Scroll to new task
    if (taskList.lastElementChild) {
        taskList.lastElementChild.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }
}

function clearCompletedTasks() {
    const completedTasks = tasks.filter(t => t.completed).length;
    
    if (completedTasks === 0) {
        showError('Нет завершенных задач для очистки');
        return;
    }
    
    if (confirm(`Удалить ${completedTasks} завершенную задачу?`)) {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        loadTasks();
    }
}

function updateStatistics() {
    // Если скрыты выполненные - считаем только видимые задачи
    let tasksToCount = tasks;
    if (hideCompleted) {
        tasksToCount = tasks.filter(t => !t.completed);
    }
    
    const total = tasksToCount.length;
    const completed = tasksToCount.filter(t => t.completed).length;
    const active = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    totalCount.textContent = total;
    activeCount.textContent = active;
    completedCount.textContent = completed;
    progressFill.style.width = `${progress}%`;
    progressPercent.textContent = `${progress}%`;
}

// ===== FILTER FUNCTIONS =====

function setFilter(filter) {
    currentFilter = filter;
    
    // Update active filter button
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    loadTasks();
}

// ===== SORT FUNCTIONS =====

function sortTasks(tasksArray) {
    const sorted = [...tasksArray];
    
    switch(currentSort) {
        case 'newest':
            return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
        case 'oldest':
            return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            
        case 'priority':
            // Приоритет: high > medium > low
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return sorted.sort((a, b) => {
                if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                }
                // Если приоритет одинаковый - по дате (новые сверху)
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
        default:
            return sorted;
    }
}

function setSort(sortType) {
    currentSort = sortType;
    
    // Update active sort button
    sortBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === sortType);
    });
    
    loadTasks();
}

// ===== TOGGLE COMPLETED TASKS =====

function initToggleButton() {
    // Устанавливаем начальное состояние кнопки
    updateToggleButton();
}

function toggleCompletedTasks() {
    // Переключаем состояние
    hideCompleted = !hideCompleted;
    
    // Обновляем кнопку
    updateToggleButton();
    
    // Перезагружаем задачи
    loadTasks();
}

function updateToggleButton() {
    if (hideCompleted) {
        // Режим "скрыто"
        toggleIcon.textContent = '👁️‍🗨️';
        toggleText.textContent = 'Показать выполненные';
        toggleCompletedBtn.classList.add('hidden');
    } else {
        // Режим "показано"
        toggleIcon.textContent = '👁️';
        toggleText.textContent = 'Скрыть выполненные';
        toggleCompletedBtn.classList.remove('hidden');
    }
}

// ===== THEME MANAGEMENT =====

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update toggle button
    if (theme === 'dark') {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Светлая тема';
    } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Темная тема';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// ===== STORAGE =====

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// ===== UI HELPERS =====

function showError(message) {
    taskInput.style.borderColor = '#e53e3e';
    taskInput.style.boxShadow = '0 0 0 3px rgba(229, 62, 62, 0.1)';
    
    setTimeout(() => {
        taskInput.style.borderColor = '';
        taskInput.style.boxShadow = '';
    }, 2000);
    
    console.log('Error:', message);
}

// ===== DATE HELPERS =====
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).replace(' г.', '');
}

// ===== EVENT LISTENERS =====

function setupEventListeners() {
    // Add task
    addBtn.addEventListener('click', addNewTask);
    
    // Add task on Enter (только в поле задачи)
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewTask();
        }
    });
    
    // Также Enter в поле тегов
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewTask();
        }
    });
    
    // Clear completed tasks
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    
    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setFilter(btn.dataset.filter);
        });
    });
    
    // Sort buttons
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setSort(btn.dataset.sort);
        });
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Toggle completed tasks
    toggleCompletedBtn.addEventListener('click', toggleCompletedTasks);
    
    // Prevent Enter key in task input from submitting form
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
    
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
}