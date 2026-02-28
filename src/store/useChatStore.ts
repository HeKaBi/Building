import { defineStore } from "pinia";
import { parse, stringify } from 'zipson'
import { type IMessage } from "../interface/llm";

export const useChatStore = defineStore('chat', {
    state: () => {
        return {
            messages: [] as Array<IMessage>
        }
    },
    getters: {},
    actions: {},
    persist: {
        key: 'POETRY_CHAT',
        serializer: {
            deserialize: parse,
            serialize: stringify
        },
        storage: localStorage
    }
})