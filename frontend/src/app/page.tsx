// src/app/page.tsx
'use client';

import { useAuction } from '../contexts';
import { useState, useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function AuctionPage() {
  const { auction, placeBid, isConnected, error } = useAuction();
  const [bidAmount, setBidAmount] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  useEffect(() => {
    if (auction) {
      console.log('Current auction state:', auction);
      console.log('Current highest bid:', auction.highest_bid);
    }
  }, [auction]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md" />
      </div>
    );
  }

  const handleBid = () => {
    const amount = parseFloat(bidAmount);
    if (!isNaN(amount) && isConnected) {
      console.log('Page: Attempting to place bid of:', amount);
      placeBid(amount);
      setBidAmount('');
    } else {
      console.error('Invalid bid amount or not connected:', { amount, isConnected });
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="bg-white border shadow-lg">
          <AlertTitle className="text-black font-bold">Connecting</AlertTitle>
          <AlertDescription className="text-gray-600">
            Connecting to auction server...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="bg-white border shadow-lg">
          <AlertTitle className="text-black font-bold">Loading</AlertTitle>
          <AlertDescription className="text-gray-600">
            Loading auction data...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
<div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Live Auction</h1>
      {/* Add connection status indicator */}
      <div className="mb-4">
        <span className={`inline-block px-2 py-1 rounded ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h2 className="text-sm text-gray-600">Starting Price</h2>
            <p className="text-xl font-bold text-gray-900">
              ${auction?.starting_price?.toLocaleString() || '0'}
            </p>
            
           
          </div>
          <div>
            <h2 className="text-sm text-gray-600">Time Remaining</h2>
            <TimeRemaining endTime={auction?.end_time || ''} />
          </div>
        </div>

        {auction?.status === 'active' && (
          <div className="flex gap-2">
             <Input
              type="number"
              value={bidAmount}
              onChange={(e) => {
                console.log('Setting bid amount:', e.target.value);
                setBidAmount(e.target.value);
              }}
              placeholder={`Enter bid amount (min: $${(auction?.highest_bid || auction?.starting_price || 0) + 1})`}
              className="flex-1 text-black"
              min={(auction?.highest_bid || auction?.starting_price || 0) + 1}
            />
            <Button 
              onClick={handleBid}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!isConnected || !bidAmount || parseFloat(bidAmount) <= (auction?.highest_bid || auction?.starting_price || 0)}
            >
              Place Bid
            </Button>
          </div>
        )}

        
      </div>
    </div>
  );
}

function TimeRemaining({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const distance = end - now;

      if (distance <= 0) {
        setTimeLeft('Ended');
        return false;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}m ${seconds}s`);
      return true;
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <p className={`text-2xl font-bold ${timeLeft === 'Ended' ? 'text-red-600' : 'text-green-600'}`}>
      {timeLeft}
    </p>
  );
}