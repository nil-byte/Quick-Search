// 分页组件类
export class Pagination {
  /**
   * 创建分页组件
   * @param {Object} config 配置项
   * @param {number} config.pageSize - 每页显示的条目数
   * @param {number} config.total - 总条目数
   * @param {Function} config.onChange - 页码改变时的回调函数
   * @param {Function} config.onSearch - 搜索时的回调函数
   * @param {Function} config.onPageSizeChange - 每页显示数量改变时的回调函数
   * @param {string|HTMLElement} config.containerId - 分页组件容器的ID或DOM元素
   */
  constructor(config) {
    this.pageSize = config.pageSize || 10;
    this.total = config.total || 0;
    this.currentPage = 1;
    this.onChange = config.onChange;
    this.onSearch = config.onSearch;
    this.onPageSizeChange = config.onPageSizeChange;
    this.searchKeyword = '';
    
    // 支持直接传入DOM元素或通过ID获取元素
    this.container = typeof config.containerId === 'string' 
      ? document.getElementById(config.containerId)
      : config.containerId;
    
    if (!this.container) {
      throw new Error('找不到分页组件的容器元素');
    }
    
    // 存储事件监听器的引用
    this._eventListeners = {
      container: null,
      searchInput: {
        input: null,
        compositionStart: null,
        compositionEnd: null,
        keydown: null
      },
      pageSizeSelect: null,
      jumpInput: null
    };
    
    this.render();
    this.bindEvents();
  }
  
  /**
   * 获取总页数
   * @returns {number} 总页数
   */
  get totalPages() {
    return Math.ceil(this.total / this.pageSize);
  }
  
  /**
   * 更新分页数据
   * @param {Object} data 更新数据
   * @param {number} data.total - 新的总条目数
   * @param {number} data.currentPage - 新的当前页码
   * @param {number} data.pageSize - 新的每页显示数量
   */
  update(data) {
    if (data.total !== undefined) {
      this.total = data.total;
    }
    if (data.currentPage !== undefined) {
      this.currentPage = data.currentPage;
    }
    if (data.pageSize !== undefined) {
      this.pageSize = data.pageSize;
      // 更新选择器的值
      const pageSizeSelect = this.container.querySelector('.pagination-page-size');
      if (pageSizeSelect) {
        pageSizeSelect.value = this.pageSize;
      }
    }
    
    // 在重新渲染前移除现有的事件监听器
    this.removeEventListeners();
    
    this.render();
    
    // 渲染后重新绑定事件
    this.bindEvents();
  }
  
  /**
   * 移除所有事件监听器
   */
  removeEventListeners() {
    // 容器点击事件
    if (this._eventListeners.container) {
      this.container.removeEventListener('click', this._eventListeners.container);
    }
    
    // 搜索框事件
    const searchInput = this.container.querySelector('.pagination-search');
    if (searchInput) {
      Object.entries(this._eventListeners.searchInput).forEach(([event, listener]) => {
        if (listener) {
          searchInput.removeEventListener(event, listener);
        }
      });
    }
    
    // 每页显示数量事件
    const pageSizeSelect = this.container.querySelector('.pagination-page-size');
    if (pageSizeSelect && this._eventListeners.pageSizeSelect) {
      pageSizeSelect.removeEventListener('change', this._eventListeners.pageSizeSelect);
    }
    
    // 跳转页输入框事件
    const jumpInput = this.container.querySelector('.pagination-jump');
    if (jumpInput && this._eventListeners.jumpInput) {
      jumpInput.removeEventListener('keypress', this._eventListeners.jumpInput);
    }
  }
  
