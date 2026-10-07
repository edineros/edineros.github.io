interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/**
 * Alert dialog. Uses window.alert on web.
 */
export function alert(title: string, message?: string): void {
  window.alert(message ? `${title}\n\n${message}` : title);
}

/**
 * Alert dialog that returns a promise, resolving when the user dismisses it.
 */
export function alertAsync(title: string, message?: string): Promise<void> {
  return new Promise((resolve) => {
    window.alert(message ? `${title}\n\n${message}` : title);
    resolve();
  });
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  const { title, message } = options;

  return new Promise((resolve) => {
    resolve(window.confirm(`${title}\n\n${message}`));
  });
}
