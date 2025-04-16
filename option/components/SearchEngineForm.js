import StorageManager from '../../utils/storage.js';

export class SearchEngineForm {
  /**
   * 创建搜索引擎表单组件
   * @param {Object} config 配置项
   * @param {string} config.containerId - 容器元素ID
   * @param {Function} config.onSave - 保存成功的回调函数
   * @param {Function} config.onCancel - 取消编辑的回调函数
   */
  constructor(config) {
    this.container = document.getElementById(config.containerId);
    this.onSave = config.onSave;
    this.onCancel = config.onCancel;
    this.categories = [];
    this.editingEngine = null;
    
    if (!this.container) {
      throw new Error(`找不到ID为 ${config.containerId} 的容器元素`);
    }
  }
  
  /**
   * 初始化表单
   * @param {Object} [engine] - 要编辑的搜索引擎数据
   */
  async init(engine = null) {
    try {
      // 获取分类数据
      this.categories = await StorageManager.getCategories();
      this.editingEngine = engine;
      
      // 渲染表单
      await this.render();
      
      // 绑定事件
      this.bindEvents();
      
    } catch (error) {
      console.error('初始化搜索引擎表单失败:', error);
      this.showError('加载表单数据失败，请重试');
    }
  }
  
  /**
   * 渲染表单
   */
  async render() {
    const isEdit = !!this.editingEngine;
    
    // 如果是编辑组合搜索引擎，先获取组合搜索引擎的HTML
    let groupEnginesHtml = '';
    if (isEdit && this.editingEngine.type === 'group') {
      groupEnginesHtml = await this.renderGroupEngines();
    }
    
    let html = `
      <div class="search-engine-form">
        <h2>${isEdit ? '编辑' : '添加'}搜索引擎</h2>
        <form id="engineForm">
          <div class="form-group">
            <label for="name">名称</label>
            <input type="text" id="name" name="name" required 
              value="${isEdit ? this.editingEngine.name : ''}" />
          </div>
          
          <div class="form-group">
            <label for="category">分类</label>
            <select id="category" name="categoryId">
              <option value="">未分类</option>
              ${this.categories.map(category => `
                <option value="${category.id}" 
                  ${isEdit && (this.editingEngine.categoryId === category.id || this.editingEngine.category === category.id) ? 'selected' : ''}>
                  ${category.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="type">类型</label>
            <select id="type" name="type" required>
              <option value="single" ${isEdit && this.editingEngine.type === 'single' ? 'selected' : ''}>
                单个搜索
              </option>
              <option value="group" ${isEdit && this.editingEngine.type === 'group' ? 'selected' : ''}>
                组合搜索
              </option>
            </select>
          </div>
          
          <div class="form-group icon-group">
            <label>图标</label>
            <div class="icon-preview">
              ${isEdit && this.editingEngine.icon ? 
                `<div class="current-icon">${this.editingEngine.icon}</div>` : 
                '<div class="placeholder-icon">无图标</div>'}
            </div>
            <div class="icon-options">
              <label class="icon-option">
                <input type="radio" name="iconType" value="auto" ${isEdit && this.editingEngine.type === 'group' ? '' : 'checked'}>
                自动获取网站图标
              </label>
              <label class="icon-option">
                <input type="radio" name="iconType" value="url">
                图标URL
              </label>
              <label class="icon-option">
                <input type="radio" name="iconType" value="svg">
                SVG代码
              </label>
            </div>
            <div class="icon-inputs">
              <div class="icon-input auto-icon">
                <button type="button" id="fetchFavicon">获取网站图标</button>
                <span class="hint">基于搜索URL自动获取网站图标</span>
              </div>
              <div class="icon-input url-icon" style="display: none;">
                <input type="text" id="iconUrl" name="iconUrl" placeholder="输入图标URL">
                <button type="button" id="previewUrlIcon">预览</button>
              </div>
              <div class="icon-input svg-icon" style="display: none;">
                <textarea id="svgCode" name="svgCode" placeholder="输入SVG图标代码"></textarea>
                <button type="button" id="previewSvgIcon">预览</button>
              </div>
              <input type="hidden" id="iconData" name="iconData" value="${isEdit && this.editingEngine.icon ? this.editingEngine.icon.replace(/"/g, '&quot;') : ''}">
            </div>
          </div>
          
