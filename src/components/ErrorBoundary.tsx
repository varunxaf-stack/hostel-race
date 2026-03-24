import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      try {
        const parsed = JSON.parse(this.state.error?.message || '');
        if (parsed.error) {
          errorMessage = parsed.error;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md border-red-900/50 bg-red-950/10">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-900/20 text-red-500 mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-red-500">Something went wrong</CardTitle>
              <CardDescription className="text-red-200/60">
                The application encountered an error.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-zinc-950 p-4 font-mono text-xs text-red-400 overflow-auto max-h-40">
                {errorMessage}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={this.handleReset} className="w-full gap-2 bg-red-600 hover:bg-red-700">
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
