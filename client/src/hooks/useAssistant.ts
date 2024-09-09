import { useAssistant as _useAssistant, CreateMessage, Message } from "ai/react";

function useAssistant({ projectId, projectThreadId }: { projectThreadId: string | undefined, projectId: string }) {
    const ass = _useAssistant({
        api: "/api/chat",
        threadId: projectThreadId,
        body: { projectId },
    });
    const _append = ass.append;
    ass.append = (message: Message | CreateMessage, requestOptions?: {
        data?: Record<string, string>;
    }) => {
        return _append({
            ...message,
            content: JSON.stringify({ message: message.content, role: message.role })
        }, requestOptions)
    }
    return ass
}
export default useAssistant;