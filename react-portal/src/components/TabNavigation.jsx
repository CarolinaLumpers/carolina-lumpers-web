import React from 'react';

const TabNavigation = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex gap-1" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            disabled={tab.disabled}
            className={`
              whitespace-nowrap py-3 px-3 md:px-4 border-b-2 font-medium text-sm transition-colors rounded-t-lg flex-1 md:flex-none
              ${
                activeTab === tab.id
                  ? 'border-cls-amber text-gray-700 dark:text-cls-amber bg-gray-50 dark:bg-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800/50'
              }
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center justify-center gap-2">
              {tab.icon && <tab.icon className="w-4 h-4 md:w-5 md:h-5" />}
              <span className="text-xs md:text-sm">{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 py-0.5 px-1.5 md:px-2 rounded-full text-xs font-medium bg-cls-amber text-cls-charcoal">
                  {tab.badge}
                </span>
              )}
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;
