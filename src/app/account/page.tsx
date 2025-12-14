'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import AuthGuard from '@/components/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SETTINGS_KEY } from '@/components/granite-grid-page';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

function AccountPage() {
    const { user } = useUser();

    // Settings state
    const [showLabourCharges, setShowLabourCharges] = useState(true);
    const [showTransportCharges, setShowTransportCharges] = useState(true);
    const [labourRate, setLabourRate] = useState(3);
    const [minLabourCharges, setMinLabourCharges] = useState(200);
    const [businessName, setBusinessName] = useState('Priyanka Granite');
    const [contactName, setContactName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    
    useEffect(() => {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            setShowLabourCharges(parsedSettings.showLabourCharges ?? true);
            setShowTransportCharges(parsedSettings.showTransportCharges ?? true);
            if (parsedSettings.labourRate) setLabourRate(parsedSettings.labourRate);
            if (parsedSettings.minLabourCharges) setMinLabourCharges(parsedSettings.minLabourCharges);
            if (parsedSettings.businessName) setBusinessName(parsedSettings.businessName);
            if (parsedSettings.contactName) setContactName(parsedSettings.contactName);
            if (parsedSettings.phoneNumber) setPhoneNumber(parsedSettings.phoneNumber);
            if (parsedSettings.address) setAddress(parsedSettings.address);
        } catch (error) {
            console.error("Failed to parse settings from localStorage", error);
        }
        }
    }, []);

    const handleSaveChanges = () => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ 
            showLabourCharges, 
            showTransportCharges, 
            labourRate, 
            minLabourCharges,
            businessName,
            contactName,
            phoneNumber,
            address
        }));
        toast({
            title: 'Settings Saved',
            description: 'Your changes have been saved successfully.',
        });
    };

    return (
        <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold">My Account</h1>
                <p className="text-muted-foreground">Manage your account and application settings.</p>
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Application Settings</CardTitle>
                    <CardDescription>These settings customize the bill generation.</CardDescription>
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
                                <Label htmlFor="contact-name">Your Name</Label>
                                <Input
                                id="contact-name"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                placeholder="Enter your name"
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
                            <div className="space-y-2">
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
                    <div className="flex justify-end">
                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                    </div>
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
