'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';

function PaymentContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');

  const planDetails = {
    premium: {
      name: 'Premium Plan',
      price: '₹1000/year',
    },
  };

  const selectedPlan = plan === 'premium' ? planDetails.premium : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirm Your Plan</CardTitle>
          <CardDescription>You are about to purchase the following plan.</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedPlan ? (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <p className="text-lg font-semibold">{selectedPlan.name}</p>
                <p className="text-lg font-bold">{selectedPlan.price}</p>
              </div>
            </div>
          ) : (
            <p>No plan selected. Please go back and choose a plan.</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {selectedPlan && (
            <Button className="w-full">
              <CreditCard className="mr-2 h-4 w-4" />
              Continue to Payment
            </Button>
          )}
          <Link href="/pricing" passHref>
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change Plan
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PaymentContent />
        </Suspense>
    )
}
