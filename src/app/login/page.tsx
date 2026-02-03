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
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithRedirect,
  sendPasswordResetEmail,
  getRedirectResult,
  User,
} from 'firebase/auth';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { ensureUserDocument } from '@/firebase/auth/user-document';
import { type Firestore } from 'firebase/firestore';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" className="mr-2">
      <path fill="#4285F4" d="M24 9.5c3.9 0 6.9 1.6 9 3.6l6.9-6.9C34.7 2.1 29.8 0 24 0 14.9 0 7.3 5.4 3 13.2l8.2 6.3C13.2 13.2 18.2 9.5 24 9.5z"/>
      <path fill="#34A853" d="M46.9 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.9c-.6 3-2.3 5.5-4.9 7.2l7.8 6c4.6-4.2 7.2-10.3 7.2-17.5z"/>
      <path fill="#FBBC05" d="M11.2 19.5c-1.2 3.6-1.2 7.7 0 11.3l-8.2 6.3C.1 32.4 0 28.3 0 24s.1-8.4 3-12.8L11.2 19.5z"/>
      <path fill="#EA4335" d="M24 48c5.8 0 10.7-1.9 14.2-5.2l-7.8-6c-1.9 1.3-4.4 2.1-7.4 2.1-5.6 0-10.4-3.7-12.1-8.8L3 36.8C7.3 44.6 14.9 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );

const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" className="mr-2">
        <path fill="#3b5998" d="M42,37c0,2.762-2.238,5-5,5H11c-2.761,0-5-2.238-5-5V11c0-2.762,2.239-5,5-5h26c2.762,0,5,2.238,5,5V37z"/>
        <path fill="#fff" d="M34.368,25.708l0.616-4.58h-4.29V18.14c0-1.248,0.574-2.48,2.56-2.48h2.088v-3.94c-0.457-0.046-1.554-0.12-2.91-0.12c-2.92,0-5.114,1.808-5.114,5.43v3.702H22.08v4.58h4.744v10.72c0.92,0.14,1.86,0.22,2.812,0.22s1.892-0.08,2.812-0.22V25.708H34.368z"/>
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
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
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
    if (user) {
        router.push('/');
        return;
    }

    const auth = getAuth();
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          ensureUserDocument(firestore, result.user);
          // The useUser hook will update and the effect below will redirect.
        }
      })
      .catch((error) => {
        console.error('Sign in redirect error:', error);
        let title = 'Sign-in failed';
        let description = 'Could not complete sign-in. Please try again.';

        if (error.code === 'auth/account-exists-with-different-credential') {
            title = 'Email already in use';
            description = 'An account already exists with this email address using a different sign-in method. Please sign in with the original method.';
        }
        
        toast({
            variant: 'destructive',
            title: title,
            description: description,
        });
      }).finally(() => {
        setIsProcessingRedirect(false);
      });
  }, [user, router, firestore]);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      if (!userCredential.user.emailVerified) {
        setUnverifiedEmail(values.email);
        await auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Email not verified',
          description: 'Please verify your email before logging in.',
        });
        return;
      }
      ensureUserDocument(firestore, userCredential.user);
      // User will be redirected by the useEffect hook
    } catch (error: any) {
      console.error('Failed to sign in', error);
      let title = 'Sign-in failed';
      let description = 'An unexpected error occurred. Please try again.';

      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
            title = 'Password or Email Incorrect';
            description = 'The email or password you entered is incorrect. Please try again.';
            break;
          case 'auth/operation-not-allowed':
            title = 'Sign-in method disabled';
            description =
              'Email/password sign-in is not enabled. Please enable it in your Firebase project settings.';
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
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    await signInWithRedirect(auth, provider);
  };
  
  const handleFacebookSignIn = async () => {
    const auth = getAuth();
    const provider = new FacebookAuthProvider();
    await signInWithRedirect(auth, provider);
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
    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetEmailSent(true);
    } catch (error: any) {
      console.error('Password reset failed', error);
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


  if (isUserLoading || isProcessingRedirect || user) {
    return <p>Loading...</p>;
  }

  return (
    <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>to access your granite measurements</CardDescription>
          </CardHeader>
          <CardContent>
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
                <Button type="submit" className="w-full">Sign In</Button>
              </form>
            </Form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="space-y-2">
                <Button variant="secondary" className="w-full" onClick={handleGoogleSignIn}>
                  <GoogleIcon />
                  Sign in with Google
                </Button>
                <Button variant="secondary" className="w-full" onClick={handleFacebookSignIn}>
                  <FacebookIcon />
                  Sign in with Facebook
                </Button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Register
              </Link>
            </p>
             <Link href="/" passHref>
                <Button variant="secondary" className="w-full mt-4">
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
