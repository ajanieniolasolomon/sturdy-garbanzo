import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { logoutUser } from '../store/slices/authSlice';
import OfflineStatus from './OfflineStatus';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getNavigationItems = () => {
    const allItems = [
      { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HCW'] },
      { name: 'Hospitals', href: '/hospitals', icon: BuildingOfficeIcon, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { name: 'Patients', href: '/patients', icon: UserGroupIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HCW'] },
      { name: 'Healthcare Workers', href: '/users', icon: UsersIcon, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { name: 'Consultations', href: '/consultations', icon: ClipboardDocumentListIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HCW'] },
      { name: 'Care Tasks', href: '/tasks', icon: CheckCircleIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HCW'] },
    ];

    // Filter navigation items based on user role
    return allItems.filter(item => 
      user?.role && item.roles.includes(user.role)
    );
  };

  const navigation = getNavigationItems();

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-gray-900">CCMIS</h1>
                <span className="ml-2 text-xs text-gray-500">Chronic Care</span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive(item.href)
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-4 h-6 w-6" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.fullName?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-auto p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white/90 backdrop-blur-sm border-r border-gray-200/50 shadow-xl">
            <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-6">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">C</span>
                  </div>
                  <div className="ml-3">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">CCMIS</h1>
                    <span className="text-xs text-gray-500 font-medium">Chronic Care</span>
                  </div>
                </div>
              </div>
              <nav className="mt-8 flex-1 px-3 space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive(item.href)
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-105`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200/50 p-6">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                    <span className="text-lg font-bold text-white">
                      {user?.fullName?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{user?.fullName}</p>
                  <p className="text-xs text-gray-500 font-medium">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-auto p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
      
      {/* Offline Status Indicator */}
      <OfflineStatus />
    </div>
  );
};

export default Layout;