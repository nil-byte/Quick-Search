import { Pagination } from './Pagination.js';
import StorageManager from '../../utils/storage.js';

export class SearchEngineList {
  /**
   * 创建搜索引擎列表组件
   * @param {string} containerId - 容器元素ID
   */
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.searchEngines = [];
    this.filteredEngines = [];
    this.categoryMap = {};
    this.pageSize = 5;
    this.searchKeyword = '';
    
    if (!this.container) {
      throw new Error(`找不到ID为 ${containerId} 的容器元素`);
    }

    // 创建初始结构
    this.container.innerHTML = `
      <div class="search-engine-list">
        <div class="list-header">
          <h2>搜索引擎列表</h2>
          <div class="list-actions">
            <button class="add-engine-btn">添加搜索引擎</button>
            <button class="reset-engines-btn">重置搜索引擎</button>
          </div>
        </div>
        <div class="list-content"></div>
        <div class="pagination-container"></div>
      </div>
    `;
    
    // 初始化分页组件
    this.pagination = new Pagination({
      containerId: this.container.querySelector('.pagination-container'),
      pageSize: this.pageSize,
      onChange: (page) => this.handlePageChange(page),
      onSearch: (keyword) => this.handleSearch(keyword),
      onPageSizeChange: (size) => this.handlePageSizeChange(size)
    });
    
