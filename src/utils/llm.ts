import { type IMessage } from "../interface/llm"
import axios from "axios"

let url = import.meta.env.VITE_CHAT_URL;

export const chat = async (messages: Array<IMessage>) => {
    return axios.post(url, {
        messages: messages
    })
}