          <div class="form-group" id="singleEngineFields" 
            style="display: ${!isEdit || this.editingEngine.type === 'single' ? 'block' : 'none'}">
            <label for="searchUrl">搜索URL</label>
            <input type="text" id="searchUrl" name="searchUrl" 
              placeholder="使用 {searchTerms} 作为搜索关键词占位符"
              value="${isEdit && this.editingEngine.type === 'single' ? this.editingEngine.searchUrl : ''}" />
            
            <label for="openMode">打开方式</label>
            <select id="openMode" name="openMode">
              <option value="new-tab" ${isEdit && this.editingEngine.openMode === 'new-tab' ? 'selected' : ''}>
                新标签页
              </option>
              <option value="new-window" ${isEdit && this.editingEngine.openMode === 'new-window' ? 'selected' : ''}>
                新窗口
              </option>
              <option value="current-tab" ${isEdit && this.editingEngine.openMode === 'current-tab' ? 'selected' : ''}>
                当前标签页
              </option>
              <option value="incognito" ${isEdit && this.editingEngine.openMode === 'incognito' ? 'selected' : ''}>
                隐身窗口
              </option>
            </select>
          </div>
          
          <div class="form-group" id="groupEngineFields" 
            style="display: ${isEdit && this.editingEngine.type === 'group' ? 'block' : 'none'}">
            <label>组合搜索引擎</label>
            <div id="groupEngineList">
              ${groupEnginesHtml}
            </div>
            <button type="button" id="addGroupEngine">添加搜索引擎</button>
          </div>
          