    this.init();
  }
  
  /**
   * 初始化组件
   */
  async init() {
    try {
      // 获取搜索引擎数据
      this.searchEngines = await StorageManager.getSearchEngines();
      this.filteredEngines = [...this.searchEngines];
      
      // 构建分类映射
      const categories = await StorageManager.getCategories();
      this.categoryMap = categories.reduce((map, category) => {
        map[category.id] = {
          name: category.name,
          order: category.order
        };
        return map;
      }, {});
      
      // 更新分页组件
      this.updatePagination();
      
      // 渲染搜索引擎列表
      this.renderEngineList(0);
      
      // 绑定事件
      this.bindEvents();
      
    } catch (error) {
      console.error('初始化搜索引擎列表失败:', error);
      this.showError('加载搜索引擎数据失败，请刷新页面重试');
    }
  }
  
  /**
   * 处理搜索
   * @param {string} keyword - 搜索关键词
   */
  handleSearch(keyword) {
    this.searchKeyword = keyword.toLowerCase();
    // 更新过滤后的搜索引擎列表
    this.filteredEngines = this.searchEngines.filter(engine => {
      // 将关键词转为小写进行不区分大小写的搜索
      const keyword = this.searchKeyword.toLowerCase();
      
      // 搜索名称
      const name = engine.name.toLowerCase();
      
      // 搜索分类
      const categoryId = engine.categoryId || engine.category;
      const categoryName = this.categoryMap[categoryId]?.name?.toLowerCase() || '';
      
      // 搜索类型
      const type = engine.type === 'single' ? '单个搜索' : '组合搜索';
      const typeSearchable = type.toLowerCase();
      
      // 搜索打开方式
      const openMode = this.getOpenModeText(engine.openMode).toLowerCase();
      
      // 任何一个字段包含关键词就返回true
      return name.includes(keyword) || 
             categoryName.includes(keyword) || 
             typeSearchable.includes(keyword) || 
             openMode.includes(keyword);
    });
    
    // 重置到第一页并更新UI
    this.pagination.update({
      total: this.filteredEngines.length,
      currentPage: 1,
      pageSize: this.pageSize
    });
    this.renderEngineList(0);
  }
  
  /**
   * 处理页码改变
   * @param {number} page - 新的页码
   */
  handlePageChange(page) {
    const startIndex = (page - 1) * this.pageSize;
    this.renderEngineList(startIndex);
  }
  
  /**
   * 处理每页显示数量改变
   * @param {number} size - 新的每页显示数量
   */
  handlePageSizeChange(size) {
    this.pageSize = size;
    // 重置到第一页并更新UI
    this.pagination.update({
      total: this.filteredEngines.length,
      currentPage: 1,
      pageSize: this.pageSize
    });
    this.renderEngineList(0);
  }
  
  /**
   * 更新分页组件
   */
  updatePagination() {
    this.pagination.update({
      total: this.filteredEngines.length,
      currentPage: 1,
      pageSize: this.pageSize
    });
  }
  
  /**
   * 渲染搜索引擎列表
   * @param {number} startIndex - 起始索引
   */
  renderEngineList(startIndex) {
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredEngines.length);
    const currentPageEngines = this.filteredEngines.slice(startIndex, endIndex);
    
    const listContent = this.container.querySelector('.list-content');
    if (!listContent) return;

    let html = `
      <table>
        <thead>
          <tr>
            <th>图标</th>
            <th>名称</th>
            <th>分类</th>
            <th>类型</th>
            <th>打开方式</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    // 按分类顺序排序
    const sortedEngines = [...currentPageEngines].sort((a, b) => {
      // 统一使用categoryId字段
      const categoryIdA = a.categoryId || '';
      const categoryIdB = b.categoryId || '';
      
      const orderA = this.categoryMap[categoryIdA]?.order || 999;
      const orderB = this.categoryMap[categoryIdB]?.order || 999;
      
      // 先按分类顺序排序
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // 同分类按名称排序
      return a.name.localeCompare(b.name);
    });
    
    sortedEngines.forEach(engine => {
      // 统一使用categoryId字段
      const categoryId = engine.categoryId || '';
      const categoryInfo = this.categoryMap[categoryId];
      const iconHtml = this.renderEngineIcon(engine);
      
      html += `
        <tr data-id="${engine.id}">
          <td class="engine-icon">${iconHtml}</td>
          <td>${engine.name}</td>
          <td>${categoryInfo ? categoryInfo.name : '未分类'}</td>
          <td>${engine.type === 'single' ? '单个搜索' : '组合搜索'}</td>
          <td>${this.getOpenModeText(engine.openMode)}</td>
          <td>
            <button class="edit-btn">编辑</button>
            <button class="delete-btn">删除</button>
          </td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    listContent.innerHTML = html;
  }
  
  /**
   * 渲染搜索引擎图标
   * @param {Object} engine - 搜索引擎对象
   * @returns {string} - 图标的HTML
   */
  renderEngineIcon(engine) {
    // 如果存在图标，直接使用
    if (engine.icon) {
      return engine.icon;
    }
    
    // 否则创建一个字母图标
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
  
  /**
   * 获取打开方式的显示文本
   * @param {string} openMode - 打开方式
   * @returns {string} 显示文本
   */
  getOpenModeText(openMode) {
    const modeMap = {
      'new-tab': '新标签页',
      'new-window': '新窗口',
      'current-tab': '当前标签页',
      'incognito': '隐身窗口'
    };
    return modeMap[openMode] || '新标签页';
  }
  
  /**
   * 绑定事件处理
   */
  bindEvents() {
    this.container.addEventListener('click', async (e) => {
      const target = e.target;
      const row = target.closest('tr');
      
      if (row) {
        const engineId = row.dataset.id;
        
        if (target.classList.contains('edit-btn')) {
          await this.editEngine(engineId);
        } else if (target.classList.contains('delete-btn')) {
          await this.deleteEngine(engineId);
        }
      } else if (target.classList.contains('add-engine-btn')) {
        await this.addEngine();
      } else if (target.classList.contains('reset-engines-btn')) {
        await this.resetEngines();
      }
    });
  }
  
  /**
   * 重置搜索引擎为默认值
   */
  async resetEngines() {
    if (!confirm('确定要重置所有搜索引擎为默认值吗？这将删除您所有自定义的搜索引擎！')) {
      return;
    }
    
    try {
      // 执行重置操作
      const defaultEngines = await StorageManager.resetSearchEngines();
      
      // 更新本地数据
      this.searchEngines = defaultEngines;
      this.filteredEngines = [...defaultEngines];
      
      // 更新UI
      this.updatePagination();
      this.renderEngineList(0);
      
      // 显示成功消息
      this.showSuccess('搜索引擎已成功重置为默认值');
      
    } catch (error) {
      console.error('重置搜索引擎失败:', error);
      this.showError('重置失败，请重试');
    }
  }
  
  /**
   * 编辑搜索引擎
   * @param {string} engineId - 搜索引擎ID
   */
  async editEngine(engineId) {
    // 获取要编辑的搜索引擎数据
    const engine = this.searchEngines.find(e => e.id === engineId);
    if (!engine) {
      console.error('找不到要编辑的搜索引擎:', engineId);
      return;
    }
    
    // 显示表单容器，隐藏列表容器
    const formContainer = document.getElementById('engine-form-container');
    const listContainer = document.getElementById('engine-list-container');
    
    if (formContainer && listContainer) {
      // 初始化表单，传入要编辑的搜索引擎数据
      const engineForm = new window.SearchEngineForm({
        containerId: 'engine-form-container',
        onSave: () => {
          // 表单保存成功后，隐藏表单，显示列表，并刷新列表数据
          formContainer.style.display = 'none';
          listContainer.style.display = 'block';
          this.init(); // 重新加载数据
        },
        onCancel: () => {
          // 取消编辑，隐藏表单，显示列表
          formContainer.style.display = 'none';
          listContainer.style.display = 'block';
        }
      });
      
      // 初始化表单并传入要编辑的搜索引擎数据
      await engineForm.init(engine);
      
      // 显示表单，隐藏列表
      formContainer.style.display = 'block';
      listContainer.style.display = 'none';
    }
  }
  
  /**
   * 添加搜索引擎
   */
  async addEngine() {
    // 显示表单容器，隐藏列表容器
    const formContainer = document.getElementById('engine-form-container');
    const listContainer = document.getElementById('engine-list-container');
    
    if (formContainer && listContainer) {
      // 初始化表单
      const engineForm = new window.SearchEngineForm({
        containerId: 'engine-form-container',
        onSave: () => {
          // 表单保存成功后，隐藏表单，显示列表，并刷新列表数据
          formContainer.style.display = 'none';
          listContainer.style.display = 'block';
          this.init(); // 重新加载数据
        },
        onCancel: () => {
          // 取消添加，隐藏表单，显示列表
          formContainer.style.display = 'none';
          listContainer.style.display = 'block';
        }
      });
      
      // 初始化空白表单
      await engineForm.init();
      
      // 显示表单，隐藏列表
      formContainer.style.display = 'block';
      listContainer.style.display = 'none';
    }
  }
  
  /**
   * 删除搜索引擎
   * @param {string} engineId - 搜索引擎ID
   */
  async deleteEngine(engineId) {
    try {
      const engine = this.searchEngines.find(e => e.id === engineId);
      if (!engine) {
        console.error('找不到要删除的搜索引擎:', engineId);
        return;
      }
      
      // 检查是否为内置搜索引擎，如果是则提示用户
      if (engine.isBuiltIn) {
        const confirmBuiltIn = confirm('这是一个内置搜索引擎，删除后可以通过重置恢复。确定要删除吗？');
        if (!confirmBuiltIn) {
          return;
        }
      }
      
      // 检查是否有组合搜索引擎引用了这个搜索引擎
      const references = this.searchEngines.filter(e => 
        e.type === 'group' && 
        e.engines && 
        e.engines.some(ref => ref.id === engineId)
      );
      
      if (references.length > 0) {
        // 如果有引用，提示用户并确认是否继续删除
        const referenceNames = references.map(e => e.name).join('、');
        const confirmDelete = confirm(`警告：以下组合搜索引擎正在使用这个搜索引擎：${referenceNames}。\n删除后这些组合搜索引擎将受到影响。确定要删除吗？`);
        
        if (!confirmDelete) {
          return;
        }
      }
      
      // 获取删除确认
      if (!confirm('确定要删除这个搜索引擎吗？')) {
        return;
      }
      
      console.log('删除前的搜索引擎数量:', this.searchEngines.length);
      
      // 从列表中移除
      const updatedEngines = this.searchEngines.filter(e => e.id !== engineId);
      console.log('删除后的搜索引擎数量:', updatedEngines.length);
      
      // 更新存储 - 传递数组而不是对象
      await StorageManager.updateSearchEngines(updatedEngines);
      
      // 更新本地数据
      this.searchEngines = updatedEngines;
      this.filteredEngines = this.filteredEngines.filter(e => e.id !== engineId);
      
      // 更新UI
      this.pagination.update({
        total: this.filteredEngines.length,
        pageSize: this.pageSize
      });
      this.renderEngineList((this.pagination.currentPage - 1) * this.pageSize);
      
      // 显示成功消息
      this.showSuccess('搜索引擎已成功删除');
      
    } catch (error) {
      console.error('删除搜索引擎失败:', error);
      this.showError('删除失败，请重试');
    }
  }
  
  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   */
  showError(message) {
    // TODO: 实现错误提示UI
    console.error(message);
  }
  
  /**
   * 显示成功信息
   * @param {string} message - 成功信息
   */
  showSuccess(message) {
    // TODO: 实现成功提示UI
    console.log(message);
  }
} 