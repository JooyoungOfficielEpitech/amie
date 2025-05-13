import { usePayment as usePaymentFromContext } from '../contexts/PaymentContext';

// Re-export the hook from context to maintain backward compatibility
export const usePayment = usePaymentFromContext;