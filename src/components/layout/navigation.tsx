"use client";

import Link from 'next/link';

export type NavRoute = {
  path: string;
  label: string;
};

// Default routes used in the application
export const defaultRoutes: NavRoute[] = [
  { path: '/', label: 'Dashboard' },
  { path: '/tasks', label: 'Tasks' }
];

interface NavItemProps {
  route: NavRoute;
  isActive: boolean;
}

export function NavItem({ route, isActive }: NavItemProps) {
  return (
    <Link 
      href={route.path}
      className={`${isActive ? 'text-white' : 'text-neutral-400'} hover:text-white transition-colors`}
    >
      {route.label}
    </Link>
  );
}

interface NavigationProps {
  routes?: NavRoute[];
  activePath: string;
  className?: string;
}

export function Navigation({ 
  routes = defaultRoutes, 
  activePath, 
  className = "flex gap-4 items-center" 
}: NavigationProps) {
  return (
    <nav className={className}>
      {routes.map((route) => (
        <NavItem 
          key={route.path}
          route={route}
          isActive={
            route.path === '/' 
            ? activePath === '/' 
            : activePath === route.path || activePath.startsWith(`${route.path}/`)
          }
        />
      ))}
    </nav>
  );
}
