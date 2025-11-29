import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, MessageSquare, Scale, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE_URL } from '../lib/legalStreamAPI';

interface DirectiveData {
  hearing_id: string;
  full_directive: string;
  chat_history: string[];
  case_facts?: string;
}

const DirectiveView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();
  const { toast } = useToast();

  const hearingId = searchParams.get('hearing_id');

  const [directive, setDirective] = useState<DirectiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }

    if (!hearingId) {
      toast({
        title: 'Error',
        description: 'Missing hearing information',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    fetchDirective();
  }, [token, user, hearingId]);

  const fetchDirective = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/hearings/${hearingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch directive');
      }

      const data = await response.json();
      setDirective(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load directive',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!directive) return;

    const blob = new Blob([directive.full_directive], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `directive-${directive.hearing_id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Directive downloaded successfully',
    });
  };

  const handleContinueChat = () => {
    if (!hearingId) return;
    sessionStorage.setItem('legal_conversation_id', hearingId);
    if (directive?.case_facts) {
      sessionStorage.setItem('legal_case_description', directive.case_facts);
    }
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Cases
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Directive View</h1>
                  {directive && (
                    <p className="text-xs text-muted-foreground">
                      Hearing ID: {directive.hearing_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {!isLoading && directive && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  size="sm"
                  onClick={handleContinueChat}
                  className="gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Continue Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ) : directive ? (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">
                    War Game Directive
                  </CardTitle>
                  {directive?.case_facts && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Case Facts Summary:</span>{' '}
                      {directive.case_facts}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="p-8 prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {directive.full_directive}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Directive Not Found</h2>
              <p className="text-muted-foreground mb-6">
                Unable to load the directive for this hearing
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DirectiveView;
