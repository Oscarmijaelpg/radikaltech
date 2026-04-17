import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
const STEP_ORDER = ['welcome', 'company', 'socials', 'brand', 'objectives', 'complete'];
function normalizeStep(raw) {
    if (!raw)
        return 'welcome';
    if (raw === 'completed')
        return 'complete';
    if (STEP_ORDER.includes(raw))
        return raw;
    return 'welcome';
}
function extractErrorMessage(err) {
    if (err instanceof ApiError) {
        return err.message || `Error ${err.status}`;
    }
    if (err instanceof Error)
        return err.message;
    return 'Algo salió mal. Inténtalo de nuevo.';
}
export function useOnboarding() {
    const [state, setState] = useState({ currentStep: 'welcome' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const loadInitialState = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/onboarding/state');
            const current = normalizeStep(res.data?.currentStep);
            setState({
                currentStep: current,
                company: res.data?.data?.company,
                socials: res.data?.data?.socials,
                brand: res.data?.data?.brand,
                objectives: res.data?.data?.objectives,
            });
        }
        catch {
            setState({ currentStep: 'welcome' });
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void loadInitialState();
    }, [loadInitialState]);
    const submitStep = useCallback(async (step, data) => {
        setSaving(true);
        setError(null);
        try {
            await api.post('/onboarding/step', { step, data });
            setState((prev) => ({ ...prev, [step]: data }));
        }
        catch (err) {
            setError(extractErrorMessage(err));
            throw err;
        }
        finally {
            setSaving(false);
        }
    }, []);
    const goToStep = useCallback((step) => {
        setState((prev) => ({ ...prev, currentStep: step }));
    }, []);
    const goNext = useCallback(() => {
        setState((prev) => {
            const idx = STEP_ORDER.indexOf(prev.currentStep);
            const next = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)] ?? prev.currentStep;
            return { ...prev, currentStep: next };
        });
    }, []);
    const goBack = useCallback(() => {
        setState((prev) => {
            const idx = STEP_ORDER.indexOf(prev.currentStep);
            const prevStep = STEP_ORDER[Math.max(idx - 1, 0)] ?? prev.currentStep;
            return { ...prev, currentStep: prevStep };
        });
    }, []);
    const completeOnboarding = useCallback(async () => {
        await api.post('/onboarding/complete');
    }, []);
    const dismissError = useCallback(() => setError(null), []);
    return {
        state,
        loading,
        saving,
        error,
        dismissError,
        submitStep,
        goNext,
        goBack,
        goToStep,
        completeOnboarding,
        loadInitialState,
    };
}
export { STEP_ORDER };