          <div class="form-actions">
            <button type="submit">保存</button>
            <button type="button" class="cancel-btn">取消</button>
          </div>
        </form>
      </div>
    `;
    
    this.container.innerHTML = html;
  }
  
  /**
   * 渲染组合搜索引擎列表
   * @returns {Promise<string>} HTML字符串的Promise
   */
  async renderGroupEngines() {
    if (!this.editingEngine || !this.editingEngine.engines) {
      return '';
    }
    
    // 获取所有搜索引擎
    const engines = await StorageManager.getSearchEngines();
    const singleEngines = engines.filter(engine => engine.type === 'single');
    
    // 构建HTML
    return this.editingEngine.engines.map((item, index) => `
      <div class="group-engine-item" data-index="${index}">
        <select name="engines[${index}].id" required>
          ${singleEngines.map(engine => `
            <option value="${engine.id}" ${engine.id === item.id ? 'selected' : ''}>
              ${engine.name}
            </option>
          `).join('')}
        </select>
        <select name="engines[${index}].openMode">
          <option value="">使用默认打开方式</option>
          <option value="new-tab" ${item.overrideOpenMode === 'new-tab' ? 'selected' : ''}>新标签页</option>
          <option value="new-window" ${item.overrideOpenMode === 'new-window' ? 'selected' : ''}>新窗口</option>
          <option value="current-tab" ${item.overrideOpenMode === 'current-tab' ? 'selected' : ''}>当前标签页</option>
          <option value="incognito" ${item.overrideOpenMode === 'incognito' ? 'selected' : ''}>隐身窗口</option>
        </select>
        <button type="button" class="remove-group-engine">删除</button>
      </div>
    `).join('');
  }
  
  /**
   * 绑定事件处理
   */
  bindEvents() {
    const form = this.container.querySelector('#engineForm');
    const typeSelect = form.querySelector('#type');
    const addGroupEngineBtn = form.querySelector('#addGroupEngine');
    const cancelBtn = form.querySelector('.cancel-btn');
    
    // 类型切换事件
    typeSelect.addEventListener('change', (e) => {
      const isSingle = e.target.value === 'single';
      form.querySelector('#singleEngineFields').style.display = isSingle ? 'block' : 'none';
      form.querySelector('#groupEngineFields').style.display = isSingle ? 'none' : 'block';
      
      // 如果切换到组合搜索引擎，自动选择SVG图标选项
      if (!isSingle) {
        const autoRadio = form.querySelector('input[name="iconType"][value="auto"]');
        const svgRadio = form.querySelector('input[name="iconType"][value="svg"]');
        
        if (autoRadio && svgRadio) {
          autoRadio.checked = false;
          svgRadio.checked = true;
          
          // 隐藏所有输入框
          form.querySelectorAll('.icon-input').forEach(input => {
            input.style.display = 'none';
          });
          
          // 显示SVG输入框
          form.querySelector('.svg-icon').style.display = 'block';
          
          // 提示用户
          this.showInfo('组合搜索引擎推荐使用SVG图标，已自动切换到SVG模式');
        }
      }
    });
    
    // 图标类型切换事件
    const iconTypeRadios = form.querySelectorAll('input[name="iconType"]');
    iconTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        // 隐藏所有输入框
        form.querySelectorAll('.icon-input').forEach(input => {
          input.style.display = 'none';
        });
        
        // 显示选中类型的输入框
        const selectedType = form.querySelector('input[name="iconType"]:checked').value;
        form.querySelector(`.${selectedType}-icon`).style.display = 'block';
      });
    });
    
    // 自动获取网站图标
    const fetchFaviconBtn = form.querySelector('#fetchFavicon');
    if (fetchFaviconBtn) {
      fetchFaviconBtn.addEventListener('click', () => {
        // 检查当前类型
        const isGroupType = form.querySelector('#type').value === 'group';
        
        if (isGroupType) {
          // 组合搜索引擎时，提示用户需要手动选择图标
          this.showError('组合搜索引擎需要手动设置图标。请选择"图标URL"或"SVG代码"选项。');
          
          // 自动切换到SVG模式
          const svgRadio = form.querySelector('input[name="iconType"][value="svg"]');
          if (svgRadio) {
            svgRadio.checked = true;
            // 隐藏所有输入框
            form.querySelectorAll('.icon-input').forEach(input => {
              input.style.display = 'none';
            });
            // 显示SVG输入框
            form.querySelector('.svg-icon').style.display = 'block';
          }
          
          return;
        }
        
        // 单个搜索引擎的处理逻辑
        const searchUrl = form.querySelector('#searchUrl').value;
        if (!searchUrl) {
          this.showError('请先输入搜索URL');
          return;
        }
        
        try {
          // 从搜索URL中提取域名
          let domain = '';
          try {
            const url = new URL(searchUrl.replace('{searchTerms}', 'test'));
            domain = url.hostname;
          } catch (e) {
            // 尝试从字符串中提取域名
            const match = searchUrl.match(/https?:\/\/([^\/]+)/);
            if (match) {
              domain = match[1];
            } else {
              throw new Error('无法解析URL');
            }
          }
          
          if (!domain) {
            throw new Error('无法获取域名');
          }
          
          // 使用Google的favicon服务获取图标
          const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
          
          // 创建图像元素以获取图标
          const img = document.createElement('img');
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            // 创建Canvas来转换图像
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            try {
              // 尝试将图标转换为DataURL
              const dataUrl = canvas.toDataURL('image/png');
              const iconHtml = `<img src="${dataUrl}" class="img-icon" alt="${domain}的图标">`;
              
              // 更新预览和隐藏字段
              const iconPreview = form.querySelector('.icon-preview');
              iconPreview.innerHTML = `<div class="current-icon">${iconHtml}</div>`;
              form.querySelector('#iconData').value = iconHtml;
              
              this.showSuccess('成功获取图标');
            } catch (e) {
              this.showError('无法处理图标: ' + e.message);
            }
          };
          
          img.onerror = () => {
            this.showError('无法加载图标');
          };
          
          img.src = iconUrl;
          
        } catch (error) {
          this.showError('获取图标失败: ' + error.message);
        }
      });
    }
    
    // URL图标预览
    const previewUrlIconBtn = form.querySelector('#previewUrlIcon');
    if (previewUrlIconBtn) {
      previewUrlIconBtn.addEventListener('click', () => {
        const iconUrl = form.querySelector('#iconUrl').value;
        if (!iconUrl) {
          this.showError('请输入图标URL');
          return;
        }
        
        const img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        img.className = 'img-icon';
        img.alt = '图标预览';
        
        img.onload = () => {
          // 更新预览和隐藏字段
          const iconPreview = form.querySelector('.icon-preview');
          const iconHtml = `<img src="${iconUrl}" class="img-icon" alt="用户图标">`;
          iconPreview.innerHTML = `<div class="current-icon">${iconHtml}</div>`;
          form.querySelector('#iconData').value = iconHtml;
        };
        
        img.onerror = () => {
          this.showError('无法加载图标URL');
        };
        
        img.src = iconUrl;
      });
    }
    
    // SVG代码预览
    const previewSvgIconBtn = form.querySelector('#previewSvgIcon');
    if (previewSvgIconBtn) {
      previewSvgIconBtn.addEventListener('click', () => {
        const svgCode = form.querySelector('#svgCode').value;
        if (!svgCode) {
          this.showError('请输入SVG代码');
          return;
        }
        
        if (!svgCode.includes('<svg') || !svgCode.includes('</svg>')) {
          this.showError('无效的SVG代码');
          return;
        }
        
        try {
          // 更新预览和隐藏字段
          const iconPreview = form.querySelector('.icon-preview');
          iconPreview.innerHTML = `<div class="current-icon">${svgCode}</div>`;
          form.querySelector('#iconData').value = svgCode;
        } catch (error) {
          this.showError('解析SVG代码失败');
        }
      });
    }
    
    // 添加组合搜索引擎
    if (addGroupEngineBtn) {
      addGroupEngineBtn.addEventListener('click', async () => {
        const list = form.querySelector('#groupEngineList');
        const index = list.children.length;
        
        const div = document.createElement('div');
        div.className = 'group-engine-item';
        div.dataset.index = index;
        div.innerHTML = `
          <select name="engines[${index}].id" required>
            ${await this.renderEngineOptions()}
          </select>
          <select name="engines[${index}].openMode">
            <option value="">使用默认打开方式</option>
            <option value="new-tab">新标签页</option>
            <option value="new-window">新窗口</option>
            <option value="current-tab">当前标签页</option>
            <option value="incognito">隐身窗口</option>
          </select>
          <button type="button" class="remove-group-engine">删除</button>
        `;
        
        list.appendChild(div);
      });
    }
    
    // 删除组合搜索引擎
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-group-engine')) {
        const item = e.target.closest('.group-engine-item');
        if (item) {
          item.remove();
        }
      }
    });
    
    // 表单提交
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const formData = new FormData(form);
        const categoryValue = formData.get('categoryId') || null;
        const data = {
          id: this.editingEngine ? this.editingEngine.id : StorageManager.generateEngineId(),
          name: formData.get('name'),
          categoryId: categoryValue,
          category: categoryValue,
          type: formData.get('type')
        };
        
        // 设置图标
        const iconData = form.querySelector('#iconData').value;
        if (iconData) {
          data.icon = iconData;
        } else if (this.editingEngine && this.editingEngine.icon) {
          data.icon = this.editingEngine.icon;
        }
        
        if (data.type === 'single') {
          data.searchUrl = formData.get('searchUrl');
          data.openMode = formData.get('openMode');
        } else {
          // 组合搜索引擎
          data.engines = Array.from(form.querySelectorAll('.group-engine-item')).map(item => ({
            id: item.querySelector('select[name*=".id"]').value,
            overrideOpenMode: item.querySelector('select[name*=".openMode"]').value || null
          }));
          
          // 确保组合搜索引擎也有图标
          if (!data.icon) {
            // 如果没有设置图标，则创建一个基于名称的图标
            const firstLetter = data.name.charAt(0).toUpperCase();
            const colors = [
              '#4285F4', '#EA4335', '#FBBC05', '#34A853', 
              '#FF5722', '#9C27B0', '#3F51B5', '#009688', 
              '#795548', '#607D8B'
            ];
            const colorIndex = Math.abs(data.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
            const bgColor = colors[colorIndex];
            
            data.icon = `
              <div class="letter-icon" style="background-color: ${bgColor}">
                ${firstLetter}
              </div>
            `;
          }
        }
        
        // 获取现有的搜索引擎列表
        const engines = await StorageManager.getSearchEngines();
        
        if (this.editingEngine) {
          // 更新现有搜索引擎
          const index = engines.findIndex(e => e.id === this.editingEngine.id);
          if (index !== -1) {
            // 保留原有的isBuiltIn属性
            data.isBuiltIn = this.editingEngine.isBuiltIn;
            
            // 合并数据
            engines[index] = { ...this.editingEngine, ...data };
          }
        } else {
          // 添加新搜索引擎
          engines.push(data);
        }
        
        // 保存到存储
        await StorageManager.updateSearchEngines(engines);
        
        // 调用保存成功回调
        if (typeof this.onSave === 'function') {
          this.onSave();
        }
        
      } catch (error) {
        console.error('保存搜索引擎失败:', error);
        this.showError('保存失败，请重试');
      }
    });
    
    // 取消按钮
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (typeof this.onCancel === 'function') {
          this.onCancel();
        }
      });
    }
  }
  
  /**
   * 渲染搜索引擎选项
   * @param {string} selectedId - 选中的搜索引擎ID
   * @returns {string} HTML字符串
   */
  async renderEngineOptions(selectedId) {
    const engines = await StorageManager.getSearchEngines();
    return engines
      .filter(engine => engine.type === 'single')
      .map(engine => `
        <option value="${engine.id}" ${engine.id === selectedId ? 'selected' : ''}>
          ${engine.name}
        </option>
      `).join('');
  }
  
  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   */
  showError(message) {
    // 创建错误消息元素
    const errorEl = document.createElement('div');
    errorEl.className = 'message-toast error';
    errorEl.textContent = message;
    
    // 添加到页面
    document.body.appendChild(errorEl);
    
    // 显示动画
    setTimeout(() => {
      errorEl.classList.add('show');
    }, 10);
    
    // 自动移除
    setTimeout(() => {
      errorEl.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(errorEl);
      }, 300); // 等待淡出动画完成
    }, 3000);
    
    // 控制台记录
    console.error(message);
  }
  
  /**
   * 显示成功信息
   * @param {string} message - 成功信息
   */
  showSuccess(message) {
    // 创建成功消息元素
    const successEl = document.createElement('div');
    successEl.className = 'message-toast success';
    successEl.textContent = message;
    
    // 添加到页面
    document.body.appendChild(successEl);
    
    // 显示动画
    setTimeout(() => {
      successEl.classList.add('show');
    }, 10);
    
    // 自动移除
    setTimeout(() => {
      successEl.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(successEl);
      }, 300); // 等待淡出动画完成
    }, 3000);
    
    // 控制台记录
    console.log(message);
  }
  
  /**
   * 显示信息
   * @param {string} message - 信息
   */
  showInfo(message) {
    // 创建信息消息元素
    const infoEl = document.createElement('div');
    infoEl.className = 'message-toast info';
    infoEl.textContent = message;
    
    // 添加到页面
    document.body.appendChild(infoEl);
    
    // 显示动画
    setTimeout(() => {
      infoEl.classList.add('show');
    }, 10);
    
    // 自动移除
    setTimeout(() => {
      infoEl.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(infoEl);
      }, 300); // 等待淡出动画完成
    }, 3000);
    
    // 控制台记录
    console.info(message);
  }
} 