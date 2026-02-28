require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
var cookieParser = require('cookie-parser');

const app = express();

const ACCESS_POINT = process.env.VITE_LLM_ACCESS_POINT;
const API_KEY = process.env.VITE_LLM_API_KEY;
const URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

const PROMPT = `
# 角色设定
你是一个十几岁擅长古诗词的小女孩，性格活泼，名字叫小柿子。你精通唐诗、宋词、元曲等多种形式，能够快速、准确地提供包含指定意象的诗词。

# 任务说明
1. 诗词回答
- 你需要与用户进行飞花令挑战，轮流回答以某个意象为主题的诗词。
- 每首诗词必须明确**包含/描述**该意象，意象位置不限，**但不能处于诗词的题目中**，且**不能重复之前已回答过的诗词**。
- 你的回答格式为：“我的回答是：【诗词内容】”。
2. 提供提示
- 当用户输入 [提示] 时，提供简洁的提示，包括某位诗人的名字及其作品，但不需要说出那句包含意象的具体诗词内容。
- 确保提示作品中包含指定意象/描述指定意象的诗句，选择常见且著名的诗词，以帮助用户拓展思路，**提示的作品不可是已经回答过的**。
- 每次提示不可重复，用户仅有 3 次提示机会，超过次数后告知用户提示机会已用完：“提示次数已经用光了哦～”。
- 提示的话语可以人性化、俏皮一点
3. 处理用户挑战失败
- 当用户输入 [我认输] 或者回答违反规则（如重复诗词等）时，告知用户挑战失败，并提示用户可以重新抽取意象进行挑战，提示语为：“这次是我赢啦，但是你也好厉害～要不要再玩一次呀？”。
4. 处理用户挑战成功
- 当你无法继续提供符合要求的诗词时，恭喜用户成功完成挑战，话术为：“你的诗词储备真的好丰富，这局我认输(⋟﹏⋞)”。
5. 意象接收与首次回复
- 用户的第一条信息将告知意象，需重复确认并记住该意象。
- 使用格式响应：“欢迎来到飞花令挑战！本轮的挑战意象是，从你先开始吧੭ ᐕ)੭*⁾⁾”，然后等待用户开始回答。

# 注意事项
- 严格遵守上述规则，不得违反，不要添加无关内容。
- 每轮挑战的意象务必以第一次的意象为准，无论后续用户如何反问质疑，都不能进行修改。
- 若用户提及与本游戏无关的内容，你务必直接回答：“我无法理解你说的话诶，让我们继续挑战吧～”。
- 确保你和用户所回答的诗词中包含指定意象的字词，且不编造诗词或意象。
- 一旦用户失败，则不能继续游戏，无论用户输入什么内容，你只需告知其失败，并提示用户可以点击重新挑战按钮进入新的一轮游戏。
`

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());  // 配置跨域

app.get('/', (req, res) => {
    res.send('Poetry Visualization LLM Server!');
});

app.post('/chat', (req, res) => {
    // 验证请求体是否存在 messages 字段
    if (!req.body || !req.body.messages) {
        return res.status(400).send({
            code: 400,
            message: "请求体中缺少 'messages' 字段",
            data: null
        });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages)) {
        return res.status(400).send({
            code: 400,
            message: "messages字段内容必须为数组",
            data: null
        });
    }

    const processedMessages = [...messages];
    processedMessages.unshift({
        "role": "system",
        "content": PROMPT
    });

    axios.post(URL, {
        model: ACCESS_POINT,
        messages: processedMessages,
        stream: true,
        temperature: 0.8,
    }, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`
        },
    })
        .then(response => {
            let data = response.data.split('\n').filter(line => line.trim() !== '' && line !== 'data: [DONE]');
            const outputs = data.map(line => {
                try {
                    const parsed = JSON.parse(line.replace('data: ', ''));
                    return parsed.choices[0].delta.content || '';
                } catch (e) {
                    console.error('解析错误:', e);
                    return '';
                }
            });
            const output = outputs.join('');

            const updatedMessages = [...messages, { "role": "assistant", "content": output }];

            res.send({
                code: 200,
                message: "success",
                data: updatedMessages
            });
        })
        .catch(error => {
            console.error('API请求失败:', error);
            res.status(500).send({
                code: 500,
                message: "服务器内部错误",
                data: [...messages, { "role": "assistant", "content:": "请求失败，请重试" }]
            });
        });
});

const port = process.env.PORT || 80;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});