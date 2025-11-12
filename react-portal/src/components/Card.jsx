import React from 'react';

const Card = ({ 
  children, 
  title, 
  subtitle,
  footer,
  variant = 'default',
  className = '' 
}) => {
  const variants = {
    default: 'border-t-4 border-gray-300 dark:border-gray-700',
    amber: 'border-t-4 border-cls-amber',
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${variants[variant]} ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {title && <h3 className="text-xl font-semibold text-cls-charcoal dark:text-white">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