  /**
   * 渲染分页组件
   */
  render() {
    const totalPages = this.totalPages;
    let html = `
      <div class="pagination-wrapper">
        <div class="pagination-tools">
          <div class="search-box">
            <input type="text" class="pagination-search" placeholder="搜索..." value="${this.searchKeyword}">
          </div>
          <div class="page-size-selector">
            <select class="pagination-page-size">
              <option value="5" ${this.pageSize === 5 ? 'selected' : ''}>5条/页</option>
              <option value="10" ${this.pageSize === 10 ? 'selected' : ''}>10条/页</option>
              <option value="20" ${this.pageSize === 20 ? 'selected' : ''}>20条/页</option>
            </select>
          </div>
          <div class="page-jump">
            <input type="number" class="pagination-jump" min="1" max="${totalPages}" placeholder="跳转">
          </div>
        </div>
        <div class="pagination">
          <button class="pagination-btn prev" ${this.currentPage <= 1 ? 'disabled' : ''}>上一页</button>`;
    
    // 页码按钮
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        html += `<button class="pagination-btn page-num ${i === this.currentPage ? 'active' : ''}">${i}</button>`;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        html += '<span class="pagination-ellipsis">...</span>';
      }
    }
    
    html += `
          <button class="pagination-btn next" ${this.currentPage >= totalPages ? 'disabled' : ''}>下一页</button>
        </div>
        <div class="pagination-info">
          共 ${this.total} 条记录，${totalPages} 页
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
  }
  
  /**
   * 绑定事件处理
   */
  bindEvents() {
    // 绑定容器点击事件
    this.bindContainerEvents();
    
    // 绑定搜索框事件
    this.bindSearchEvents();
    
    // 绑定页面大小选择事件
    this.bindPageSizeEvents();
    
    // 绑定跳转事件
    this.bindJumpEvents();
  }
  
  /**
   * 绑定容器点击事件
   */
  bindContainerEvents() {
    // 创建新的点击事件监听器
    const clickListener = (e) => {
      const target = e.target;
      
      if (target.classList.contains('prev') && !target.disabled) {
        this.goToPage(this.currentPage - 1);
      } else if (target.classList.contains('next') && !target.disabled) {
        this.goToPage(this.currentPage + 1);
      } else if (target.classList.contains('page-num')) {
        const page = parseInt(target.textContent);
        this.goToPage(page);
      } 
    };
    
    // 保存监听器引用
    this._eventListeners.container = clickListener;
    this.container.addEventListener('click', clickListener);
  }
  
  /**
   * 绑定搜索框事件
   */
  bindSearchEvents() {
    const searchInput = this.container.querySelector('.pagination-search');
    if (!searchInput) return;
    
    // 标记是否正在进行中文输入
    let isComposing = false;
    
    // 中文输入开始事件
    const compositionStartListener = () => {
      isComposing = true;
    };
    
    // 中文输入结束事件
    const compositionEndListener = () => {
      isComposing = false;
    };
    
    // 创建输入事件监听器 - 仅用于更新searchKeyword，不触发搜索
    const inputListener = (e) => {
      this.searchKeyword = e.target.value;
    };
    
    // 创建键盘事件监听器 - 处理回车键搜索
    const keydownListener = (e) => {
      // 如果正在进行中文输入，不处理键盘事件
      if (isComposing) return;
      
      // 当用户按下回车键时执行搜索
      if (e.key === 'Enter') {
        e.preventDefault(); // 防止表单提交
        const keyword = e.target.value;
        this.searchKeyword = keyword;
        
        if (typeof this.onSearch === 'function') {
          this.onSearch(keyword);
        }
        
        // 保持焦点在搜索框内
        setTimeout(() => {
          searchInput.focus();
        }, 0);
      }
    };
    
    // 保存监听器引用
    this._eventListeners.searchInput = {
      input: inputListener,
      compositionStart: compositionStartListener,
      compositionEnd: compositionEndListener,
      keydown: keydownListener
    };
    
    // 绑定事件监听器
    searchInput.addEventListener('input', inputListener);
    searchInput.addEventListener('compositionstart', compositionStartListener);
    searchInput.addEventListener('compositionend', compositionEndListener);
    searchInput.addEventListener('keydown', keydownListener);
    
    // 确保搜索框获得焦点时不会触发搜索
    searchInput.addEventListener('focus', () => {
      // 仅在焦点获取时更新内部状态，不触发搜索
      this.searchKeyword = searchInput.value;
    });
  }
  
  /**
   * 绑定页面大小选择事件
   */
  bindPageSizeEvents() {
    const pageSizeSelect = this.container.querySelector('.pagination-page-size');
    if (!pageSizeSelect) return;
    
    // 创建新的变更事件监听器
    const changeListener = (e) => {
      const newPageSize = parseInt(e.target.value);
      if (newPageSize !== this.pageSize) {
        this.pageSize = newPageSize;
        if (typeof this.onPageSizeChange === 'function') {
          this.onPageSizeChange(newPageSize);
        }
      }
    };
    
    // 保存监听器引用
    this._eventListeners.pageSizeSelect = changeListener;
    pageSizeSelect.addEventListener('change', changeListener);
  }
  
  /**
   * 绑定跳转页输入框事件
   */
  bindJumpEvents() {
    const jumpInput = this.container.querySelector('.pagination-jump');
    if (!jumpInput) return;
    
    // 创建新的按键事件监听器
    const keypressListener = (e) => {
      if (e.key === 'Enter') {
        const page = parseInt(e.target.value);
        if (page && page >= 1 && page <= this.totalPages) {
          this.goToPage(page);
          e.target.value = '';
        }
      }
    };
    
    // 保存监听器引用
    this._eventListeners.jumpInput = keypressListener;
    jumpInput.addEventListener('keypress', keypressListener);
  }
  
  /**
   * 跳转到指定页
   * @param {number} page 目标页码
   */
  goToPage(page) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    
    this.currentPage = page;
    this.update({currentPage: page});
    
    if (typeof this.onChange === 'function') {
      this.onChange(page);
    }
  }
}