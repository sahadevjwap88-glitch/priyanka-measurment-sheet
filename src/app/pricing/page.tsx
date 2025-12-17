'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Check } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
    const freeFeatures = [
        '1 Sheet',
        'Download Measurements',
        'Basic Support',
    ];
    const premiumFeatures = [
        'Up to 4 Sheets',
        'Generate and Save Bills',
        'View Sales History',
        'Customizable Bills',
        'Priority Support',
    ];
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">Unlock more features and grow your business.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Free Plan Card */}
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Free Plan</CardTitle>
                <CardDescription>Perfect for getting started and personal use.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-4xl font-bold mb-6">₹0</p>
                 <ul className="space-y-3">
                    {freeFeatures.map(feature => (
                        <li key={feature} className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                 </ul>
            </CardContent>
            <CardFooter>
                 <Button variant="outline" className="w-full" disabled>Current Plan</Button>
            </CardFooter>
        </Card>

        {/* Premium Plan Card */}
        <Card className="border-primary flex flex-col">
            <CardHeader>
                <CardTitle>Premium Plan</CardTitle>
                <CardDescription>For professionals who need more power and features.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-4xl font-bold mb-2">₹1000<span className="text-lg font-normal text-muted-foreground">/year</span></p>
                 <p className="text-xs text-muted-foreground mb-6">Billed annually.</p>
                 <ul className="space-y-3">
                    {premiumFeatures.map(feature => (
                        <li key={feature} className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                 </ul>
            </CardContent>
            <CardFooter>
                 <Link href="/payment?plan=premium" className="w-full">
                    <Button className="w-full">Choose Premium</Button>
                </Link>
            </CardFooter>
        </Card>
      </div>

      <Link href="/" passHref>
        <Button variant="link" className="mt-12">
            Back to Home
        </Button>
      </Link>
    </div>
  );
}
