let alertHandler = null;

export const registerAlertHandler = (handler) => {
  alertHandler = handler;
};

export const unregisterAlertHandler = () => {
  alertHandler = null;
};

export const showAlert = (options) => {
  if (alertHandler) {
    alertHandler(options);
  } else {
    console.warn('[CRUVO Alert]', options?.title, options?.message);
  }
};

export const showError = (message, title = 'Error', onConfirm = null) => {
  showAlert({
    title,
    message: typeof message === 'string' ? message : JSON.stringify(message),
    type: 'danger',
    confirmText: 'OK',
    showCancel: false,
    onConfirm,
  });
};

export const showSuccess = (message, title = 'Success', onConfirm = null) => {
  showAlert({
    title,
    message,
    type: 'success',
    confirmText: 'DONE',
    showCancel: false,
    onConfirm,
  });
};

export const showWarning = (message, title = 'Warning', onConfirm = null) => {
  showAlert({
    title,
    message,
    type: 'warning',
    confirmText: 'UNDERSTOOD',
    showCancel: false,
    onConfirm,
  });
};

export const showInfo = (message, title = 'Notice', onConfirm = null) => {
  showAlert({
    title,
    message,
    type: 'info',
    confirmText: 'OK',
    showCancel: false,
    onConfirm,
  });
};

/**
 * Drop-in replacement for React Native's Alert.alert(title, message, buttons)
 */
export const customAlert = (title, message, buttons) => {
  if (!buttons || buttons.length === 0) {
    showAlert({
      title: title || 'Notice',
      message: message || '',
      type: title?.toLowerCase().includes('error') ? 'danger' : 'info',
      confirmText: 'OK',
      showCancel: false,
    });
    return;
  }

  if (buttons.length === 1) {
    const btn = buttons[0];
    showAlert({
      title: title || 'Notice',
      message: message || '',
      type: title?.toLowerCase().includes('error') ? 'danger' : 'info',
      confirmText: btn.text || 'OK',
      showCancel: false,
      onConfirm: btn.onPress,
    });
    return;
  }

  // 2+ buttons: cancel & confirm
  const cancelBtn = buttons.find((b) => b.style === 'cancel') || buttons[0];
  const confirmBtn = buttons.find((b) => b.style !== 'cancel') || buttons[1];
  const isDestructive = confirmBtn.style === 'destructive' || title?.toLowerCase().includes('delete');

  showAlert({
    title: title || 'Confirmation',
    message: message || '',
    type: isDestructive ? 'danger' : 'warning',
    confirmText: confirmBtn.text || 'CONFIRM',
    cancelText: cancelBtn.text || 'CANCEL',
    showCancel: true,
    onConfirm: confirmBtn.onPress,
    onCancel: cancelBtn.onPress,
  });
};

export default {
  showAlert,
  showError,
  showSuccess,
  showWarning,
  showInfo,
  customAlert,
};

