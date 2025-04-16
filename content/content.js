// 搜索框HTML模板
const searchBoxTemplate = `
  <div id="quick-search-container" class="quick-search-hidden">
    <div id="quick-search-backdrop"></div>
    <div id="quick-search-box">
     <!-- 默认图标，将在初始化时替换为当前搜索引擎图标 -->
      <div id="quick-search-engine-icon">     
      </div>
      <input id="quick-search-input" type="text" placeholder="输入搜索内容   (@切换搜索引擎  #切换打开模式)" autocomplete="off" />
      <div id="quick-search-clear">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
      <div id="quick-search-settings">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      </div>
    </div>
    <div id="quick-search-suggestions" class="quick-search-hidden"></div>
  </div>
`;

// 当前设置
let currentSettings = null;
// 当前选中的搜索引擎
let currentEngine = null;
// 临时打开模式（由#命令设置）
let currentOpenMode = null;
// 搜索建议列表
let suggestionsList = [];
// 当前选中的建议索引
let selectedSuggestionIndex = -1;
// 类别映射
let categoryMap = {};
// 打开模式列表
const openModes = [ 
  { id: 'new-tab', name: '新标签页', description: '在新标签页中打开搜索结果' },
  { id: 'current-tab', name: '当前标签页', description: '在当前标签页中打开搜索结果' },
  { id: 'new-window', name: '新窗口', description: '在新窗口中打开搜索结果' },
  { id: 'incognito', name: '隐身窗口', description: '在隐身窗口中打开搜索结果' }
];

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 确保在特殊页面不执行初始化
  if (window.location.protocol === 'chrome:' || 
      window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'edge:' ||
      window.location.protocol === 'edge-extension:' ||
      window.location.protocol === 'brave:' ||
      window.location.protocol === 'brave-extension:' ||
      window.location.protocol === 'opera:' ||
      window.location.protocol === 'opera-extension:' ||
      window.location.protocol === 'firefox:' ||
      window.location.protocol === 'firefox-extension:' ||
      window.location.protocol === 'file:' ||
      window.location.protocol === 'about:') {
    return;
  }
  initialize();
});

// 初始化
function initialize() {
  // 注入搜索框HTML
  const container = document.createElement('div');
  container.innerHTML = searchBoxTemplate;
  document.body.appendChild(container.firstElementChild);
  
  // 获取DOM元素
  const searchBackdrop = document.getElementById('quick-search-backdrop');
  const searchInput = document.getElementById('quick-search-input');
  const searchClear = document.getElementById('quick-search-clear');
  const searchSettings = document.getElementById('quick-search-settings');
  
  // 获取设置
  chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
    currentSettings = settings;
    
    // 立即应用设置
    applySettings();
    applyTheme(); // 添加主题应用
    
    // 构建类别映射
    chrome.runtime.sendMessage({ action: 'getCategories' }, (categories) => {
      if (!categories) {
        throw new Error('无法获取分类数据');
      }
      categoryMap = categories.reduce((map, category) => {
        map[category.id] = {
          name: category.name,
          order: category.order
        };
        return map;
      }, {});
      console.log('分类映射已构建');
    });
  });
  
  // 监听消息
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'openSearchBox') {
      openSearchBox();
      sendResponse({ success: true });
      return true;
    }
    
    // 处理设置更新
    if (message.action === 'settingsUpdated') {
      // 更新本地设置
      currentSettings = message.settings;
      
      // 立即应用设置
      applySettings();
      applyTheme(); // 添加主题应用
      
      sendResponse({ success: true });
      return true;
    }
    
    return false;
  });
  
  // 绑定事件
  searchBackdrop.addEventListener('click', closeSearchBox);
  searchInput.addEventListener('keydown', handleKeyDown);
  searchInput.addEventListener('input', handleInput);
  searchClear.addEventListener('click', clearSearch);
  searchSettings.addEventListener('click', openSettings);
  
  // 监听系统主题变化
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentSettings && currentSettings.theme === 'system') {
        applyTheme();
      }
    });
  }
  
  // 确保backdrop的点击事件正确处理
  if (searchBackdrop) {
    searchBackdrop.addEventListener('click', (event) => {
      // 只有当点击的是backdrop本身时才关闭
      if (event.target === searchBackdrop) {
        closeSearchBox();
      }
    });
  }
  
  // 添加全局点击事件委托
  document.addEventListener('click', (event) => {
    const searchContainer = document.getElementById('quick-search-container');
    if (!searchContainer) return;
    
    // 如果搜索框可见且点击在搜索框外部
    if (searchContainer.classList.contains('quick-search-visible') &&
        !searchContainer.contains(event.target)) {
      closeSearchBox();
    }
  });
}

