import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  type = 'button', 
  className = '', 
  loading = false,
  icon,
  ...props 
}) => {
  const baseClass = 'btn';
  const variantClass = variant === 'primary' ? 'btn-primary' : variant === 'outline' ? 'btn-outline' : '';
  
  return (
    <button 
      type={type} 
      className={`${baseClass} ${variantClass} ${className}`} 
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
