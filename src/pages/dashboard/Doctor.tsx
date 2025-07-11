import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  AlertTriangle,
  User,
  LogOut,
  Activity,
  Bell,
  Calendar,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from 'date-fns';
import { useNotifications } from "@/hooks/useNotifications";

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { requestPermission, permission, showNotification } = useNotifications('doctor');

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
        role: profile?.role || 'doctor'
      });

      // Request notification permission for doctors
      if (permission === 'default') {
        setTimeout(() => {
          requestPermission();
        }, 2000); // Wait 2 seconds before asking for permission
      }
    };

    getUser();
  }, [navigate, permission, requestPermission]);

  useEffect(() => {
    if (!user) return;
    fetchPatientsToday();

    // Real-time subscription for appointments
    const appointmentChannel = supabase
      .channel('doctor_appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients_today',
          filter: `doctor_id=eq.${user.id}`
        },
        () => {
          fetchPatientsToday();
        }
      )
      .subscribe();

    // Real-time subscription for emergencies
    const emergencyChannel = supabase
      .channel('doctor_emergencies_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_queue',
          filter: `doctor_id=eq.${user.id}`
        },
        () => {
          fetchPatientsToday();
        }
      )
      .subscribe();

    return () => {
      appointmentChannel.unsubscribe();
      emergencyChannel.unsubscribe();
    };
  }, [user]);

  const fetchPatientsToday = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch today's appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('patients_today')
        .select('*')
        .eq('doctor_id', user.id)
        .eq('date', today);

      if (appointmentsError) throw appointmentsError;

      // Fetch today's emergencies/treatment queue
      const { data: emergencies, error: emergenciesError } = await supabase
        .from('treatment_queue')
        .select('*')
        .eq('doctor_id', user.id)
        .gte('assigned_at', `${today}T00:00:00`)
        .lt('assigned_at', `${today}T23:59:59`)
        .in('status', ['assigned', 'en-route', 'with-patient']);

      if (emergenciesError) throw emergenciesError;

      // Transform appointments data
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

      // Transform emergencies data
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

      // Combine and sort by time
      const allPatients = [...appointmentPatients, ...emergencyPatients]
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

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
  };

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
            {permission !== 'granted' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={requestPermission}
                className="text-sm"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            )}
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

      {/* Notification Permission Alert */}
      {permission === 'denied' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <p className="text-sm text-yellow-700">
                <strong>Notifications Blocked:</strong> You won't receive emergency alerts. 
                Please enable notifications in your browser settings to receive critical emergency notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Doctor Dashboard</h2>
          <p className="text-muted-foreground">
            View today's appointments and manage emergency cases.
          </p>
        </div>

        {/* Patients Today Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Patients Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{counts.appointments}</div>
                <div className="text-sm text-muted-foreground">Appointments</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">{counts.emergencies}</div>
                <div className="text-sm text-muted-foreground">Emergencies</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{counts.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>

            {/* Patient List */}
            {loading ? (
              <div className="text-center py-4">Loading patients...</div>
            ) : patients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No patients scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patients.map((patient) => (
                  <div key={patient.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
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
      </div>
    </div>
  );
};

export default DoctorDashboard;
