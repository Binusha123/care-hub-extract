
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  AlertTriangle,
  User,
  LogOut,
  Activity,
  Calendar,
  Clock,
  Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from 'date-fns';
import DoctorAvailability from "@/components/DoctorAvailability";
import ResolvedCases from "@/components/ResolvedCases";
import HelpRequests from "@/components/HelpRequests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PatientToday {
  id: string;
  patient_name: string;
  appointment_time: string;
  reason: string;
  status: string;
  type: 'appointment' | 'emergency';
  hospital_name?: string;
  department_name?: string;
  location?: string;
  condition?: string;
  priority?: string;
}

const DoctorDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientToday[]>([]);
  const [counts, setCounts] = useState({
    appointments: 0,
    emergencies: 0,
    total: 0
  });
  const [realtimeStats, setRealtimeStats] = useState({
    totalEmergencies: 0,
    totalPatients: 0,
    pendingTreatments: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch real-time statistics
  const fetchRealtimeStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get total emergencies for this doctor
      const { data: emergencies, error: emergenciesError } = await supabase
        .from('emergencies')
        .select('id')
        .eq('resolved', false);

      // Get total patients assigned to this doctor today
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: todayPatients, error: todayError } = await supabase
        .from('patients_today')
        .select('id')
        .eq('doctor_id', user.id)
        .eq('date', today);

      // Get pending treatments for this doctor
      const { data: treatments, error: treatmentsError } = await supabase
        .from('treatment_queue')
        .select('id')
        .eq('doctor_id', user.id)
        .neq('status', 'completed');

      if (emergenciesError) console.error('Error fetching emergencies:', emergenciesError);
      if (todayError) console.error('Error fetching today patients:', todayError);
      if (treatmentsError) console.error('Error fetching treatments:', treatmentsError);

      setRealtimeStats({
        totalEmergencies: emergencies?.length || 0,
        totalPatients: todayPatients?.length || 0,
        pendingTreatments: treatments?.length || 0
      });

    } catch (error) {
      console.error('Error fetching realtime stats:', error);
    }
  }, [user?.id]);

  // Memoized fetchPatientsToday function to prevent unnecessary re-renders
  const fetchPatientsToday = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      console.log('Fetching patients for doctor:', user.id, 'on date:', today);

      // Fetch appointments and emergencies in parallel for better performance
      const [appointmentsResult, emergenciesResult] = await Promise.all([
        supabase
          .from('patients_today')
          .select('*')
          .eq('doctor_id', user.id)
          .eq('date', today),
        supabase
          .from('treatment_queue')
          .select('*')
          .eq('doctor_id', user.id)
          .gte('assigned_at', `${today}T00:00:00`)
          .lt('assigned_at', `${today}T23:59:59`)
          .in('status', ['assigned', 'en-route', 'with-patient'])
      ]);

      const { data: appointments, error: appointmentsError } = appointmentsResult;
      const { data: emergencies, error: emergenciesError } = emergenciesResult;

      if (appointmentsError) {
        console.error('Appointments error:', appointmentsError);
        throw appointmentsError;
      }
      if (emergenciesError) {
        console.error('Emergencies error:', emergenciesError);
        throw emergenciesError;
      }

      console.log('Fetched appointments:', appointments?.length || 0);
      console.log('Fetched emergencies:', emergencies?.length || 0);

      // Transform data efficiently
      const appointmentPatients: PatientToday[] = appointments?.map(apt => ({
        id: apt.id,
        patient_name: apt.patient_name,
        appointment_time: apt.appointment_time,
        reason: apt.condition,
        status: 'active',
        type: 'appointment' as const,
        hospital_name: 'General Hospital',
        department_name: 'General'
      })) || [];

      const emergencyPatients: PatientToday[] = emergencies?.map(emergency => ({
        id: emergency.id,
        patient_name: emergency.patient_name,
        appointment_time: format(new Date(emergency.assigned_at), 'HH:mm'),
        reason: emergency.notes || 'Emergency treatment',
        status: emergency.status,
        type: 'emergency' as const,
        location: emergency.room_number,
        condition: emergency.department,
        priority: emergency.priority
      })) || [];

      const allPatients = [...appointmentPatients, ...emergencyPatients]
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

      console.log('Total patients processed:', allPatients.length);

      setPatients(allPatients);
      setCounts({
        appointments: appointmentPatients.length,
        emergencies: emergencyPatients.length,
        total: allPatients.length
      });

    } catch (error) {
      console.error('Error fetching patients today:', error);
      toast({
        title: "Error",
        description: "Failed to fetch patients today. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUser({
        ...user,
        id: user.id,
        name: profile?.name || user.email,
        role: profile?.role || 'doctor',
        email: user.email
      });
    };

    getUser();
  }, [navigate]);

  useEffect(() => {
    if (!user?.id) return;
    
    fetchPatientsToday();
    fetchRealtimeStats();

    // Real-time subscriptions for updates
    const channel = supabase
      .channel(`doctor_updates_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients_today',
          filter: `doctor_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Patients today updated:', payload);
          fetchPatientsToday();
          fetchRealtimeStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_queue',
          filter: `doctor_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Treatment queue updated:', payload);
          fetchPatientsToday();
          fetchRealtimeStats();
        }
       )
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'emergencies'
         },
         (payload) => {
           console.log('Emergency updated:', payload);
           
           // Only show notification for new emergencies, not updates
           if (payload.eventType === 'INSERT') {
             // Show browser notification for new emergencies
             if ('Notification' in window && Notification.permission === 'granted') {
               new Notification("🚨 NEW EMERGENCY ALERT", {
                 body: `Emergency at ${payload.new.location}: ${payload.new.condition}`,
                 icon: '/favicon.ico',
                 requireInteraction: true
               });
             }
             
             toast({
               title: "🚨 NEW EMERGENCY ALERT",
               description: `Emergency at ${payload.new.location}: ${payload.new.condition}`,
               variant: "destructive"
             });
           } else if (payload.eventType === 'UPDATE' && payload.new.resolved) {
             // Show notification when emergency is resolved
             toast({
               title: "✅ Emergency Resolved",
               description: `Emergency for ${payload.new.patient_name} has been resolved`,
               variant: "default"
             });
           }
           
           fetchPatientsToday();
           fetchRealtimeStats();
         }
       )
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchPatientsToday();
      fetchRealtimeStats();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id, fetchPatientsToday, fetchRealtimeStats, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out successfully",
      description: "See you next time!",
    });
    navigate('/');
  };

  const getStatusBadge = (patient: PatientToday) => {
    if (patient.type === 'emergency') {
      const priority = patient.priority;
      if (priority === 'high') return <Badge variant="destructive">High Priority</Badge>;
      if (priority === 'medium') return <Badge variant="default">Medium Priority</Badge>;
      if (priority === 'low') return <Badge variant="secondary">Low Priority</Badge>;
      return <Badge variant="outline">Emergency</Badge>;
    }
    return <Badge variant="default">Scheduled</Badge>;
  };

  const getTypeIcon = (type: string) => {
    return type === 'emergency' ? (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    ) : (
      <Calendar className="h-4 w-4 text-blue-500" />
    );
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>
  );

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

      {/* Email Notification Info */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <Mail className="h-5 w-5 text-blue-400 mr-2" />
          <div>
            <p className="text-sm text-blue-700">
              <strong>📧 Email Emergency Alerts Active:</strong> You will receive emergency notifications via email at {user.email}. 
              Emergency alerts are sent directly to your registered email address for immediate attention.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Doctor Dashboard</h2>
          <p className="text-muted-foreground">
            View today's appointments and manage emergency cases.
          </p>
        </div>

        {/* Real-time Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Today's Appointments</p>
                  <p className="text-3xl font-bold text-blue-700">{counts.appointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-red-600 font-medium">Active Emergencies</p>
                  <p className="text-3xl font-bold text-red-700">{realtimeStats.totalEmergencies}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Patients</p>
                  <p className="text-3xl font-bold text-purple-700">{counts.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="patients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="patients">Today's Patients</TabsTrigger>
            <TabsTrigger value="availability">My Availability</TabsTrigger>
            <TabsTrigger value="resolved">Resolved Cases</TabsTrigger>
            <TabsTrigger value="help">Help Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-6">

            {/* Patients Today Card */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Patients Today ({counts.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary Cards - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{counts.appointments}</div>
                <div className="text-sm text-muted-foreground">Appointments</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-red-600">{counts.emergencies}</div>
                <div className="text-sm text-muted-foreground">Emergencies</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-green-600">{counts.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>

            {/* Patient List */}
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Loading patients...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No patients scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patients.map((patient) => (
                  <div key={patient.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getTypeIcon(patient.type)}
                          <span className="font-medium">{patient.patient_name}</span>
                          {getStatusBadge(patient)}
                        </div>

                        <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{patient.appointment_time}</span>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                          <strong>Reason:</strong> {patient.reason}
                        </div>

                        {patient.type === 'appointment' && (
                          <div className="text-xs text-muted-foreground">
                            {patient.hospital_name} • {patient.department_name}
                          </div>
                        )}

                        {patient.type === 'emergency' && (
                          <div className="text-xs text-muted-foreground">
                            Room: {patient.location} • {patient.condition}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="availability">
            <DoctorAvailability doctorId={user.id} isEditable={true} />
          </TabsContent>

          <TabsContent value="resolved">
            <ResolvedCases doctorId={user.id} />
          </TabsContent>

          <TabsContent value="help">
            <HelpRequests userId={user.id} userRole="doctor" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DoctorDashboard;
