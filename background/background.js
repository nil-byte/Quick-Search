// 导入存储管理器，负责操作本地存储的相关功能
import StorageManager from '../utils/storage.js';

// 不支持内容脚本的URL前缀列表
const UNSUPPORTED_URL_PREFIXES = [
  'chrome://', 'chrome-extension://',
  'edge://', 'edge-extension://',
  'brave://', 'brave-extension://',
  'opera://', 'opera-extension://',
  'firefox://', 'firefox-extension://',
  'file://', 'about:'
];

/**
 * 检查URL是否支持内容脚本
 * @param {string} url 要检查的URL
 * @returns {boolean} 如果支持返回true，否则返回false
 */
function isContentScriptSupported(url) {
  if (!url) return false;
  
  for (const prefix of UNSUPPORTED_URL_PREFIXES) {
    if (url.startsWith(prefix)) {
      return false;
    }
  }
  
  return true;
}

// 监听扩展程序的安装事件
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // 如果是首次安装，初始化设置为默认值
    await StorageManager.init();
  }
});

// 监听快捷键事件
chrome.commands.onCommand.addListener((command) => {
  
  if (command === 'open_search_box') {
    // 如果触发的是打开搜索框的快捷键
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        return;
      }
      
      const tab = tabs[0];
      
      // 检查当前标签页的URL是否支持内容脚本
      if (!isContentScriptSupported(tab.url)) {
        console.log('不支持在此页面使用搜索框');
        return;
      }
      
      // 检查标签页的加载状态，只有当页面完全加载时才允许执行
      if (tab.status !== 'complete') {
        return;
      }
      
      try {
        // 向活动标签页发送消息，打开搜索框
        await chrome.tabs.sendMessage(tab.id, { action: 'openSearchBox' });
      } catch (error) {
        // 忽略连接错误，这通常意味着content script还没准备好
        if (error.message.includes('Could not establish connection')) {
          return;
        }
        throw error;
      }
    });
  }
});

/**
 * 处理连接错误
 * @param {Error} error 错误对象
 * @returns {boolean} 如果是连接错误返回true，否则抛出异常
 */
function handleConnectionError(error) {
  if (error.message.includes('Could not establish connection')) {
    return true;
  }
  throw error;
}

// 监听来自内容脚本或弹出窗口的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    // 处理搜索请求
    if (message.action === 'search') {
      // 获取搜索关键字、搜索引擎ID和打开模式，并进行搜索处理
      handleSearch(message.searchTerms, message.engineId, message.openMode);
      sendResponse({ success: true });
      return true;
    }
    
    // 处理使用默认搜索引擎的请求
    if (message.action === 'useDefaultSearch') {
      // 使用Chrome Search API进行搜索
      handleDefaultSearch(message.searchTerms);
      sendResponse({ success: true });
      return true;
    }
    
    // 获取设置
    if (message.action === 'getSettings') {
      // 从存储中获取设置并返回
      StorageManager.getSettings()
        .then(settings => sendResponse(settings))
        .catch(error => { throw error; });
      return true;
    }
    
    // 获取搜索引擎
    if (message.action === 'getSearchEngines') {
      // 从存储中获取搜索引擎并返回
      StorageManager.getSearchEngines()
        .then(engines => sendResponse(engines))
        .catch(error => { throw error; });
      return true;
    }

    // 获取分类
    if (message.action === 'getCategories') {
      StorageManager.getCategories()
        .then(categories => sendResponse(categories))
        .catch(error => { throw error; });
      return true;
    }

    // 打开设置页面
    if (message.action === 'openOptions') {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      return true;
    }
    
    // 默认响应
    sendResponse({ success: false, error: '未知的操作' });
    return true;
  } catch (error) {
    sendResponse({ success: false, error: error.message });
    return true;
  }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings) {
    // 存储的设置变化时，向所有页面广播设置更新
    chrome.tabs.query({}, (tabs) => {
      // 向所有标签页广播
      tabs.forEach(tab => {
        if (tab.url && isContentScriptSupported(tab.url)) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            settings: changes.settings.newValue
          }).catch(handleConnectionError);
        }
      });
    });

    // 向所有扩展页面广播
    chrome.runtime.sendMessage({
      action: 'settingsUpdated',
      settings: changes.settings.newValue
    }).catch(handleConnectionError);
  }
});

// 处理搜索请求的函数
async function handleSearch(searchTerms, engineId, overrideOpenMode) {
  try {
    // 获取当前设置和搜索引擎列表
    const searchEngines = await StorageManager.getSearchEngines();
    
    // 查找对应的搜索引擎
    const useEngine = searchEngines.find(engine => engine.id === engineId);
    
    if (!useEngine) {
      throw new Error(`找不到ID为 ${engineId} 的搜索引擎`);
    }
    
    // 根据引擎类型处理搜索
    if (useEngine.type === 'single') {
      // 如果是单个搜索引擎，替换URL中的搜索关键字并打开搜索结果
      const url = useEngine.searchUrl.replace('{searchTerms}', encodeURIComponent(searchTerms));
      openSearchResult(url, overrideOpenMode || useEngine.openMode);
    } else if (useEngine.type === 'group') {
      // 如果是组合搜索引擎，依次打开每个子引擎的搜索结果
      useEngine.engines.forEach(item => {
        const subEngine = searchEngines.find(engine => engine.id === item.id);
        
        if (subEngine) {
          const url = subEngine.searchUrl.replace('{searchTerms}', encodeURIComponent(searchTerms));
          openSearchResult(url, item.overrideOpenMode || subEngine.openMode);
        }
      });
    }
  } catch (error) {
    throw error;
  }
}

// 根据打开模式打开搜索结果的函数
function openSearchResult(url, openMode) {
  switch (openMode) {
    case 'new-tab':  // 在新标签页中打开
      chrome.tabs.create({ url });
      break;
    case 'new-window':       // 在新窗口中打开
      chrome.windows.create({ url });
      break;
    case 'current-tab':     // 在当前标签页中打开
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url });
        }
      });
      break;
    case 'incognito':       // 在隐身模式下打开
      chrome.windows.create({ url, incognito: true });
      break;
    default:  // 默认在新标签页中打开
      chrome.tabs.create({ url });
      break;
  }
}

/**
 * 使用Chrome Search API进行默认搜索
 * @param {string} searchTerms 搜索关键词
 */
async function handleDefaultSearch(searchTerms) {
  try {
    // 使用Chrome Search API进行搜索
    chrome.search.query({
      text: searchTerms,
      disposition: 'NEW_TAB'  // 在新标签页中打开搜索结果
    }, () => {
      // 搜索完成后的回调，可以为空
      if (chrome.runtime.lastError) {
        console.error('搜索出错:', chrome.runtime.lastError);
      }
    });
  } catch (error) {
    console.error('执行默认搜索时出错:', error);
  }
}