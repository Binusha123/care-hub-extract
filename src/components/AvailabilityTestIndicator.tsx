import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, WifiOff } from "lucide-react";

interface AvailabilityTestIndicatorProps {
  dashboardType: 'doctor' | 'patient' | 'staff';
}

const AvailabilityTestIndicator = ({ dashboardType }: AvailabilityTestIndicatorProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    // Set up real-time subscription for availability changes
    const channel = supabase
      .channel(`availability_test_${dashboardType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctor_availability'
        },
        (payload) => {
          console.log(`🔄 [${dashboardType.toUpperCase()}] Availability sync event:`, payload);
          setLastUpdate(new Date());
          setUpdateCount(prev => prev + 1);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log(`📡 [${dashboardType.toUpperCase()}] Real-time status:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dashboardType]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
        {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isConnected ? 'Live Sync' : 'Disconnected'}
      </Badge>
      {lastUpdate && (
        <span className="text-muted-foreground">
          Last sync: {lastUpdate.toLocaleTimeString()} ({updateCount} updates)
        </span>
      )}
    </div>
  );
};

export default AvailabilityTestIndicator;