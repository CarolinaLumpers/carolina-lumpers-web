import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props 
}) => {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-cls-amber text-cls-charcoal hover:bg-cls-gold hover:shadow-lg active:scale-95',
    secondary: 'bg-cls-charcoal text-white hover:bg-cls-dark hover:shadow-lg active:scale-95',
    ghost: 'bg-transparent text-cls-charcoal hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800',
    outline: 'bg-transparent border-2 border-cls-amber text-cls-amber hover:bg-cls-amber hover:text-cls-charcoal',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg active:scale-95',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className={`animate-spin ${iconSizes[size]}`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon className={iconSizes[size]} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className={iconSizes[size]} />}
    </button>
  );
};

export default Button;
