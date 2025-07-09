import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PatientsToday from "@/components/appointments/PatientsToday";
import AppointmentList from "@/components/appointments/AppointmentList";
import { 
  Heart, 
  AlertTriangle,
  User,
  LogOut,
  Clock,
  MapPin,
  FileText,
  CheckCircle,
  Settings,
  Users,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

interface Emergency {
  id: string;
  patient_id: string;
  patient_name?: string;
  location: string;
  condition: string;
  created_at: string;
  resolved: boolean;
}

interface DoctorShift {
  id: string;
  doctor_id: string;
  shift_start: string;
  shift_end: string;
  status: 'on-duty' | 'off-duty';
  response_status: 'available' | 'on-round' | 'in-surgery' | 'busy';
}

interface PatientToday {
  id: string;
  patient_name: string;
  appointment_time: string;
  condition: string;
}

interface TreatmentQueue {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  department: string;
  priority: 'high' | 'medium' | 'low';
  room_number: string;
  status: 'assigned' | 'en-route' | 'with-patient' | 'completed';
  estimated_arrival_minutes?: number;
  assigned_at: string;
  treatment_started_at?: string;
  treatment_completed_at?: string;
  notes?: string;
}

const DoctorDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<DoctorShift | null>(null);
  const [patientsToday, setPatientsToday] = useState<PatientToday[]>([]);
  const [treatmentQueue, setTreatmentQueue] = useState<TreatmentQueue[]>([]);
  const [shiftForm, setShiftForm] = useState({
    shift_start: '',
    shift_end: '',
    status: 'off-duty' as 'on-duty' | 'off-duty',
    response_status: 'available' as 'available' | 'on-round' | 'in-surgery' | 'busy'
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { permission, requestPermission, showNotification } = useNotifications('doctor');

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
        role: profile?.role || 'doctor',
        department: profile?.department || 'General'
      });

      // Fetch doctor's shift info
      fetchShiftInfo(user.id);
      fetchPatientsToday(user.id);
      fetchTreatmentQueue(user.id);
    };

    getUser();
  }, [navigate]);

  const fetchShiftInfo = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from('doctor_shifts')
        .select('*')
        .eq('doctor_id', doctorId)
        .single();

      if (data) {
        setShift(data as DoctorShift);
        setShiftForm({
          shift_start: data.shift_start,
          shift_end: data.shift_end,
          status: data.status as 'on-duty' | 'off-duty',
          response_status: data.response_status as 'available' | 'on-round' | 'in-surgery' | 'busy'
        });
      }
    } catch (error) {
      console.log('No shift info found');
    }
  };

  const fetchPatientsToday = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from('patients_today')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('date', new Date().toISOString().split('T')[0])
        .order('appointment_time');

      if (data) {
        setPatientsToday(data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchTreatmentQueue = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from('treatment_queue')
        .select('*')
        .eq('doctor_id', doctorId)
        .neq('status', 'completed')
        .order('priority', { ascending: true })
        .order('assigned_at', { ascending: true });

      if (error) throw error;
      const typedData = (data || []).map(item => ({
        ...item,
        priority: item.priority as 'high' | 'medium' | 'low',
        status: item.status as 'assigned' | 'en-route' | 'with-patient' | 'completed'
      }));
      setTreatmentQueue(typedData);
    } catch (error) {
      console.error('Error fetching treatment queue:', error);
    }
  };

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

    // Request notification permission for doctors
    if (permission === 'default') {
      requestPermission();
    }

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
              
              // Show browser notification
              showNotification("🚨 Emergency Alert", `Emergency: ${newEmergency.condition} at ${newEmergency.location}`);
              
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

    // Real-time subscription for treatment queue
    const treatmentSubscription = supabase
      .channel('doctor_treatment_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_queue'
        },
        () => {
          if (user) {
            fetchTreatmentQueue(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      treatmentSubscription.unsubscribe();
    };
  }, [permission, requestPermission, showNotification, toast, user]);

  // Real-time shift updates
  useEffect(() => {
    if (!user) return;

    const shiftSubscription = supabase
      .channel('doctor_shifts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctor_shifts',
          filter: `doctor_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setShift(payload.new as DoctorShift);
          }
        }
      )
      .subscribe();

    return () => {
      shiftSubscription.unsubscribe();
    };
  }, [user]);

  // Check for shift end notification
  useEffect(() => {
    if (!shift || shift.status !== 'on-duty') return;

    const checkShiftEnd = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const shiftEndTime = shift.shift_end;
      
      // Calculate 15 minutes before shift end
      const [endHour, endMinute] = shiftEndTime.split(':').map(Number);
      const shiftEndDate = new Date();
      shiftEndDate.setHours(endHour, endMinute - 15, 0, 0);
      
      const currentDate = new Date();
      currentDate.setHours(now.getHours(), now.getMinutes(), 0, 0);

      if (currentDate.getTime() === shiftEndDate.getTime()) {
        toast({
          title: "Shift Ending Soon",
          description: "Your shift ends in 15 minutes. Update your patients or finalize any open alerts.",
          variant: "default"
        });
      }
    };

    const interval = setInterval(checkShiftEnd, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [shift, toast]);

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

  const handleSaveShift = async () => {
    if (!user || !shiftForm.shift_start || !shiftForm.shift_end) {
      toast({
        title: "Missing Information",
        description: "Please fill in both shift start and end times",
        variant: "destructive"
      });
      return;
    }

    try {
      const shiftData = {
        doctor_id: user.id,
        shift_start: shiftForm.shift_start,
        shift_end: shiftForm.shift_end,
        status: shiftForm.status,
        response_status: shiftForm.response_status
      };

      if (shift) {
        const { error } = await supabase
          .from('doctor_shifts')
          .update(shiftData)
          .eq('id', shift.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('doctor_shifts')
          .insert(shiftData);
        if (error) throw error;
      }

      toast({
        title: "Shift Updated",
        description: "Your shift information has been saved successfully",
      });
    } catch (error) {
      console.error('Error saving shift:', error);
      toast({
        title: "Error",
        description: "Failed to save shift information",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (newStatus: 'on-duty' | 'off-duty') => {
    if (!shift) return;

    try {
      const { error } = await supabase
        .from('doctor_shifts')
        .update({ status: newStatus })
        .eq('id', shift.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `You are now ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleResponseStatusChange = async (newResponseStatus: string) => {
    if (!shift) return;

    try {
      const { error } = await supabase
        .from('doctor_shifts')
        .update({ response_status: newResponseStatus })
        .eq('id', shift.id);

      if (error) throw error;

      toast({
        title: "Response Status Updated",
        description: `Your status is now ${newResponseStatus}`,
      });
    } catch (error) {
      console.error('Error updating response status:', error);
      toast({
        title: "Error",
        description: "Failed to update response status",
        variant: "destructive"
      });
    }
  };

  const handleStartTreatment = async (treatmentId: string) => {
    try {
      const { error } = await supabase
        .from('treatment_queue')
        .update({ 
          status: 'with-patient',
          treatment_started_at: new Date().toISOString()
        })
        .eq('id', treatmentId);

      if (error) throw error;

      toast({
        title: "Treatment Started",
        description: "Patient status updated to 'With Patient'",
      });
    } catch (error) {
      console.error('Error starting treatment:', error);
      toast({
        title: "Error",
        description: "Failed to start treatment",
        variant: "destructive"
      });
    }
  };

  const handleCompleteTreatment = async (treatmentId: string) => {
    try {
      const { error } = await supabase
        .from('treatment_queue')
        .update({ 
          status: 'completed',
          treatment_completed_at: new Date().toISOString()
        })
        .eq('id', treatmentId);

      if (error) throw error;

      toast({
        title: "Treatment Completed",
        description: "Patient has been marked as treated",
      });
    } catch (error) {
      console.error('Error completing treatment:', error);
      toast({
        title: "Error",
        description: "Failed to complete treatment",
        variant: "destructive"
      });
    }
  };

  const handleSetETA = async (treatmentId: string, minutes: number) => {
    try {
      const { error } = await supabase
        .from('treatment_queue')
        .update({ 
          estimated_arrival_minutes: minutes,
          status: 'en-route'
        })
        .eq('id', treatmentId);

      if (error) throw error;

      toast({
        title: "ETA Updated",
        description: `Estimated arrival time set to ${minutes} minutes`,
      });
    } catch (error) {
      console.error('Error setting ETA:', error);
      toast({
        title: "Error",
        description: "Failed to set ETA",
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

        {/* Treatment Queue Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Treatment Queue ({treatmentQueue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {treatmentQueue.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No patients in treatment queue</p>
            ) : (
              <div className="space-y-4">
                {treatmentQueue.map((treatment) => (
                  <Card key={treatment.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{treatment.patient_name}</h4>
                          <p className="text-sm text-muted-foreground">Room {treatment.room_number} • {treatment.department}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={
                            treatment.priority === 'high' ? 'destructive' :
                            treatment.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {treatment.priority} priority
                          </Badge>
                          <Badge variant="outline">
                            {treatment.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex gap-2">
                          {treatment.status === 'assigned' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleSetETA(treatment.id, 5)}
                                variant="outline"
                              >
                                Set ETA 5min
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleStartTreatment(treatment.id)}
                              >
                                Start Treatment
                              </Button>
                            </>
                          )}
                          {treatment.status === 'en-route' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStartTreatment(treatment.id)}
                            >
                              Start Treatment
                            </Button>
                          )}
                          {treatment.status === 'with-patient' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleCompleteTreatment(treatment.id)}
                              variant="outline"
                            >
                              Complete Treatment
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Assigned: {new Date(treatment.assigned_at).toLocaleString()}
                        {treatment.estimated_arrival_minutes && (
                          <span className="ml-2">• ETA: {treatment.estimated_arrival_minutes} min</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patients Today Section */}
        <div className="mb-8">
          <PatientsToday doctorId={user.id} />
        </div>

        {/* Appointment List Section */}
        <div className="mb-8">
          <AppointmentList patientId={user.id} isPatient={false} />
        </div>

        {/* Shift Management Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Shift Schedule Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Shift Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shift_start">Shift Start</Label>
                  <Input
                    id="shift_start"
                    type="time"
                    value={shiftForm.shift_start}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, shift_start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift_end">Shift End</Label>
                  <Input
                    id="shift_end"
                    type="time"
                    value={shiftForm.shift_end}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, shift_end: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Shift Status:</span>
                  <Badge variant={shift?.status === 'on-duty' ? 'default' : 'secondary'}>
                    {shift?.status || 'off-duty'}
                  </Badge>
                </div>
                {shift && (
                  <Button
                    size="sm"
                    variant={shift.status === 'on-duty' ? 'destructive' : 'default'}
                    onClick={() => handleStatusChange(shift.status === 'on-duty' ? 'off-duty' : 'on-duty')}
                  >
                    {shift.status === 'on-duty' ? 'Go Off Duty' : 'Go On Duty'}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Response Status</Label>
                <Select
                  value={shift?.response_status || 'available'}
                  onValueChange={handleResponseStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on-round">On Round</SelectItem>
                    <SelectItem value="in-surgery">In Surgery</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveShift} className="w-full">
                Save Shift Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{patientsToday.length}</div>
                  <div className="text-sm text-muted-foreground">Today's Patients</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{emergencies.length}</div>
                  <div className="text-sm text-muted-foreground">Active Emergencies</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{treatmentQueue.length}</div>
                  <div className="text-sm text-muted-foreground">In Queue</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold text-primary">{shift?.status || 'Off Duty'}</div>
                  <div className="text-sm text-muted-foreground">Current Status</div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                  <p className="text-2xl font-bold">{patientsToday.length}</p>
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
                  <p className="text-lg font-semibold">{shift?.status || 'Off Duty'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Response Status</p>
                  <p className="text-lg font-semibold capitalize">{shift?.response_status || 'Available'}</p>
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