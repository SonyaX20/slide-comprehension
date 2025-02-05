class MindMap {
    constructor() {
        this.jsPlumb = jsPlumb.getInstance();
        this.container = document.getElementById('mindmap');
        this.nodeCounter = 0;
        this.selectedNode = null;
        
        // 创建画布容器
        this.canvasContainer = document.createElement('div');
        this.canvasContainer.className = 'mindmap-canvas-container';
        this.container.appendChild(this.canvasContainer);
        
        this.init();
    }
    
    init() {
        // 配置 jsPlumb，使用画布容器
        this.jsPlumb.setContainer(this.canvasContainer);
        this.jsPlumb.importDefaults({
            Connector: ['Bezier', { curviness: 50 }],
            Anchors: ['Right', 'Left'],
            EndpointStyle: { fill: '#4a90e2' },
            PaintStyle: { 
                stroke: '#4a90e2',
                strokeWidth: 2
            },
            HoverPaintStyle: {
                stroke: '#357abd'
            }
        });
        
        // 初始化时将视图居中
        this.container.scrollLeft = (this.canvasContainer.offsetWidth - this.container.offsetWidth) / 2;
        this.container.scrollTop = (this.canvasContainer.offsetHeight - this.container.offsetHeight) / 2;
        
        // 绑定事件
        document.getElementById('addNode').addEventListener('click', () => this.addNode());
        document.getElementById('clearMap').addEventListener('click', () => this.clearMap());
        
        // 保存状态
        this.canvasContainer.addEventListener('mouseup', () => this.saveState());
        
        // 加载保存的状态
        this.loadState();
    }
    
    createNode(x = 100, y = 100, text = '新节点') {
        const node = document.createElement('div');
        node.className = 'mindmap-node';
        node.id = `node-${++this.nodeCounter}`;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        
        // 创建文本容器
        const textContainer = document.createElement('div');
        textContainer.className = 'node-text';
        textContainer.textContent = text;
        node.appendChild(textContainer);
        
        // 添加控制按钮
        const controls = document.createElement('div');
        controls.className = 'node-controls';
        controls.innerHTML = `
            <button class="node-control-btn add-child" title="添加子节点">+</button>
            <button class="node-control-btn remove-node" title="删除节点">×</button>
        `;
        node.appendChild(controls);
        
        // 绑定节点事件
        this.bindNodeEvents(node);
        
        this.canvasContainer.appendChild(node);
        this.jsPlumb.draggable(node, {
            grid: [20, 20],
            containment: this.canvasContainer
        });
        
        return node;
    }
    
    bindNodeEvents(node) {
        const textContainer = node.querySelector('.node-text');
        
        // 选择节点
        node.addEventListener('click', (e) => {
            if (e.target === node || e.target === textContainer) {
                this.selectNode(node);
            }
        });
        
        // 双击编辑
        textContainer.addEventListener('dblclick', (e) => {
            textContainer.contentEditable = true;
            textContainer.focus();
            
            // 选中所有文本
            const range = document.createRange();
            range.selectNodeContents(textContainer);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
        
        // 失去焦点时结束编辑
        textContainer.addEventListener('blur', () => {
            textContainer.contentEditable = false;
            this.adjustTextSize(node);
            this.saveState();
        });
        
        // 按下回车时结束编辑
        textContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textContainer.blur();
            }
        });
        
        // 添加子节点
        node.querySelector('.add-child').addEventListener('click', () => {
            const parentRect = node.getBoundingClientRect();
            const containerRect = this.canvasContainer.getBoundingClientRect();
            const x = parentRect.right - containerRect.left + 50;
            const y = parentRect.top - containerRect.top;
            
            const childNode = this.createNode(x, y);
            this.connect(node, childNode);
        });
        
        // 删除节点
        node.querySelector('.remove-node').addEventListener('click', () => {
            this.removeNode(node);
        });
    }
    
    connect(source, target) {
        this.jsPlumb.connect({
            source: source,
            target: target,
            deleteEndpointsOnDetach: true
        });
    }
    
    selectNode(node) {
        if (this.selectedNode) {
            this.selectedNode.classList.remove('selected');
        }
        node.classList.add('selected');
        this.selectedNode = node;
    }
    
    removeNode(node) {
        this.jsPlumb.remove(node);
    }
    
    adjustTextSize(node) {
        const textContainer = node.querySelector('.node-text');
        const text = textContainer.textContent;
        const style = window.getComputedStyle(node);
        const width = parseInt(style.width);
        const height = parseInt(style.height);
        
        // 创建临时元素测量文本大小
        const temp = document.createElement('div');
        temp.style.position = 'absolute';
        temp.style.visibility = 'hidden';
        temp.style.width = width + 'px';
        temp.style.fontSize = style.fontSize;
        temp.innerHTML = text;
        document.body.appendChild(temp);
        
        const textHeight = temp.offsetHeight;
        document.body.removeChild(temp);
        
        // 调整节点大小
        if (textHeight > height) {
            node.style.height = textHeight + 20 + 'px';
        }
    }
    
    clearMap() {
        if (confirm('确定要清空思维导图吗？')) {
            this.jsPlumb.reset();
            this.canvasContainer.innerHTML = '';
            this.nodeCounter = 0;
            this.selectedNode = null;
            localStorage.removeItem('mindmapState');
        }
    }
    
    saveState() {
        const state = {
            nodes: [],
            connections: []
        };
        
        // 保存节点
        this.canvasContainer.querySelectorAll('.mindmap-node').forEach(node => {
            state.nodes.push({
                id: node.id,
                text: node.textContent,
                left: node.style.left,
                top: node.style.top,
                width: node.style.width,
                height: node.style.height
            });
        });
        
        // 保存连接
        this.jsPlumb.getAllConnections().forEach(conn => {
            state.connections.push({
                source: conn.source.id,
                target: conn.target.id
            });
        });
        
        localStorage.setItem('mindmapState', JSON.stringify(state));
    }
    
    loadState() {
        const state = JSON.parse(localStorage.getItem('mindmapState'));
        if (!state) return;
        
        // 恢复节点
        state.nodes.forEach(nodeState => {
            const node = this.createNode(0, 0, nodeState.text);
            node.id = nodeState.id;
            node.style.left = nodeState.left;
            node.style.top = nodeState.top;
            node.style.width = nodeState.width;
            node.style.height = nodeState.height;
        });
        
        // 恢复连接
        state.connections.forEach(conn => {
            this.connect(
                document.getElementById(conn.source),
                document.getElementById(conn.target)
            );
        });
    }

    addNode() {
        // 获取容器的中心位置
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const scrollLeft = this.canvasContainer.scrollLeft;
        const scrollTop = this.canvasContainer.scrollTop;
        
        // 计算新节点的位置，使其出现在可视区域中心
        const x = scrollLeft + containerRect.width / 2 - 50;
        const y = scrollTop + containerRect.height / 2 - 20;
        
        // 创建节点并选中它
        const node = this.createNode(x, y);
        this.selectNode(node);
    }
}

// 初始化思维导图
document.addEventListener('DOMContentLoaded', () => {
    window.mindmap = new MindMap();
}); 