import React, { useEffect } from 'react';

const Toast = ({ open, message, duration = 3000, onClose }) => {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;
  return (
    <div className="toast">
      {message}
    </div>
  );
};

export default Toast; 