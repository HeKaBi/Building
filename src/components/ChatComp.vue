<template>
    <div class="chat-container">
        <div class="messages" ref="messagesContainer">
            <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
                <div v-if="msg.role === 'assistant'" class="ai-message">
                    <div class="avatar robot-avatar">
                        <img src="../assets/images/poet.png" alt="poet-robot"/>
                    </div>
                    <div class="content-wrapper">
                        <div class="name">小柿子</div>
                        <div class="bubble" v-html="msg.content"></div>
                    </div>
                </div>
                <div v-else class="user-message">
                    <div class="content-wrapper">
                        <div class="name">你</div>
                        <div class="bubble">{{ msg.content }}</div>
                    </div>
                    <div class="avatar user-avatar">
                        <img src="../assets/images/user.png" alt="poet-user"/>
                    </div>
                </div>
            </div>
        </div>
        <div class="input-area">
            <div class="input">
                <img src="../assets/images/input.png" alt="input" />
                <input type="text" v-model="input" placeholder="输入你的回答" @keypress.enter="sendMessage" />
            </div>
            <button @click="sendMessage">发送</button>
            <button @click="resetFeihua">重新挑战</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useChatStore } from '../store/useChatStore.ts'
import { chat } from '../utils/llm.ts'

const chatStore = useChatStore();
const messages = computed(() => chatStore.messages.slice(1));
const input = ref('');

const messagesContainer = ref<HTMLElement | null>(null); // 添加 messagesContainer 的 ref

const scrollToBottom = () => {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

watch(
    () => chatStore.messages,
    async () => {
        await nextTick();
        scrollToBottom();
    },
    { deep: true }
);

const sendMessage = async () => {
    if (input.value.trim() === '') return;
    chatStore.messages.push({
        role: 'user',
        content: input.value
    });
    input.value = '';
    chatStore.messages.push({
        role: 'assistant',
        content: '...'
    });
    const res = await chat(chatStore.messages.slice(0, -1));
    chatStore.messages = res.data.data;
}

const resetFeihua = () => {
    localStorage.clear();
    window.location.reload();
}

onMounted(() => {
    scrollToBottom();
})
</script>

<style scoped lang="scss">
.chat-container {
    width: 100%;
    height: 65vh;
    display: flex;
    flex-direction: column;

    .messages {
        &::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        &::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 3px;
        }

        &::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 3px;

            &:hover {
                background: transparent;
            }
        }

        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.1);
    }

    .messages {
        flex: 1;
        overflow-y: auto;
        padding: 8px;

        .message {
            margin: 4px 0;

            .ai-message,
            .user-message {
                display: flex;
                gap: 12px;
                max-width: 85%;
            }

            .ai-message {
                justify-content: flex-start;
            }

            .user-message {
                justify-content: flex-end;
                margin-left: auto;

                .content-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: end;
                }
            }

            .content-wrapper {
                font-family: 'ContentFont';

                .name {
                    font-size: 15px;
                    color: #666;
                    margin-bottom: 4px;
                }

                .bubble {
                    padding: 12px 16px;
                    border-radius: 12px;
                    line-height: 1.5;
                    word-break: break-word;
                    cursor: pointer;
                    user-select: none;
                    font-size: 18px;
                }
            }

            .avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;

                img{
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                }
            }

            &.assistant {
                .bubble {
                    background: white;
                    border: 1px solid #e0e0e0;
                }
            }

            &.user {
                .bubble {
                    background: #cc936d;
                    color: rgb(255, 255, 255);
                }
            }
        }
    }

    .input-area {
        width: 100%;
        margin-top: 8px;
        padding-top: 8px;
        display: flex;
        gap: 8px;

        .input {
            position: relative;
            flex: 1;
            outline: none;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            font-family: 'ContentFont';
            font-size: 18px;
            border-radius: 10px;

            img {
                width: 100%;
                height: 7vh;
                display: block;
                opacity: 0.6;
            }
            
            input {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                padding: 16px;
                border: none;
                background: transparent;
                outline: none;
                font-family: 'ContentFont', serif;
                font-size: 18px;
                color: #4a2c2a;
            }
        }

        button {
            padding: 0 16px;
            background: #cc936d;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.3s;
            font-family: 'ContentFont';
            font-size: 18px;

            &:hover {
                background: #c67641;
            }
        }
    }
}
</style>
