// 添加图片压缩函数
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 设置压缩后的最大尺寸
                const maxWidth = 800;
                const maxHeight = 800;
                
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // 确保图片方向正确
                ctx.save();
                ctx.drawImage(img, 0, 0, width, height);
                ctx.restore();
                
                // 使用 image/jpeg 格式并设置较低的质量以减小文件大小
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(compressedDataUrl);
            };
            
            // 处理加载错误
            img.onerror = () => {
                resolve(null);
            };
        };
    });
}

// 加载历史记录
function loadTitleHistory() {
    const history = JSON.parse(localStorage.getItem('titleHistory') || '[]');
    const datalist = document.getElementById('titleHistory');
    datalist.innerHTML = '';
    history.forEach(title => {
        const option = document.createElement('option');
        option.value = title;
        datalist.appendChild(option);
    });
}

// 保存标题到历史记录
function saveTitleToHistory(title) {
    let history = JSON.parse(localStorage.getItem('titleHistory') || '[]');
    if (!history.includes(title)) {
        history.unshift(title);
        history = history.slice(0, 10); // 只保留最近10条记录
        localStorage.setItem('titleHistory', JSON.stringify(history));
        loadTitleHistory();
    }
}

// 清除历史记录
document.getElementById('clearHistory').addEventListener('click', () => {
    localStorage.removeItem('titleHistory');
    loadTitleHistory();
});

// 页面加载时加载历史记录
document.addEventListener('DOMContentLoaded', loadTitleHistory);

// 表单提交处理
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    
    loading.classList.remove('d-none');
    result.style.display = 'none';
    
    const file = document.getElementById('image').files[0];
    const title = document.getElementById('title').value;
    
    try {
        // 压缩图片
        const compressedImage = await compressImage(file);
        
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: compressedImage,
                title: title
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 保存标题到历史记录
            saveTitleToHistory(title);
            
            // 使用 marked 解析 markdown
            result.innerHTML = marked.parse(data.explanation);
            // 高亮代码块
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
            result.style.display = 'block';
        } else {
            result.innerHTML = `<div class="alert alert-danger">发生错误：${data.error}</div>`;
            result.style.display = 'block';
        }
    } catch (error) {
        result.innerHTML = `<div class="alert alert-danger">发生错误：${error.message}</div>`;
        result.style.display = 'block';
    }
    
    loading.classList.add('d-none');
}); 