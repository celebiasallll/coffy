import React from 'react';

const AlertModal = ({ open, message, onClose }) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-content">
          <p>{message}</p>
          <button onClick={onClose} className="modal-btn">OK</button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal; 