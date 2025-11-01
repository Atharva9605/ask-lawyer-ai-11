import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Case {
  _id: string;
  case_facts?: string;
  file_name?: string;
  created_at?: string;
  full_directive?: string;
}

const Cases = () => {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/upload">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">My Cases</h1>
          </div>
          <Link to="/upload">
            <Button>New Analysis</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No cases yet</h2>
            <p className="text-muted-foreground mb-4">
              Start by uploading your first legal document
            </p>
            <Link to="/upload">
              <Button>Upload Document</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((caseItem) => (
              <button
                key={caseItem._id}
                onClick={() => handleCaseClick(caseItem)}
                className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow text-left"
              >
                <div className="flex items-start gap-3 mb-3">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {caseItem.file_name || 'Untitled Case'}
                    </h3>
                    {caseItem.case_facts && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {caseItem.case_facts}
                      </p>
                    )}
                  </div>
                </div>
                {caseItem.created_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

export default Cases;
