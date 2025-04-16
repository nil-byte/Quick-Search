// 导入存储管理器
import StorageManager from '../utils/storage.js';

// 当前设置
let currentSettings = null;
// 搜索引擎列表
let searchEngines = null;

// 初始化
async function initialize() {
  try {
    // 获取设置
    currentSettings = await StorageManager.getSettings();
    // 获取搜索引擎
    searchEngines = await StorageManager.getSearchEngines();
    
    // 应用设置到界面
    applyTheme();
    applySize();
    applyBackdropBlur();

    // 绑定事件
    bindEvents();
    
    // 填充搜索引擎下拉框
    populateEngineSelect();
    
    // 获取并显示快捷键
    displayShortcuts();
  } catch (error) {
    console.error('初始化弹出窗口失败:', error);
  }
}

// 应用主题
function applyTheme() {
  // 移除所有主题按钮的激活状态
  document.querySelectorAll('.theme-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // 激活当前主题按钮
  const themeButton = document.getElementById(`theme-${currentSettings.theme}`);
  if (themeButton) {
    themeButton.classList.add('active');
  }
  
  // 应用主题类到 body
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-system');
  document.body.classList.add(`theme-${currentSettings.theme}`);
  
  // 根据主题设置更新CSS变量
  const isDarkMode = currentSettings.theme === 'dark' || 
                    (currentSettings.theme === 'system' && 
                     window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
}

// 应用搜索框尺寸
function applySize() {
  const widthInput = document.getElementById('search-box-width');
  const heightInput = document.getElementById('search-box-height');
  widthInput.value = currentSettings.searchBoxWidth;
  heightInput.value = currentSettings.searchBoxHeight;
}

// 应用背景模糊度
function applyBackdropBlur() {
  const blurSlider = document.getElementById('blur-amount');
  const blurValue = document.getElementById('blur-amount-value');
  blurSlider.value = currentSettings.blurAmount;
  blurValue.textContent = `${currentSettings.blurAmount}%`;
}

// 填充搜索引擎下拉框
function populateEngineSelect() {
  const engineSelect = document.getElementById('default-engine');
  
  // 清空现有选项
  engineSelect.innerHTML = '';
  
  // 创建一个所有单一搜索引擎的列表
  const singleEngines = searchEngines.filter(engine => engine.type === 'single');
  
  // 添加到选择框
  singleEngines.forEach(engine => {
    const option = document.createElement('option');
    option.value = engine.id;
    option.textContent = engine.name;
    option.selected = engine.id === currentSettings.defaultEngine;
    engineSelect.appendChild(option);
  });
  
  // 设置下拉框的大小，确保只显示4个选项
  engineSelect.size = 1; // 默认关闭状态只显示1个
  
  // 添加事件监听器，在打开下拉框时调整大小
  engineSelect.addEventListener('mousedown', function() {
    // 设置下拉框大小，最多显示4个选项
    this.size = Math.min(4, singleEngines.length);
  });
  
  // 在选择后恢复默认大小
  engineSelect.addEventListener('change', function() {
    this.size = 1;
  });
  
  // 在失去焦点时恢复默认大小
  engineSelect.addEventListener('blur', function() {
    this.size = 1;
  });
}

// 获取并显示快捷键
function displayShortcuts() {
  chrome.commands.getAll(commands => {
    const searchCommand = commands.find(command => command.name === 'open_search_box');
    if (searchCommand && searchCommand.shortcut) {
      displayShortcut('search-shortcut', searchCommand.shortcut);
    } else {
      document.getElementById('search-shortcut').textContent = '未设置';
    }
  });
}

// 显示快捷键
function displayShortcut(elementId, shortcut) {
  const element = document.getElementById(elementId);
  if (!element || !shortcut) return;
  
  // 解析快捷键
  const keys = shortcut.split('+');
  let html = '';
  
  keys.forEach(key => {
    html += `<span class="key">${key}</span>`;
  });
  
  element.innerHTML = html;
}

// 绑定事件
function bindEvents() {
  // 主题切换
  document.getElementById('theme-light').addEventListener('click', () => updateTheme('light'));
  document.getElementById('theme-dark').addEventListener('click', () => updateTheme('dark'));
  document.getElementById('theme-system').addEventListener('click', () => updateTheme('system'));
  
  // 监听系统主题变化
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentSettings.theme === 'system') {
        applyTheme();
      }
    });
  }
  
  // 背景模糊度
  const blurSlider = document.getElementById('blur-amount');
  const blurValue = document.getElementById('blur-amount-value');
  blurSlider.addEventListener('input', () => {
    const value = blurSlider.value;
    blurValue.textContent = `${value}%`;
    updateSettings({ blurAmount: parseInt(value) });
  });
  
  // 自定义尺寸
  const widthInput = document.getElementById('search-box-width');
  const heightInput = document.getElementById('search-box-height');
  widthInput.addEventListener('input', () => {
    let width = parseInt(widthInput.value) || 600;
    width = Math.max(300, Math.min(width, 1200));
    widthInput.value = width;
    updateSettings({ searchBoxWidth: width });
  });
  
  heightInput.addEventListener('input', () => {
    let height = parseInt(heightInput.value) || 60;
    height = Math.max(40, Math.min(height, 100));
    heightInput.value = height;
    updateSettings({ searchBoxHeight: height });
  });
  
  // 默认搜索引擎
  const engineSelect = document.getElementById('default-engine');
  
  // 选择引擎时更新设置
  engineSelect.addEventListener('change', (e) => {
    const engineId = e.target.value;
    updateSettings({ defaultEngine: engineId });
    
    // 视觉反馈
    const select = e.target;
    const originalColor = select.style.backgroundColor;
    select.style.backgroundColor = 'rgba(66, 133, 244, 0.2)';
    setTimeout(() => {
      select.style.backgroundColor = originalColor;
    }, 300);
  });
  
  // 修改快捷键
  document.getElementById('edit-shortcut').addEventListener('click', openShortcutsPage);
  
  // 恢复默认设置
  document.getElementById('reset-settings').addEventListener('click', resetAllSettings);
  
  // 打开高级设置
  document.getElementById('open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// 打开快捷键设置页面
function openShortcutsPage() {
  // 根据浏览器类型打开对应的快捷键设置页面
  const ua = navigator.userAgent;
  let shortcutsUrl = 'chrome://extensions/shortcuts';
  
  if (ua.includes('Firefox')) {
    shortcutsUrl = 'about:addons';
  } else if (ua.includes('Edge')) {
    shortcutsUrl = 'edge://extensions/shortcuts';
  } else if (ua.includes('Brave')) {
    shortcutsUrl = 'brave://extensions/shortcuts';
  } else if (ua.includes('Opera')) {
    shortcutsUrl = 'opera://extensions/shortcuts';
  }
  
  chrome.tabs.create({ url: shortcutsUrl });
}

// 重置所有设置
async function resetAllSettings() {
  if (confirm('确定要恢复所有基础设置为默认值吗？')) {
    await StorageManager.resetToDefault();
    window.location.reload();
  }
}

// 更新主题
async function updateTheme(theme) {
  try {
    // 更新当前设置
    currentSettings.theme = theme;
    
    // 应用新主题
    applyTheme();
    
    // 更新存储中的设置
    await StorageManager.updateSettings({ theme });
    
    // 视觉反馈
    const button = document.getElementById(`theme-${theme}`);
    if (button) {
      button.style.transform = 'scale(1.1)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 200);
    }
  } catch (error) {
    console.error('更新主题失败:', error);
    // 恢复之前的主题
    applyTheme();
  }
}

// 更新设置
async function updateSettings(newSettings) {
  try {
    currentSettings = { ...currentSettings, ...newSettings };
    await StorageManager.updateSettings(newSettings);
  } catch (error) {
    console.error('更新设置失败:', error);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', initialize);
