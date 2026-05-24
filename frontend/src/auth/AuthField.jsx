import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const AuthField = ({
  label,
  id,
  type = 'text',
  icon: Icon,
  error,
  showToggle,
  ...props
}) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showToggle && visible ? 'text' : type;

  return (
    <div className="auth-field">
      {label && (
        <label htmlFor={id} className="auth-field-label">
          {label}
        </label>
      )}
      <div className={`auth-field-wrap ${error ? 'has-error' : ''}`}>
        {Icon && (
          <span className="auth-field-icon" aria-hidden>
            <Icon size={18} strokeWidth={2} />
          </span>
        )}
        <input
          id={id}
          type={inputType}
          className="auth-field-input"
          {...props}
        />
        {isPassword && showToggle && (
          <button
            type="button"
            className="auth-field-toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="auth-field-error">{error}</span>}
    </div>
  );
};

export default AuthField;
