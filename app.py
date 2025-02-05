from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os
import openai

load_dotenv()

app = Flask(__name__)
openai.api_key = os.getenv('OPENAI_API_KEY')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_slide():
    try:
        data = request.json
        slide_image = data.get('image')
        title = data.get('title')
        
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
                                "url": slide_image
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

if __name__ == '__main__':
    app.run(debug=True) 