import { useAssistant as _useAssistant, CreateMessage, Message } from "ai/react";
import { useState } from 'react';

function useAssistant({ projectId, projectThreadId }: { projectThreadId: string | undefined, projectId: string }) {
    const [status, setStatus] = useState<'idle' | 'in_progress' | 'complete'>('idle');

    const ass = _useAssistant({
        api: "/api/chat",
        threadId: projectThreadId,
        body: { projectId },
    });

    const _append = ass.append;
    const append = async (message: Message | CreateMessage, requestOptions?: {
        data?: Record<string, string>;
    }) => {
        setStatus('in_progress');
        try {
            await _append({
                ...message,
                content: JSON.stringify({ message: message.content, role: message.role })
            }, requestOptions);
        } finally {
            setStatus('complete');
        }
    }

    return {
        ...ass,
        append,
        status
    }
}

export default useAssistant;