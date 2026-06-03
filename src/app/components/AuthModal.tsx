import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../auth/AuthContext';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onModeChange: (mode: 'login' | 'signup') => void;
  onAuthenticated: () => void;
}

export function AuthModal({ mode, onClose, onModeChange, onAuthenticated }: AuthModalProps) {
  const { signIn, signUp, resendConfirmation } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setCanResendConfirmation(false);

    try {
      if (mode === 'login') {
        await signIn(email, password);
        onClose();
        onAuthenticated();
      } else {
        const result = await signUp(email, password, fullName);
        if (result.needsConfirmation) {
          setMessage('Account created. Please check your email to confirm your account before logging in.');
        } else {
          setMessage('Account created. You are now signed in.');
          setTimeout(() => {
            onClose();
            onAuthenticated();
          }, 700);
        }
      }
    } catch (error: any) {
      const errorMessage = error.message ?? 'Authentication failed.';
      setCanResendConfirmation(errorMessage.toLowerCase().includes('email not confirmed'));
      setMessage(
        errorMessage.toLowerCase().includes('email not confirmed')
          ? 'Email is not confirmed yet. Please use the confirmation link, or resend it below.'
          : errorMessage
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    setSubmitting(true);
    setMessage('');

    try {
      await resendConfirmation(email);
      setCanResendConfirmation(false);
      setMessage('Confirmation email resent. Please check your inbox and spam folder.');
    } catch (error: any) {
      setMessage(error.message ?? 'Unable to resend confirmation email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-primary">{mode === 'login' ? 'Log in' : 'Create Account'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block mb-2">Full Name</label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
                required
              />
            </div>
          )}

          <div>
            <label className="block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
              required
            />
          </div>

          <div>
            <label className="block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
              required
              minLength={6}
            />
          </div>

          {message && <p className="text-sm text-foreground/70">{message}</p>}

          {canResendConfirmation && (
            <Button type="button" variant="outline" className="w-full" disabled={submitting || !email} onClick={handleResendConfirmation}>
              Resend Confirmation Email
            </Button>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Working...' : mode === 'login' ? 'Log in' : 'Create Account'}
          </Button>
        </form>

        <button
          className="mt-4 w-full text-sm text-primary hover:underline"
          onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
