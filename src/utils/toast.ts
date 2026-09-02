import { toast as hotToast } from 'react-hot-toast';

export const toast = {
  success: (message: string) => {
    return hotToast.success(message, {
      style: {
        background: '#1c1917',
        color: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #44403c',
        fontSize: '0.875rem',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      },
      iconTheme: {
        primary: '#10b981',
        secondary: '#ffffff',
      },
      duration: 4000,
    });
  },

  error: (message: string) => {
    return hotToast.error(message, {
      style: {
        background: '#881337',
        color: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #9f1239',
        fontSize: '0.875rem',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(136, 19, 55, 0.4)',
      },
      iconTheme: {
        primary: '#ffffff',
        secondary: '#881337',
      },
      duration: 5000,
    });
  },

  info: (message: string) => {
    return hotToast(message, {
      icon: 'ℹ️',
      style: {
        background: '#1c1917',
        color: '#f5f5f4',
        borderRadius: '0.75rem',
        border: '1px solid #44403c',
        fontSize: '0.875rem',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      },
      duration: 4000,
    });
  },

  warning: (message: string) => {
    return hotToast(message, {
      icon: '⚠️',
      style: {
        background: '#78350f',
        color: '#fef3c7',
        borderRadius: '0.75rem',
        border: '1px solid #92400e',
        fontSize: '0.875rem',
        fontWeight: '500',
        padding: '12px 16px',
        boxShadow: '0 10px 15px -3px rgba(120, 53, 15, 0.4)',
      },
      duration: 4500,
    });
  },

  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => {
    return hotToast.promise(
      promise,
      msgs,
      {
        style: {
          background: '#1c1917',
          color: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #44403c',
          fontSize: '0.875rem',
          fontWeight: '500',
        },
      }
    );
  },
};
