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
  signInWithPopup,
  sendEmailVerification,
  signOut,
  User,
} from 'firebase/auth';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';


const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

async function createUserDocument(firestore: any, user: User) {
    const userRef = doc(firestore, 'users', user.uid);
    await setDoc(userRef, {
      id: user.uid,
      email: user.email,
      displayName: user.displayName || 'Anonymous',
      createdAt: serverTimestamp(),
      photoUrl: user.photoURL || '',
      address: '',
      isAdmin: false,
    });
}


export default function RegisterPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

   useEffect(() => {
    // Redirect if user is already logged in
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await createUserDocument(firestore, userCredential.user);
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
    try {
      await signInWithPopup(auth, provider);
      // On successful sign-in, the useEffect hook on the login page will handle document creation and redirection.
      // A small delay might be needed for auth state to propagate before redirecting.
      router.push('/');
    } catch (error: any) {
      console.error('Google sign in failed', error);
       let title = 'Google Sign-in failed';
      let description = 'An unexpected error occurred. Please try again.';

      if (error.code) {
        switch (error.code) {
          case 'auth/operation-not-allowed':
             title = 'Sign-in method disabled';
            description = 'Google sign-in is not enabled. Please enable it in your Firebase project settings.';
            break;
          case 'auth/popup-closed-by-user':
            title = 'Sign-in cancelled';
            description = 'You closed the sign-in window before completing the process.';
            break;
        }
      }

      toast({
        variant: "destructive",
        title: title,
        description: description,
      });
    }
  };

  if (isUserLoading || user) {
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
          
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
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
