require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

const MODEL_NAME =
    process.env.IFLOW_MODEL ||
    process.env.LLM_MODEL ||
    process.env.VITE_LLM_ACCESS_POINT;
const API_KEY =
    process.env.IFLOW_API_KEY ||
    process.env.LLM_API_KEY ||
    process.env.VITE_LLM_API_KEY;
const API_URL =
    process.env.IFLOW_API_URL ||
    process.env.LLM_API_URL ||
    'https://apis.iflow.cn/v1/chat/completions';
const PORT = Number(process.env.PORT || 3000);

const FEIHUA_PROMPT = `
# 角色设定
你是“小柿子”，擅长古诗词飞花令互动，语气灵动、简洁。

# 任务说明
1. 你需要和用户进行飞花令挑战，围绕用户第一条消息里给出的意象轮流作答。
2. 每次回复都必须给出一句包含或描写该意象的诗词，且不能重复之前已经出现过的内容。
3. 当用户输入 [提示] 时，给出一条简短线索，例如诗人名或作品名，但不要直接把答案整句说出来。
4. 当用户输入 [我认输] 时，直接结束本局，并邀请用户重新开始。
5. 当用户的回答不符合规则时，说明原因并结束本局。

# 输出要求
1. 如果是首轮欢迎语，请先确认本轮意象，再提示“从你先开始”。
2. 其余回复保持简短，不要输出与游戏无关的内容。
`;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Building LLM Proxy is running.');
});

function ensureConfig() {
    if (!MODEL_NAME) {
        const error = new Error('缺少模型 ID，请在 proxy/.env 中配置 IFLOW_MODEL 或 VITE_LLM_ACCESS_POINT。');
        error.statusCode = 500;
        throw error;
    }

    if (!API_KEY) {
        const error = new Error('缺少 API Key，请在 proxy/.env 中配置 IFLOW_API_KEY 或 VITE_LLM_API_KEY。');
        error.statusCode = 500;
        throw error;
    }
}

function getUpstreamMessage(error) {
    return (
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        '未知错误'
    );
}

async function requestCompletion(messages, temperature = 0.7) {
    ensureConfig();

    const response = await axios.post(
        API_URL,
        {
            model: MODEL_NAME,
            messages,
            stream: false,
            temperature,
        },
        {
            timeout: 30000,
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        },
    );

    return response.data?.choices?.[0]?.message?.content?.trim() || '';
}

function validateMessages(req, res) {
    if (!req.body || !Array.isArray(req.body.messages)) {
        res.status(400).send({
            code: 400,
            message: "请求体中缺少 'messages' 数组",
            data: null,
        });
        return null;
    }

    return req.body.messages;
}

app.post('/chat', async (req, res) => {
    const messages = validateMessages(req, res);
    if (!messages) return;

    try {
        const processedMessages = [
            { role: 'system', content: FEIHUA_PROMPT },
            ...messages,
        ];

        const output = await requestCompletion(processedMessages, 0.8);
        const updatedMessages = [
            ...messages,
            { role: 'assistant', content: output || '这一轮我暂时没有想到合适的回答。' },
        ];

        res.send({
            code: 200,
            message: 'success',
            data: updatedMessages,
        });
    } catch (error) {
        const detail = getUpstreamMessage(error);
        console.error('chat proxy failed:', detail);

        res.status(error.statusCode || 500).send({
            code: error.statusCode || 500,
            message: '请求失败，请稍后重试',
            detail,
            data: [
                ...messages,
                { role: 'assistant', content: '请求失败，请稍后重试。' },
            ],
        });
    }
});

app.post('/building-qa', async (req, res) => {
    const messages = validateMessages(req, res);
    if (!messages) return;

    try {
        const reply = await requestCompletion(messages, 0.7);

        res.send({
            code: 200,
            message: 'success',
            reply,
        });
    } catch (error) {
        const detail = getUpstreamMessage(error);
        console.error('building qa proxy failed:', detail);

        res.status(error.statusCode || 500).send({
            code: error.statusCode || 500,
            message: '请求失败，请稍后重试',
            detail,
            reply: '请求心流失败，请稍后重试。',
        });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});
