import React from 'react';

const ConfirmModal = ({ open, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-content">
          <p>{message}</p>
          <div className="modal-actions">
            <button onClick={onConfirm} className="modal-btn confirm">Yes</button>
            <button onClick={onCancel} className="modal-btn cancel">No</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal; 