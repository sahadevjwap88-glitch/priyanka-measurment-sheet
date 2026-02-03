
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import AuthGuard from '@/components/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LogOut, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { LOCAL_STORAGE_KEY } from '@/components/granite-grid-page';


function AccountPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const router = useRouter();

    // Settings state with initial defaults
    const [displayName, setDisplayName] = useState('');
    const [showLabourCharges, setShowLabourCharges] = useState(true);
    const [showTransportCharges, setShowTransportCharges] = useState(true);
    const [labourRate, setLabourRate] = useState(3);
    const [minLabourCharges, setMinLabourCharges] = useState(200);
    const [businessName, setBusinessName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        setIsLoading(true);
        // Load from local storage first for offline support
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                setDisplayName(parsedData.displayName || (user?.displayName || ''));
                setShowLabourCharges(parsedData.showLabourCharges ?? true);
                setShowTransportCharges(parsedData.showTransportCharges ?? true);
                setLabourRate(parsedData.labourRate ?? 3);
                setMinLabourCharges(parsedData.minLabourCharges ?? 200);
                setBusinessName(parsedData.businessName || '');
                setPhoneNumber(parsedData.phoneNumber || '');
                setAddress(parsedData.address || '');
            } catch (e) {
                console.error("Failed to parse local storage data on account page", e);
            }
        }

        // If user is logged in, fetch from Firestore to get the most up-to-date info
        if (user && firestore) {
            const userDocRef = doc(firestore, 'users', user.uid);
            getDoc(userDocRef)
                .then((docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        // Overwrite local state with Firestore data
                        setDisplayName(data.displayName || '');
                        setShowLabourCharges(data.showLabourCharges ?? true);
                        setShowTransportCharges(data.showTransportCharges ?? true);
                        setLabourRate(data.labourRate ?? 3);
                        setMinLabourCharges(data.minLabourCharges ?? 200);
                        setBusinessName(data.businessName || '');
                        setPhoneNumber(data.phoneNumber || '');
                        setAddress(data.address || '');
                    }
                })
                .catch((error) => {
                    console.error("Error fetching user settings:", error);
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Could not load your settings from the cloud.",
                    });
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, [user, firestore]);

    const handleProfileUpdate = async () => {
        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Not Logged In',
                description: 'You must be logged in to save settings to the cloud.'
            });
            return;
        }

        const settingsToSave = {
            displayName,
            showLabourCharges,
            showTransportCharges,
            labourRate,
            minLabourCharges,
            businessName,
            phoneNumber,
            address,
        };

        // Save to local storage for everyone
        try {
            const currentData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            const newData = { ...currentData, ...settingsToSave };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));

            // If user is logged in, also save to Firestore
            if (user && firestore) {
                const userDocRef = doc(firestore, 'users', user.uid);
                await setDoc(userDocRef, settingsToSave, { merge: true });
            }

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
        if (!user) {
            router.push('/login');
            return;
        }
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
                        <Input value={user?.email || 'Not logged in'} readOnly disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="display-name">Display Name</Label>
                        <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        disabled={!user}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Application Settings</CardTitle>
                    <CardDescription>Customize how your bills are generated.</CardDescription>
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
                                disabled={!user}
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
                                disabled={!user}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter business address"
                                disabled={!user}
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
                                disabled={!user}
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
                                disabled={!user}
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
                                disabled={!user}
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
                                disabled={!user}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleProfileUpdate} disabled={!user}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                    <CardDescription>{user ? 'Log out of your account.' : 'Log in to sync your data.'}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant={user ? 'destructive' : 'default'} onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {user ? 'Log Out' : 'Log In'}
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
