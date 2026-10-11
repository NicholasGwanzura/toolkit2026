'use client';

import RewardsHub from '@/components/RewardsHub';
import VendorRewardsPanel from '@/components/VendorRewardsPanel';
import { useAuth } from '@/lib/auth';

export default function RewardsPage() {
    const { user: session } = useAuth();
    const isAdmin = session?.role === 'org_admin';
    const isVendor = session?.role === 'vendor';

    if (session && isVendor) {
        return <VendorRewardsPanel session={session} />;
    }

    // Technician view — clean, no supplier content
    if (!isAdmin) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rewards</h1>
                    <p className="text-gray-500 mt-1">Earn points through training and job activity, then redeem for tools, vouchers and courses.</p>
                </div>
                <RewardsHub adminView={false} />
            </div>
        );
    }

    // Admin view
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Rewards Overview</h1>
                <p className="mt-1 text-gray-500">Review redemption requests, see what people have earned, and check the current reward catalogue.</p>
            </div>
            <RewardsHub adminView={true} />
        </div>
    );
}
