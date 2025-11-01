import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileText, Calendar, Loader2, Scale, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface Case {
  _id: string;
  case_facts?: string;
  file_name?: string;
  created_at?: string;
  full_directive?: string;
}

const Dashboard = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }

    const fetchCases = async () => {
      try {
        const response = await fetch(
          'https://legal-backend-api-chatbot.onrender.com/cases',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch cases');
        }

        const data = await response.json();
        setCases(data.cases || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load cases',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, [token, user, navigate, toast]);

  const handleCaseClick = (caseItem: Case) => {
    sessionStorage.setItem('legal_conversation_id', caseItem._id);
    if (caseItem.case_facts) {
      sessionStorage.setItem('legal_case_description', caseItem.case_facts);
    }
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Scale className="w-8 h-8 text-amber-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">CaseMind</h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">Your Dashboard</p>
              </div>
            </div>
            <Link to="/upload">
              <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4" />
                New Analysis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Your Legal Cases
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            View and manage all your case analyses
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Loading your cases...</p>
            </div>
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <FileText className="w-20 h-20 mx-auto mb-6 text-amber-600/50" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">No cases yet</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Begin your legal intelligence journey by uploading your first case document
            </p>
            <Link to="/upload">
              <Button size="lg" className="gap-2 bg-amber-600 hover:bg-amber-700">
                <Plus className="w-5 h-5" />
                Create First Case
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((caseItem) => (
              <button
                key={caseItem._id}
                onClick={() => handleCaseClick(caseItem)}
                className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-amber-600/50 transition-all text-left group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate mb-1">
                      {caseItem.file_name || 'Untitled Case'}
                    </h3>
                    {caseItem.case_facts && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {caseItem.case_facts}
                      </p>
                    )}
                  </div>
                </div>
                {caseItem.created_at && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(caseItem.created_at), 'MMM d, yyyy')}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