// 应用主题
function applyTheme() {
  if (!currentSettings) return;
  
  // 根据主题设置更新CSS变量
  if (currentSettings.theme === 'dark' || 
      (currentSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

// 打开搜索框
function openSearchBox() {
  const searchContainer = document.getElementById('quick-search-container');
  const searchInput = document.getElementById('quick-search-input');
  const backdrop = document.getElementById('quick-search-backdrop');
  
  if (!searchContainer || !searchInput || !backdrop) return;
  
  // 禁用页面滚动
  document.body.style.overflow = 'hidden';
  
  // 重置搜索框状态
  searchInput.value = '';
  hideEngineSuggestions();
  
  // 显示搜索框
  searchContainer.classList.remove('quick-search-hidden');
  
  // 使用 requestAnimationFrame 确保在下一帧渲染时聚焦
  requestAnimationFrame(() => {
    searchContainer.classList.add('quick-search-visible');
    
    // 立即聚焦输入框
    searchInput.focus();
    
    // 确保聚焦状态，防止某些情况下失焦
    setTimeout(() => {
      if (document.activeElement !== searchInput) {
        searchInput.focus();
      }
    }, 50);
    
    // 应用背景模糊（带动画）
    requestAnimationFrame(() => {
      applyBackdropBlur();
    });
  });
  
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyDown);
}

// 关闭搜索框
function closeSearchBox() {
  const searchContainer = document.getElementById('quick-search-container');
  const searchInput = document.getElementById('quick-search-input');
  const backdrop = document.getElementById('quick-search-backdrop');
  
  if (!searchContainer || !searchInput || !backdrop) return;
  
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown);
  
  // 启用页面滚动
  document.body.style.overflow = '';
  
  // 重置背景模糊
  backdrop.style.backdropFilter = 'blur(0px)';
  backdrop.style.webkitBackdropFilter = 'blur(0px)';
  
  // 隐藏搜索框
  searchContainer.classList.remove('quick-search-visible');
  searchContainer.classList.add('quick-search-hidden');
  
  // 清理状态
  searchInput.value = '';
  searchInput.blur();
  hideEngineSuggestions();
}

// 应用背景模糊
function applyBackdropBlur() {
  const backdrop = document.getElementById('quick-search-backdrop');
  if (!backdrop || !currentSettings) return;
  
  const blurAmount = currentSettings.blurAmount;
  const blurValue = `blur(${blurAmount * 0.2}px)`; // 调整模糊系数
  
  backdrop.style.backdropFilter = blurValue;
  backdrop.style.webkitBackdropFilter = blurValue;
}

// 处理键盘事件
function handleKeyDown(event) {
  // 如果搜索框未显示，不处理任何键盘事件
  const searchContainer = document.getElementById('quick-search-container');
  if (!searchContainer || !searchContainer.classList.contains('quick-search-visible')) {
    return;
  }

  // 获取必要的DOM元素
  const searchInput = document.getElementById('quick-search-input');
  const searchSuggestions = document.getElementById('quick-search-suggestions');
  
  // 只在特定按键时阻止事件传播和默认行为
  const specialKeys = ['Escape', 'ArrowUp', 'ArrowDown', 'Enter', 'Tab'];
  if (specialKeys.includes(event.key)) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // 处理Escape键关闭
  if (event.key === 'Escape') {
    closeSearchBox();
    return;
  }
  
  // 回车键执行搜索或选择建议
  if (event.key === 'Enter') {
    if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestionsList.length) {
      // 选中了建议
      const suggestion = document.querySelectorAll('.quick-search-suggestion')[selectedSuggestionIndex];
      if (suggestion.dataset.engineId) {
        updateCurrentEngine(suggestion.dataset.engineId);
        // 清除@及其后面的内容
        searchInput.value = searchInput.value.replace(/@[^@#]*$/, '');
        hideEngineSuggestions();
        searchInput.focus();
      } else if (suggestion.dataset.openMode) {
        // 打开模式建议 - 设置临时打开模式并清除#及其后面的内容
        currentOpenMode = suggestion.dataset.openMode;
        // 清除#及其后面的内容
        searchInput.value = searchInput.value.replace(/#[^@#]*$/, '');
        hideEngineSuggestions();
        searchInput.focus();
      }
    } else if (!searchInput.value.includes('@') && !searchInput.value.includes('#')) {
      // 没有选中建议且不在选择模式，使用当前搜索引擎执行搜索
      executeSearch(currentEngine.id);
    }
    return;
  }
  
  // 上下键导航建议列表
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    if (searchSuggestions.classList.contains('quick-search-hidden') || suggestionsList.length === 0) {
      return;
    }
    
    if (event.key === 'ArrowUp') {
      // 向上导航，实现循环
      selectedSuggestionIndex--;
      if (selectedSuggestionIndex < 0) {
        selectedSuggestionIndex = suggestionsList.length - 1;
      }
    } else {
      // 向下导航，实现循环
      selectedSuggestionIndex++;
      if (selectedSuggestionIndex >= suggestionsList.length) {
        selectedSuggestionIndex = 0;
      }
    }
    
    updateSelectedSuggestion();
  }
  
  // @键显示搜索引擎列表
  if (event.key === '@') {
    // 不阻止默认行为，让@字符正常输入
    setTimeout(() => showEngineSuggestions(), 10);
  }
  
  // #键显示打开模式列表
  if (event.key === '#') {
    // 不阻止默认行为，让#字符正常输入
    setTimeout(() => showOpenModeSuggestions(), 10);
  }
}

// 处理输入事件
function handleInput(_event) {
  const searchInput = document.getElementById('quick-search-input');
  const searchClear = document.getElementById('quick-search-clear');
  
  // 显示/隐藏清除按钮
  if (searchInput.value.length > 0) {
    searchClear.style.display = 'flex';
  } else {
    searchClear.style.display = 'none';
  }
  
  // 检查是否包含@或#，显示相应的建议列表
  if (searchInput.value.includes('@')) {
    showEngineSuggestions();
  } else if (searchInput.value.includes('#')) {
    showOpenModeSuggestions();
  } else {
    hideEngineSuggestions();
  }
  
  // 添加按键视觉反馈
  searchInput.classList.add('key-pressed');
  setTimeout(() => {
    searchInput.classList.remove('key-pressed');
  }, 100);
}

// 清除搜索
function clearSearch() {
  const searchInput = document.getElementById('quick-search-input');
  const searchClear = document.getElementById('quick-search-clear');
  
  searchInput.value = '';
  searchClear.style.display = 'none';
  searchInput.focus();
  hideEngineSuggestions();
}

// 打开设置
function openSettings() {
  chrome.runtime.sendMessage({ action: 'openOptions' });
  closeSearchBox();
}

// 显示搜索引擎建议
function showEngineSuggestions() {
  const searchInput = document.getElementById('quick-search-input');
  const searchSuggestions = document.getElementById('quick-search-suggestions');
  
  // 获取输入内容中@后面的文本
  const inputText = searchInput.value;
  const match = inputText.match(/@([^@#]*)$/);
  const searchText = match ? match[1].toLowerCase() : '';
  
  // 获取所有搜索引擎和分类数据
  Promise.all([
    new Promise(resolve => chrome.runtime.sendMessage({ action: 'getSearchEngines' }, resolve)),
    new Promise(resolve => chrome.runtime.sendMessage({ action: 'getCategories' }, resolve))
  ]).then(([searchEngines, categories]) => {
    // 创建类别映射
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.id] = cat;
    });
    
    // 准备搜索引擎列表
    let allEngines = [];
    
    if (!searchEngines || !Array.isArray(searchEngines)) {
      return;
    }
    
    // 将所有搜索引擎添加到列表中
    for (const engine of searchEngines) {
      // 确保每个引擎都有图标，没有的话生成一个
      if (!engine.icon) {
        engine.icon = generateEngineIcon(engine);
      }
      allEngines.push(engine);
    }
    
    // 过滤搜索引擎 - 支持模糊匹配
    let filteredEngines = allEngines;
    
    if (searchText) {
      // 有搜索文本时，根据名称、类别进行过滤
      filteredEngines = allEngines.filter(engine => {
        const engineName = engine.name.toLowerCase();
        const categoryName = categoryMap[engine.category]?.name?.toLowerCase() || '';
        
        return engineName.includes(searchText) || categoryName.includes(searchText);
      });
      
      // 按相关性排序
      filteredEngines.sort((a, b) => {
        // 名称开头匹配的排最前
        const aStartsWithName = a.name.toLowerCase().startsWith(searchText);
        const bStartsWithName = b.name.toLowerCase().startsWith(searchText);
        if (aStartsWithName && !bStartsWithName) return -1;
        if (bStartsWithName && !aStartsWithName) return 1;
        
        // 类别匹配的排在再次
        const categoryA = categoryMap[a.category]?.name || '';
        const categoryB = categoryMap[b.category]?.name || '';
        const aMatchesCategory = categoryA.toLowerCase().includes(searchText);
        const bMatchesCategory = categoryB.toLowerCase().includes(searchText);
        if (aMatchesCategory && !bMatchesCategory) return -1;
        if (bMatchesCategory && !aMatchesCategory) return 1;
        
        // 最后按名称字母顺序排序
        return a.name.localeCompare(b.name);
      });
    } else {
      // 没有搜索文本时，按类别和名称排序
      filteredEngines.sort((a, b) => {
        const orderA = categoryMap[a.category]?.order || 999;
        const orderB = categoryMap[b.category]?.order || 999;
        
        // 先按类别排序
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // 同类别按名称排序
        return a.name.localeCompare(b.name);
      });
    }
    
    // 设置建议列表
    suggestionsList = filteredEngines;
    
    if (suggestionsList.length === 0) {
      hideEngineSuggestions();
      return;
    }
    
    // 生成建议HTML
    let suggestionsHTML = '';
    suggestionsList.forEach((engine, index) => {
      const selected = index === selectedSuggestionIndex ? 'selected' : '';
      const categoryName = categoryMap[engine.category]?.name || '其他';
      suggestionsHTML += `
        <div class="quick-search-suggestion ${selected}" data-engine-id="${engine.id}">
          <div class="quick-search-suggestion-icon">${engine.icon}</div>
          <div class="quick-search-suggestion-info">
            <div class="quick-search-suggestion-name">${engine.name}</div>
            <div class="quick-search-suggestion-category">${categoryName}</div>
          </div>
          <div class="quick-search-suggestion-mode">
            ${getOpenModeIcon(engine.type === 'single' ? engine.openMode : 'group')}
          </div>
        </div>
      `;
    });
    
    searchSuggestions.innerHTML = suggestionsHTML;
    searchSuggestions.classList.remove('quick-search-hidden');
    
    // 绑定点击事件
    const suggestions = searchSuggestions.querySelectorAll('.quick-search-suggestion');
    suggestions.forEach(suggestion => {
      suggestion.addEventListener('click', () => {
        // 更新当前搜索引擎
        updateCurrentEngine(suggestion.dataset.engineId);
        
        // 清除@及其后面的内容
        searchInput.value = searchInput.value.replace(/@[^@#]*$/, '');
        hideEngineSuggestions();
        searchInput.focus();
      });
      
      // 添加鼠标悬停时的选中效果
      suggestion.addEventListener('mouseenter', () => {
        suggestions.forEach(s => s.classList.remove('selected'));
        suggestion.classList.add('selected');
      });
    });
  });
}

// 为搜索引擎生成默认图标
function generateEngineIcon(engine) {
  // 创建一个字母图标
  const firstLetter = engine.name.charAt(0).toUpperCase();
  const colors = [
    '#4285F4', // Google 蓝
    '#EA4335', // Google 红
    '#FBBC05', // Google 黄
    '#34A853', // Google 绿
    '#FF5722', // 深橙
    '#9C27B0', // 紫色
    '#3F51B5', // 靛蓝
    '#009688', // 青色
    '#795548', // 棕色
    '#607D8B'  // 蓝灰色
  ];
  const colorIndex = Math.abs(engine.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  const bgColor = colors[colorIndex];
  
  return `
    <div class="letter-icon" style="background-color: ${bgColor}">
      ${firstLetter}
    </div>
  `;
}

// 显示打开模式建议
function showOpenModeSuggestions() {
  const searchInput = document.getElementById('quick-search-input');
  const searchSuggestions = document.getElementById('quick-search-suggestions');
  
  // 获取输入内容中#后面的文本
  const inputText = searchInput.value;
  const match = inputText.match(/#([^@#]*)$/);
  const searchText = match ? match[1].toLowerCase() : '';
  
  // 过滤打开模式 - 支持模糊匹配
  suggestionsList = openModes
    .filter(mode => {
      return mode.name.toLowerCase().includes(searchText) || 
             mode.description.toLowerCase().includes(searchText);
    });
  
  if (suggestionsList.length === 0) {
    hideEngineSuggestions();
    return;
  }
  
  // 生成建议HTML
  let suggestionsHTML = '';
  suggestionsList.forEach((mode, index) => {
    const selected = index === selectedSuggestionIndex ? 'selected' : '';
    suggestionsHTML += `
      <div class="quick-search-suggestion ${selected}" data-open-mode="${mode.id}">
        <div class="quick-search-suggestion-icon">${getOpenModeIcon(mode.id)}</div>
        <div class="quick-search-suggestion-info">
          <div class="quick-search-suggestion-name">${mode.name}</div>
          <div class="quick-search-suggestion-category">${mode.description}</div>
        </div>
      </div>
    `;
  });
  
  searchSuggestions.innerHTML = suggestionsHTML;
  searchSuggestions.classList.remove('quick-search-hidden');
  
  // 绑定点击事件
  const suggestions = searchSuggestions.querySelectorAll('.quick-search-suggestion');
  suggestions.forEach(suggestion => {
    suggestion.addEventListener('click', () => {
      // 设置临时打开模式
      currentOpenMode = suggestion.dataset.openMode;
      // 清除#及其后面的内容
      searchInput.value = searchInput.value.replace(/#[^@#]*$/, '');
      hideEngineSuggestions();
      searchInput.focus();
    });
    
    // 添加鼠标悬停时的选中效果
    suggestion.addEventListener('mouseenter', () => {
      suggestions.forEach(s => s.classList.remove('selected'));
      suggestion.classList.add('selected');
    });
  });
}

// 隐藏搜索引擎建议
function hideEngineSuggestions() {
  const searchSuggestions = document.getElementById('quick-search-suggestions');
  searchSuggestions.classList.add('quick-search-hidden');
  selectedSuggestionIndex = -1;
}

// 更新选中的建议并实现平滑滚动
function updateSelectedSuggestion() {
  const suggestions = document.querySelectorAll('.quick-search-suggestion');
  const suggestionsContainer = document.getElementById('quick-search-suggestions');

  // 更新选中状态
  suggestions.forEach((suggestion, index) => {
    if (index === selectedSuggestionIndex) {
      suggestion.classList.add('selected');
      
      // 确保选中项在可视区域内 - 实现平滑滚动
      const containerRect = suggestionsContainer.getBoundingClientRect();
      const suggestionRect = suggestion.getBoundingClientRect();
      
      // 如果选中项在容器可视区域上方，滚动到选中项
      if (suggestionRect.top < containerRect.top) {
        suggestionsContainer.scrollTo({
          top: suggestion.offsetTop - 8, // 添加一点上边距
          behavior: 'smooth'
        });
      }
      // 如果选中项在容器可视区域下方，滚动到选中项
      else if (suggestionRect.bottom > containerRect.bottom) {
        suggestionsContainer.scrollTo({
          top: suggestion.offsetTop - containerRect.height + suggestionRect.height + 8, // 添加一点下边距
          behavior: 'smooth'
        });
      }
    } else {
      suggestion.classList.remove('selected');
    }
  });
}

// 执行搜索
function executeSearch(engineId) {
  const searchInput = document.getElementById('quick-search-input');
  const searchTerms = searchInput.value.replace(/@[^@#]*$|#[^@#]*$/g, '').trim();
  
  if (searchTerms.length === 0) {
    return;
  }
  
  // 如果没有指定搜索引擎ID，使用当前搜索引擎
  if (!engineId && currentEngine) {
    engineId = currentEngine.id;
  }
  
  // 添加搜索提交动画
  const searchBox = document.getElementById('quick-search-box');
  searchBox.classList.add('search-submit');
  
  // 发送搜索请求到后台
  if (engineId === 'default' || !engineId) {
    chrome.runtime.sendMessage({
      action: 'useDefaultSearch',
      searchTerms
    });
  } else {
    chrome.runtime.sendMessage({
      action: 'search',
      searchTerms,
      engineId,
      openMode: currentOpenMode
    });
  }
  
  // 重置临时打开模式
  currentOpenMode = null;
  
  // 关闭搜索框
  setTimeout(() => {
    closeSearchBox();
    searchBox.classList.remove('search-submit');
  }, 300);
}

// 更新搜索引擎图标
function updateEngineIcon() {
  if (!currentEngine) return;
  
  const engineIcon = document.getElementById('quick-search-engine-icon');
  if (engineIcon) {
    // 如果引擎已有图标，则直接使用；否则生成一个默认图标
    engineIcon.innerHTML = currentEngine.icon || generateEngineIcon(currentEngine);
  }
}

// 获取打开模式图标
function getOpenModeIcon(mode) {
  switch (mode) {
    case 'new-tab':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';
    case 'new-window':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V8h14v10z"/></svg>';
    case 'current-tab':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>';
    case 'incognito':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
    case 'group':
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M3 5v14h18V5H3zm16 12H5V7h14v10z"/><path d="M7 9h10v2H7zm0 4h5v2H7z"/></svg>';
    default:
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';
  }
}

// 应用设置到搜索框
function applySettings() {
  if (!currentSettings) {
    return;
  }

  // 更新默认搜索引擎
  if (!currentEngine || currentSettings.defaultEngine !== currentEngine.id) {
    updateCurrentEngine(currentSettings.defaultEngine);
  }
  
  const searchContainer = document.getElementById('quick-search-container');
  const searchBox = document.getElementById('quick-search-box');
  const backdrop = document.getElementById('quick-search-backdrop');
  const searchSuggestions = document.getElementById('quick-search-suggestions');
  
  if (!searchContainer || !searchBox || !backdrop || !searchSuggestions || !searchContainer.classList.contains('quick-search-visible')) {
    return;
  }
  
  // 应用模糊度
  applyBackdropBlur();
  
  // 应用尺寸
  const width = currentSettings.searchBoxWidth || 600;
  const height = currentSettings.searchBoxHeight || 60;
  searchBox.style.width = `${width}px`;
  searchBox.style.height = `${height}px`;
  
  // 同步更新建议框宽度
  searchSuggestions.style.width = `${width}px`;
}

// 更新当前搜索引擎
function updateCurrentEngine(engineId) {
  if (!engineId) {
    return;
  }
  
  // 获取搜索引擎数据
  chrome.runtime.sendMessage({ action: 'getSearchEngines' }, (searchEngines) => {
    
    // 在所有搜索引擎中查找指定ID的搜索引擎
    for (const engine of searchEngines) {
      if (engine.id === engineId) {
        currentEngine = engine;
        // 更新搜索引擎图标
        updateEngineIcon();
        return;
      }
    }
    throw new Error(`找不到ID为 ${engineId} 的搜索引擎`);
  });
}
