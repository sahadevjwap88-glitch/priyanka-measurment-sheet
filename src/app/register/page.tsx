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
import { Input } from '@/components/ui/input';
import {
  getAuth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithRedirect,
  sendEmailVerification,
  signOut,
  getRedirectResult,
  User,
} from 'firebase/auth';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { doc, setDoc, serverTimestamp, type Firestore, getDoc } from 'firebase/firestore';


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

function createUserDocument(firestore: Firestore, user: User) {
    const userRef = doc(firestore, 'users', user.uid);
    
    getDoc(userRef).then(docSnap => {
        if (!docSnap.exists()) {
            const userData = {
                id: user.uid,
                email: user.email,
                displayName: user.displayName || 'Anonymous',
                createdAt: serverTimestamp(),
                photoUrl: user.photoURL || '',
                address: '',
                isAdmin: false,
            };
            setDoc(userRef, userData, { merge: true }).catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'create',
                    requestResourceData: userData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
        }
    });
}


export default function RegisterPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (user) {
        router.push('/');
        return;
    }
    const auth = getAuth();
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          createUserDocument(firestore, result.user);
          // The useUser hook will update and the effect below will redirect.
        }
      })
      .catch((error) => {
        console.error('Google sign in redirect error:', error);
        toast({
            variant: 'destructive',
            title: 'Google Sign-in failed',
            description: 'Could not complete sign-in. Please try again.',
        });
      }).finally(() => {
        setIsProcessingRedirect(false);
      });
  }, [user, router, firestore]);

   useEffect(() => {
    // This effect redirects the user once the `useUser` hook confirms they are logged in.
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      createUserDocument(firestore, userCredential.user);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      router.push(`/verify-email?email=${values.email}`);
    } catch (error: any) {
      console.error('Failed to register', error);
      let title = 'Registration failed';
      let description = 'An unexpected error occurred. Please try again.';

      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            title = 'User already exists';
            description = 'This email is already associated with an account. Sign in?';
            break;
          case 'auth/weak-password':
            title = 'Weak Password';
            description = 'The password is too weak. Please choose a stronger password.';
            break;
          case 'auth/operation-not-allowed':
            title = 'Registration disabled';
            description = 'Email/password registration is not currently enabled.';
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
    await signInWithRedirect(auth, provider);
  };

  if (isUserLoading || isProcessingRedirect || user) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>Enter your email and password to register</CardDescription>
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Create Account</Button>
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
          
          <Button variant="secondary" className="w-full" onClick={handleGoogleSignIn}>
            <GoogleIcon />
            Sign in with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
