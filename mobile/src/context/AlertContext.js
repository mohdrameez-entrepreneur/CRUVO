import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import GlassModal from '../components/GlassModal';
import { registerAlertHandler, unregisterAlertHandler } from '../utils/alert';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [config, setConfig] = useState(null);

  const showAlert = useCallback((options) => {
    setConfig({
      visible: true,
      type: options.type || 'primary',
      icon: options.icon,
      badge: options.badge,
      title: options.title || 'Notice',
      message: options.message || '',
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      showCancel: options.showCancel || false,
      isLoading: options.isLoading || false,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setConfig(null);
  }, []);

  useEffect(() => {
    registerAlertHandler(showAlert);
    return () => unregisterAlertHandler();
  }, [showAlert]);

  const handleConfirm = () => {
    const cb = config?.onConfirm;
    hideAlert();
    if (cb) cb();
  };

  const handleCancel = () => {
    const cb = config?.onCancel;
    hideAlert();
    if (cb) cb();
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {config && (
        <GlassModal
          visible={config.visible}
          type={config.type}
          icon={config.icon}
          badge={config.badge}
          title={config.title}
          message={config.message}
          confirmText={config.confirmText}
          cancelText={config.cancelText}
          showCancel={config.showCancel}
          isLoading={config.isLoading}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export default AlertContext;

