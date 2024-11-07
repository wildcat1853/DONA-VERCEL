import { useAssistant as _useAssistant, CreateMessage, Message } from "ai/react";
import { useState, useCallback, useEffect } from 'react';

interface UseAssistantReturn {
    append: (message: Message | CreateMessage, requestOptions?: { data?: Record<string, string> }) => Promise<void>;
    status: 'idle' | 'in_progress' | 'complete';
    isOnboarding: boolean | undefined;
    isLoading: boolean;
    updateOnboardingStatus: (isOnboarding: boolean) => Promise<void>;
}

function useAssistant({ projectId, projectThreadId, userId }: { projectThreadId: string | undefined, projectId: string, userId: string }) {
    const [status, setStatus] = useState<'idle' | 'in_progress' | 'complete'>('idle');
    const [isOnboarding, setIsOnboarding] = useState<boolean | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

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
                console.log('Fetching onboarding status with params:', { userId });
                const response = await fetch(`/api/onboarding/status/get?userId=${userId}`);
                
                if (!response.ok) {
                    console.error('Response not OK:', response.status);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Raw onboarding API response:', data);
                
                // Convert string 'true'/'false' to boolean if necessary
                const onboardingValue = data.isOnboarding === 'true' || data.isOnboarding === true;
                setIsOnboarding(onboardingValue);
                console.log('Set isOnboarding state to:', onboardingValue);
            } catch (error) {
                console.error('Failed to fetch onboarding status:', error);
                setIsOnboarding(undefined);
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            checkOnboardingStatus();
        } else {
            console.warn('No userId provided to useAssistant hook');
        }
    }, [userId]);

    const updateOnboardingStatus = async (isOnboarding: boolean) => {
        try {
            const endpoint = isOnboarding 
                ? '/api/onboarding/status/set-true' 
                : '/api/onboarding/status/set-false';
                
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('[Onboarding] Status updated:', data);
            
            // Update local state immediately
            setIsOnboarding(data.isOnboarding);
            
        } catch (error) {
            console.error('[Onboarding] Failed to update status:', error);
        }
    };

    return {
        ...ass,
        append,
        status,
        isOnboarding,
        isLoading,
        updateOnboardingStatus
    }
}

export default useAssistant;
