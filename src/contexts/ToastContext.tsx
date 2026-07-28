import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Typography, Box, Button } from '@mui/joy';

type ToastColor = 'success' | 'danger' | 'warning' | 'neutral';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  message: string;
  color: ToastColor;
  autoHideDuration: number;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, color?: ToastColor, duration?: number, action?: ToastAction) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  /** Neutral toast with an "Undo" button; 8s window before it dismisses. */
  showUndo: (message: string, onUndo: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast>({
    message: '',
    color: 'neutral',
    autoHideDuration: 4000,
  });

  const showToast = useCallback(
    (message: string, color: ToastColor = 'neutral', duration?: number, action?: ToastAction) => {
      setToast({
        message,
        color,
        autoHideDuration: duration ?? (color === 'danger' ? 6000 : 4000),
        action,
      });
      setOpen(true);
    },
    [],
  );

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'danger'), [showToast]);
  const showUndo = useCallback(
    (message: string, onUndo: () => void) => {
      showToast(message, 'neutral', 8000, {
        label: 'Undo',
        onClick: () => {
          onUndo();
          setOpen(false);
        },
      });
    },
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showUndo }}>
      {children}
      <Snackbar
        open={open}
        onClose={() => setOpen(false)}
        autoHideDuration={toast.autoHideDuration}
        color={toast.color}
        variant="soft"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ minWidth: 240, maxWidth: 420 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          <Typography level="body-sm" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
            {toast.message}
          </Typography>
          {toast.action && (
            <Button
              size="sm"
              variant="plain"
              color={toast.color === 'neutral' ? 'primary' : toast.color}
              onClick={toast.action.onClick}
              sx={{ fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {toast.action.label}
            </Button>
          )}
        </Box>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
