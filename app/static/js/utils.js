/**
 * 通用工具函数库
 * 提供系统级别的通用功能方法
 */

class Utils {
    constructor() {
        this.init();
    }

    init() {
        // 确保消息容器存在
        this.ensureMessageContainer();
    }

    /**
     * 显示消息提示
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型：'success', 'error', 'warning', 'info'
     * @param {number} duration - 自动消失时间（毫秒），默认3000ms，0表示不自动消失
     */
    show_msg(message, type = 'info', duration = 3000) {
        // 确保消息容器存在
        this.ensureMessageContainer();

        // 创建消息元素
        const messageElement = this.createMessageElement(message, type);
        
        // 添加到容器
        const container = document.getElementById('system-message-container');
        container.appendChild(messageElement);

        // 显示消息（添加动画）
        setTimeout(() => {
            messageElement.classList.add('show');
        }, 10);

        // 设置自动消失
        if (duration > 0) {
            setTimeout(() => {
                this.hideMessage(messageElement);
            }, duration);
        }

        // 绑定关闭事件
        this.bindCloseEvent(messageElement);
    }

    /**
     * 创建消息元素
     */
    createMessageElement(message, type) {
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const iconClass = this.getMessageIcon(type);
        const messageClass = `system-message system-message-${type}`;

        const messageElement = document.createElement('div');
        messageElement.id = messageId;
        messageElement.className = messageClass;
        messageElement.innerHTML = `
            <div class="system-message-content">
                <div class="system-message-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="system-message-text">${this.escapeHtml(message)}</div>
                <button type="button" class="system-message-close" onclick="utils.closeMessage('${messageId}')">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;

        return messageElement;
    }

    /**
     * 获取消息类型对应的图标
     */
    getMessageIcon(type) {
        const icons = {
            'success': 'bi bi-check-circle-fill',
            'error': 'bi bi-exclamation-circle-fill',
            'warning': 'bi bi-exclamation-triangle-fill',
            'info': 'bi bi-info-circle-fill'
        };
        return icons[type] || icons.info;
    }

    /**
     * 确保消息容器存在
     */
    ensureMessageContainer() {
        let container = document.getElementById('system-message-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'system-message-container';
            container.className = 'system-message-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * 绑定关闭事件
     */
    bindCloseEvent(messageElement) {
        const closeBtn = messageElement.querySelector('.system-message-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideMessage(messageElement);
            });
        }
    }

    /**
     * 关闭指定消息
     */
    closeMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            this.hideMessage(messageElement);
        }
    }

    /**
     * 隐藏消息（带动画）
     */
    hideMessage(messageElement) {
        if (!messageElement) return;

        messageElement.classList.remove('show');
        messageElement.classList.add('hiding');

        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }

    /**
     * 关闭所有消息
     */
    closeAllMessages() {
        const container = document.getElementById('system-message-container');
        if (container) {
            const messages = container.querySelectorAll('.system-message');
            messages.forEach(message => {
                this.hideMessage(message);
            });
        }
    }

    /**
     * HTML转义
     */
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * 快捷方法：成功消息
     */
    success(message, duration = 3000) {
        this.show_msg(message, 'success', duration);
    }

    /**
     * 快捷方法：错误消息
     */
    error(message, duration = 5000) {
        this.show_msg(message, 'error', duration);
    }

    /**
     * 快捷方法：警告消息
     */
    warning(message, duration = 4000) {
        this.show_msg(message, 'warning', duration);
    }

    /**
     * 快捷方法：信息消息
     */
    info(message, duration = 3000) {
        this.show_msg(message, 'info', duration);
    }
}

// 创建全局工具实例
window.utils = new Utils();

// 全局函数别名（兼容旧代码）
window.show_msg = function(message, type = 'info', duration = 3000) {
    if (window.utils) {
        window.utils.show_msg(message, type, duration);
    }
};