import { useAssistant as _useAssistant, CreateMessage, Message } from "ai/react";
import { useState, useCallback, useEffect } from 'react';

interface UseAssistantReturn {
    append: (message: Message | CreateMessage, requestOptions?: { data?: Record<string, string> }) => Promise<void>;
    status: 'idle' | 'in_progress' | 'complete';
    isOnboarding: boolean;
}

function useAssistant({ projectId, projectThreadId }: { projectThreadId: string | undefined, projectId: string }) {
    const [status, setStatus] = useState<'idle' | 'in_progress' | 'complete'>('idle');
    const [isOnboarding, setIsOnboarding] = useState(false);

    const ass = _useAssistant({
        api: "/api/chat",
        threadId: projectThreadId,
        body: { projectId },
    });

    const _append = ass.append;
    const append = useCallback(async (message: Message | CreateMessage, requestOptions?: {
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
    }, [_append]);

    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                const response = await fetch('/api/user/onboarding-status');
                const data = await response.json();
                setIsOnboarding(data.isOnboarding);
            } catch (error) {
                console.error('Failed to fetch onboarding status:', error);
                setIsOnboarding(false);
            }
        };

        checkOnboardingStatus();
    }, [projectId]);

    return {
        ...ass,
        append,
        status,
        isOnboarding,
    }
}

export default useAssistant;
