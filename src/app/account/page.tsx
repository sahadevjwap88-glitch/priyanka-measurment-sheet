'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import AuthGuard from '@/components/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LogOut, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

function AccountPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    // Settings state with initial defaults
    const [displayName, setDisplayName] = useState('');
    const [showLabourCharges, setShowLabourCharges] = useState(true);
    const [showTransportCharges, setShowTransportCharges] = useState(true);
    const [labourRate, setLabourRate] = useState(3);
    const [minLabourCharges, setMinLabourCharges] = useState(200);
    const [businessName, setBusinessName] = useState('Priyanka Granite');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [sheets, setSheets] = useState([]);
    const [activeSheetId, setActiveSheetId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        if (user && firestore) {
            const userDocRef = doc(firestore, 'users', user.uid);
            getDoc(userDocRef)
                .then((docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setDisplayName(data.displayName || '');
                        setShowLabourCharges(data.showLabourCharges ?? true);
                        setShowTransportCharges(data.showTransportCharges ?? true);
                        setLabourRate(data.labourRate ?? 3);
                        setMinLabourCharges(data.minLabourCharges ?? 200);
                        setBusinessName(data.businessName || 'Priyanka Granite');
                        setPhoneNumber(data.phoneNumber || '');
                        setAddress(data.address || '');
                        setSheets(data.sheets || []);
                        setActiveSheetId(data.activeSheetId || '');
                    }
                })
                .catch((error) => {
                    console.error("Error fetching user settings:", error);
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Could not load your settings.",
                    });
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [user, firestore]);

    const handleProfileUpdate = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to save changes.' });
            return;
        }
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            await setDoc(userDocRef, {
                displayName,
                showLabourCharges,
                showTransportCharges,
                labourRate,
                minLabourCharges,
                businessName,
                phoneNumber,
                address,
                sheets,
                activeSheetId
            }, { merge: true });

            toast({
                title: "Settings Saved",
                description: "Your new settings have been saved successfully.",
            });
        } catch (error) {
            console.error("Failed to update profile", error);
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "Could not save your settings.",
            });
        }
    };

    const handleSignOut = async () => {
        const auth = getAuth();
        await signOut(auth);
        router.push('/login');
    };
    
    if (isLoading) {
        return <div className="p-8 text-center">Loading account details...</div>
    }

    return (
        <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">My Account</h1>
                    <p className="text-muted-foreground">Manage your account and application settings.</p>
                </div>
                 <Link href="/" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>This is your account information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user?.email || ''} readOnly disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="display-name">Display Name</Label>
                        <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Application Settings</CardTitle>
                    <CardDescription>These settings customize the bill generation and are saved to your profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                         <h3 className="text-lg font-medium">Business Details</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="business-name">Business Name</Label>
                                <Input
                                id="business-name"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="e.g., Priyanka Granite"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone-number">Phone Number</Label>
                                <Input
                                id="phone-number"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="Enter phone number"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter business address"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Billing Rules</h3>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="show-labour" className="flex flex-col space-y-1">
                                <span>Show Labour Charges</span>
                                <span className="font-normal leading-snug text-muted-foreground">
                                Enable or disable the labour charges field on the bill page.
                                </span>
                            </Label>
                            <Switch
                                id="show-labour"
                                checked={showLabourCharges}
                                onCheckedChange={setShowLabourCharges}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-transport" className="flex flex-col space-y-1">
                                <span>Show Transport Charges</span>
                                <span className="font-normal leading-snug text-muted-foreground">
                                Enable or disable the transport charges field on the bill page.
                                </span>
                            </Label>
                            <Switch
                                id="show-transport"
                                checked={showTransportCharges}
                                onCheckedChange={setShowTransportCharges}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="labour-rate">Labour Rate (per SFT)</Label>
                                <Input
                                id="labour-rate"
                                type="number"
                                value={labourRate}
                                onChange={(e) => setLabourRate(Number(e.target.value))}
                                placeholder="e.g., 3"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min-labour-charges">Minimum Labour Charges</Label>
                                <Input
                                id="min-labour-charges"
                                type="number"
                                value={minLabourCharges}
                                onChange={(e) => setMinLabourCharges(Number(e.target.value))}
                                placeholder="e.g., 200"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleProfileUpdate}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                    <CardDescription>Log out of your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                    </Button>
                </CardContent>
            </Card>

        </div>
    );
}


export default function AccountPageWithAuth() {
    return (
        <AuthGuard>
            <AccountPage />
        </AuthGuard>
    );
}
