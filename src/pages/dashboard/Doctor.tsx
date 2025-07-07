import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Heart, 
  AlertTriangle,
  User,
  LogOut,
  Clock,
  MapPin,
  FileText,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Emergency {
  id: string;
  patient_id: string;
  patient_name?: string;
  location: string;
  condition: string;
  created_at: string;
  resolved: boolean;
}

const DoctorDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get user profile from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUser({
        ...user,
        name: profile?.name || user.email,
        role: profile?.role || 'doctor'
      });
    };

    getUser();
  }, [navigate]);

  useEffect(() => {
    const fetchEmergencies = async () => {
      try {
        const { data, error } = await supabase
          .from('emergencies')
          .select('*')
          .eq('resolved', false)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEmergencies(data || []);
      } catch (error) {
        console.error('Error fetching emergencies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencies();

    // Set up real-time subscription
    const subscription = supabase
      .channel('emergencies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergencies'
        },
        (payload) => {
          console.log('Emergency change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newEmergency = payload.new as Emergency;
            if (!newEmergency.resolved) {
              setEmergencies(prev => [newEmergency, ...prev]);
              toast({
                title: "🚨 NEW EMERGENCY ALERT",
                description: `Patient ${newEmergency.patient_id} - ${newEmergency.location}`,
                variant: "destructive"
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedEmergency = payload.new as Emergency;
            setEmergencies(prev => 
              prev.map(e => e.id === updatedEmergency.id ? updatedEmergency : e)
                .filter(e => !e.resolved)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleResolveEmergency = async (emergencyId: string) => {
    try {
      const { error } = await supabase
        .from('emergencies')
        .update({ resolved: true })
        .eq('id', emergencyId);

      if (error) throw error;

      toast({
        title: "Emergency Resolved",
        description: "Emergency has been marked as resolved",
      });

      setEmergencies(prev => prev.filter(e => e.id !== emergencyId));
    } catch (error) {
      console.error('Error resolving emergency:', error);
      toast({
        title: "Error",
        description: "Failed to resolve emergency",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out successfully",
      description: "See you next time!",
    });
    navigate('/');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">MediAid</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span className="font-medium">{user.name}</span>
              <Badge variant="secondary">Doctor</Badge>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Doctor Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor active emergencies and respond to critical situations.
          </p>
        </div>

        {/* Emergency Notifications Panel */}
        <div className="mb-8">
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-6 w-6" />
                  Active Emergency Alerts
                </div>
                <Badge variant="destructive">
                  {emergencies.length} Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading emergencies...</div>
              ) : emergencies.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No active emergencies. All patients are stable.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {emergencies.map((emergency) => (
                    <Card key={emergency.id} className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="destructive" className="text-xs">
                                🚨 EMERGENCY
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getTimeAgo(emergency.created_at)}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Patient</p>
                                <p className="font-semibold">
                                  {emergency.patient_name || emergency.patient_id}
                                  {emergency.patient_name && (
                                    <span className="text-sm text-muted-foreground ml-2">
                                      (ID: {emergency.patient_id})
                                    </span>
                                  )}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Location</p>
                                <p className="font-semibold flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {emergency.location}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <p className="text-sm font-medium text-muted-foreground mb-1">Condition</p>
                              <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                                {emergency.condition}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Triggered: {formatTime(emergency.created_at)}</span>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => handleResolveEmergency(emergency.id)}
                            variant="outline"
                            size="sm"
                            className="ml-4 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Resolved
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Doctor Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Emergencies</p>
                  <p className="text-2xl font-bold">{emergencies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Patients Today</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Shift Status</p>
                  <p className="text-lg font-semibold">On Duty</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Heart className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Response Time</p>
                  <p className="text-2xl font-bold">3min</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;