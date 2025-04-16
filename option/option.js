// 当前设置
let currentSettings = null;
let darkModeMediaQuery = null;
let messageListener = null;

// 初始化
async function initialize() {
  try {
    // 获取设置
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    currentSettings = response;
    
    // 应用主题
    applyTheme();
    
    // 设置系统主题监听
    setupSystemThemeListener();
    
    // 设置消息监听
    setupMessageListener();
    
  } catch (error) {
    console.error('初始化选项页面失败:', error);
  }
}

// 设置系统主题监听
function setupSystemThemeListener() {
  if (window.matchMedia) {
    // 移除旧的监听器（如果存在）
    if (darkModeMediaQuery) {
      darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
    
    // 创建新的监听器
    darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
  }
}

// 设置消息监听
function setupMessageListener() {
  // 移除旧的监听器（如果存在）
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
  }
  
  // 创建新的监听器
  messageListener = function(message, sender, sendResponse) {
    if (message.action === 'settingsUpdated') {
      currentSettings = message.settings;
      applyTheme();
      sendResponse({ success: true });
    }
    
    return true; // 保持消息通道开启
  };
  
  // 添加监听器
  chrome.runtime.onMessage.addListener(messageListener);
}

// 处理系统主题变化
function handleSystemThemeChange(e) {
  if (currentSettings && currentSettings.theme === 'system') {
    applyTheme();
  }
}

// 应用主题
function applyTheme() {
  if (!currentSettings) return;
  
  // 根据主题设置更新CSS变量
  const isDarkMode = currentSettings.theme === 'dark' || 
                    (currentSettings.theme === 'system' && 
                     window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
}

// 初始化
document.addEventListener('DOMContentLoaded', initialize);

// 页面卸载时清理
window.addEventListener('unload', () => {
  // 移除消息监听器
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
  }
  
  // 移除系统主题监听器
  if (darkModeMediaQuery) {
    darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange);
  }
});

import { SearchEngineList } from './components/SearchEngineList.js';
import { SearchEngineForm } from './components/SearchEngineForm.js';

// 将SearchEngineForm暴露给全局，便于在其他组件中使用
window.SearchEngineForm = SearchEngineForm;

class OptionPage {
  constructor() {
    this.currentPage = 'search-engines';
    this.engineList = null;
    this.engineForm = null;
    
    this.init();
  }
  
  /**
   * 初始化选项页面
   */
  async init() {
    try {
      // 初始化搜索引擎列表
      this.engineList = new SearchEngineList('engine-list-container');
      
      // 初始化搜索引擎表单
      this.engineForm = new SearchEngineForm({
        containerId: 'engine-form-container',
        onSave: () => this.handleFormSave(),
        onCancel: () => this.handleFormCancel()
      });
      
      // 绑定事件
      this.bindEvents();
      
      // 显示初始页面
      this.showPage(this.currentPage);
      
      // 更新版本号
      this.updateAllVersionNumbers();
      
    } catch (error) {
      console.error('初始化选项页面失败:', error);
    }
  }
  
  /**
   * 绑定事件处理
   */
  bindEvents() {
    // 导航菜单点击事件
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.target.dataset.page;
        this.showPage(page);
      });
    });
  }
  
  /**
   * 显示指定页面
   * @param {string} pageId - 页面ID
   */
  showPage(pageId) {
    // 更新当前页面
    this.currentPage = pageId;
    
    // 更新导航菜单状态
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
      link.classList.toggle('active', link.dataset.page === pageId);
    });
    
    // 显示对应的页面内容
    document.querySelectorAll('.page').forEach(page => {
      page.classList.toggle('active', page.id === `${pageId}-page`);
    });
    
    // 如果切换到搜索引擎页面，确保表单隐藏，列表显示
    if (pageId === 'search-engines') {
      document.getElementById('engine-form-container').style.display = 'none';
      document.getElementById('engine-list-container').style.display = 'block';
    }
    
    // 如果是关于页面，更新动画
    if (pageId === 'about') {
      this.animateAboutSections();
    }
  }
  
  /**
   * 添加关于页面的内容动画
   */
  animateAboutSections() {
    const sections = document.querySelectorAll('.about-section');
    sections.forEach((section, index) => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      }, 100 + index * 150);
    });
  }
  
  /**
   * 处理表单保存和取消的公共方法
   */
  hideFormAndShowList() {
    document.getElementById('engine-form-container').style.display = 'none';
    document.getElementById('engine-list-container').style.display = 'block';
    this.showPage('search-engines');
  }
  
  /**
   * 处理表单保存
   */
  handleFormSave() {
    this.hideFormAndShowList();
    // 刷新列表
    this.engineList.init();
  }
  
  /**
   * 处理表单取消
   */
  handleFormCancel() {
    this.hideFormAndShowList();
  }
  
  /**
   * 更新所有版本号显示
   */
  updateAllVersionNumbers() {
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;
    
    // 更新所有显示版本号的元素
    document.querySelectorAll('#extension-version, #current-version').forEach(el => {
      if (el) el.textContent = version;
    });
  }
}

// 创建选项页面实例
new OptionPage();
