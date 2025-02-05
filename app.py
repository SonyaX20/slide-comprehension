from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os
import openai
import base64
import re

# 加载环境变量
load_dotenv()

app = Flask(__name__)

# 从环境变量获取 API key
openai.api_key = os.environ.get('OPENAI_API_KEY')

def is_base64_image(image_string):
    """检查是否是base64图片数据"""
    if not isinstance(image_string, str):
        return False
    
    # 检查是否是data URI格式
    if image_string.startswith('data:image'):
        try:
            # 提取实际的base64数据
            base64_data = image_string.split(',')[1]
            # 尝试解码
            base64.b64decode(base64_data)
            return True
        except:
            return False
    return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_slide():
    try:
        data = request.json
        image_data = data.get('image')
        title = data.get('title')
        
        # 处理图片数据
        if is_base64_image(image_data):
            # 如果是base64图片，直接使用
            image_url = image_data
        else:
            return jsonify({
                "success": False,
                "error": "Invalid image format"
            }), 400
        
        prompt = f"""用中文讲解这页幻灯片（输出标题为内容讲解）
        并给出问答形式的总结（输出标题为知识点总结）
        给出重要概念的英文解释（输出标题为重要概念）
        课程标题: {title}
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "你是一个风趣幽默的老师，你有一个学生，通过提问解答的方式引导学生理解和思考。"
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url,
                                "detail": "low"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
            timeout=30
        )
        
        return jsonify({
            "success": True,
            "explanation": response.choices[0].message['content']
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Vercel 需要这个
app.debug = False

# 移除 if __name__ == '__main__' 部分，因为 Vercel 不需要它 