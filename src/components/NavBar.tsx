import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Scale, Upload, MessageSquare, FolderOpen, LogOut, LogIn } from 'lucide-react';

export const NavBar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/upload" className="flex items-center gap-2 font-bold text-lg">
              <Scale className="w-6 h-6 text-primary" />
              Legal AI
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <Link to="/upload">
                <Button
                  variant={isActive('/upload') ? 'default' : 'ghost'}
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </Link>

              <Link to="/analyze">
                <Button
                  variant={isActive('/analyze') ? 'default' : 'ghost'}
                  size="sm"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Analyze
                </Button>
              </Link>

              {user && (
                <Link to="/cases">
                  <Button
                    variant={isActive('/cases') ? 'default' : 'ghost'}
                    size="sm"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    My Cases
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Button onClick={logout} variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="default" size="sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
