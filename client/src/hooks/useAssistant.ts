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
            console.log('[Onboarding] Fetching status for project:', projectId);
            try {
                const response = await fetch('/api/user/onboarding-status');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('[Onboarding] API Response:', data);
                setIsOnboarding(data.isOnboarding);
            } catch (error) {
                console.error('[Onboarding] Failed to fetch status:', error);
                setIsOnboarding(false);
            }
        };

        checkOnboardingStatus();
    }, [projectId]);

    const updateOnboardingStatus = async (isOnboarding: boolean) => {
        try {
            const response = await fetch('/api/user/onboarding-status/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isOnboarding }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('[Onboarding] Status updated:', isOnboarding);
        } catch (error) {
            console.error('[Onboarding] Failed to update status:', error);
        }
    };

    return {
        ...ass,
        append,
        status,
        isOnboarding,
    }
}

export default useAssistant;
