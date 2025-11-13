import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const DrawerNavigation = ({ tabs, activeTab, onChange, onLogout }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleTabClick = (tabId) => {
    onChange(tabId);
    setIsOpen(false); // Close drawer after selection
  };

  const handleLogout = () => {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <>
      {/* Mobile Header Bar - Only visible on mobile */}
      <div className="md:hidden flex items-center gap-3 p-3 bg-white dark:bg-cls-charcoal border-b border-gray-200 dark:border-gray-700">
        {/* Hamburger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* CLS Logo Text */}
        <span className="text-2xl font-anton text-cls-amber">CLS</span>

        {/* Divider */}
        <div className="border-l border-gray-300 dark:border-gray-600 h-10"></div>

        {/* Employee Portal */}
        <span className="text-base font-semibold text-gray-700 dark:text-gray-300">{t('common.employeePortal', 'Employee Portal')}</span>
      </div>

      {/* Backdrop Overlay - Only on mobile when open */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Menu - Fixed sidebar on desktop, slide-out on mobile */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-white dark:bg-cls-charcoal shadow-2xl z-50 flex flex-col
          md:translate-x-0 md:shadow-lg
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
          <span className="text-5xl font-anton text-cls-amber leading-none">CLS</span>
        </div>

        {/* Drawer Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Navigation</h3>
          {/* Close button only on mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                disabled={tab.disabled}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors mb-1
                  ${
                    activeTab === tab.id
                      ? 'bg-cls-amber text-cls-charcoal'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {tab.icon && <tab.icon className="w-5 h-5" />}
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.badge && (
                  <span className={`
                    py-0.5 px-2 rounded-full text-xs font-medium
                    ${activeTab === tab.id ? 'bg-cls-charcoal text-cls-amber' : 'bg-cls-amber text-cls-charcoal'}
                  `}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Logout Button at Bottom - Always visible */}
          {onLogout && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="flex-1 text-left">{t('auth.logout', 'Logout')}</span>
              </button>
            </div>
          )}
        </nav>
      </div>
    </>
  );
};

export default DrawerNavigation;
