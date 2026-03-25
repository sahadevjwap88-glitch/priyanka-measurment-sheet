'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithRedirect,
  sendPasswordResetEmail,
  getRedirectResult,
} from 'firebase/auth';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { ensureUserDocument } from '@/firebase/auth/user-document';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" className="mr-2">
      <path fill="#4285F4" d="M24 9.5c3.9 0 6.9 1.6 9 3.6l6.9-6.9C34.7 2.1 29.8 0 24 0 14.9 0 7.3 5.4 3 13.2l8.2 6.3C13.2 13.2 18.2 9.5 24 9.5z"/>
      <path fill="#34A853" d="M46.9 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.9c-.6 3-2.3 5.5-4.9 7.2l7.8 6c4.6-4.2 7.2-10.3 7.2-17.5z"/>
      <path fill="#FBBC05" d="M11.2 19.5c-1.2 3.6-1.2 7.7 0 11.3l-8.2 6.3C.1 32.4 0 28.3 0 24s.1-8.4 3-12.8L11.2 19.5z"/>
      <path fill="#EA4335" d="M24 48c5.8 0 10.7-1.9 14.2-5.2l-7.8-6c-1.9 1.3-4.4 2.1-7.4 2.1-5.6 0-10.4-3.7-12.1-8.8L3 36.8C7.3 44.6 14.9 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});


export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginEmail = form.watch('email');

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    } else if (!isUserLoading && !user) {
      setIsLoading(false);
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (auth && firestore) {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            ensureUserDocument(firestore, result.user);
            toast({
              title: 'Sign-in successful',
              description: `Welcome, ${result.user.displayName || 'user'}!`,
            });
          }
        })
        .catch((error) => {
          if (error.code === 'auth/internal-error' || error.code?.includes('403')) {
            toast({
              variant: 'destructive',
              title: 'Google Project Configuration Error (403)',
              description: 'This is likely because your Google Cloud project is in "Testing" mode. To fix this, go to the Google Cloud Console and set your OAuth consent screen to "Production" by clicking "PUBLISH APP".',
              duration: 15000,
            });
          } else if (error.code !== 'auth/popup-closed-by-user') {
            toast({
              variant: 'destructive',
              title: 'Sign-in failed',
              description: error.message || 'An unexpected error occurred. Please try again.',
            });
          }
        });
    }
  }, [auth, firestore]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      ensureUserDocument(firestore, userCredential.user);
    } catch (error: any) {
      let title = 'Sign-in failed';
      let description = 'An unexpected error occurred. Please try again.';

      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
            title = 'Incorrect Email or Password';
            description = 'The email or password you entered is incorrect. Please try again.';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            title = 'Incorrect Email or Password';
            description = 'The email or password you entered is incorrect. Please try again.';
            break;
        }
      }

      toast({
        variant: 'destructive',
        title: title,
        description: description,
      });
    }
  }

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
       toast({
          variant: 'destructive',
          title: 'Could Not Start Sign-In',
          description: error.message || 'There was an error when trying to redirect to Google.',
      });
    }
  };
  
  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter your email address.',
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetEmailSent(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send password reset email. Please try again.',
      });
    }
  };

  useEffect(() => {
    if (isForgotPasswordOpen) {
      setResetEmail(loginEmail);
      setResetEmailSent(false);
    }
  }, [isForgotPasswordOpen, loginEmail]);


  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>to access your granite measurements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Button variant="outline" className="w-full h-11" onClick={handleGoogleSignIn}>
                  <GoogleIcon />
                  Sign in with Google
                </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or use email
                </span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Password</FormLabel>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto text-xs text-primary"
                          >
                            Forgot password?
                          </Button>
                        </DialogTrigger>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-11">Sign In</Button>
              </form>
            </Form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Register
              </Link>
            </p>
             <Link href="/" passHref>
                <Button variant="ghost" className="w-full mt-4">
                    Skip for now
                </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      <DialogContent>
        {!resetEmailSent ? (
          <>
            <DialogHeader>
              <DialogTitle>Forgot Password</DialogTitle>
              <DialogDescription>
                Enter your email address and we&apos;ll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handlePasswordReset}>
                Get Reset Link
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Check Your Email</DialogTitle>
              <DialogDescription>
                We&apos;ve sent a password reset link to <span className="font-medium text-foreground">{resetEmail}</span>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">
                  Sign In
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
