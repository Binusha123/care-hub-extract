import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FileUpload from "@/components/FileUpload";
import AppointmentBooking from "@/components/appointments/AppointmentBooking";
import AppointmentList from "@/components/appointments/AppointmentList";
import DoctorAvailability from "@/components/DoctorAvailability";
import { 
  Heart, 
  Calendar, 
  FileText, 
  Activity, 
  User,
  LogOut,
  Users,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface DoctorShift {
  id: string;
  doctor_id: string;
  shift_start: string;
  shift_end: string;
  status: 'on-duty' | 'off-duty';
  response_status: 'available' | 'on-round' | 'in-surgery' | 'busy';
  doctor_name?: string;
  department?: string;
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
  doctor_name?: string;
}

const PatientDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [doctorShifts, setDoctorShifts] = useState<DoctorShift[]>([]);
  const [myTreatment, setMyTreatment] = useState<TreatmentQueue | null>(null);
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
        role: profile?.role || 'patient'
      });

      // Mock reports data for now
      setReports([]);

      // Fetch doctor shifts
      fetchDoctorShifts();
      
      // Fetch my treatment queue
      fetchMyTreatment(user.id);
    };

    getUser();
  }, [navigate]);

  useEffect(() => {
    // Real-time subscription for doctor shifts
    const shiftSubscription = supabase
      .channel('patient_doctor_shifts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctor_shifts'
        },
        () => {
          fetchDoctorShifts();
        }
      )
      .subscribe();

    // Real-time subscription for my treatment queue
    const treatmentSubscription = supabase
      .channel('patient_treatment_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_queue'
        },
        () => {
          if (user) {
            fetchMyTreatment(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      shiftSubscription.unsubscribe();
      treatmentSubscription.unsubscribe();
    };
  }, [user]);

  const fetchDoctorShifts = async () => {
    try {
      const { data: shifts, error: shiftsError } = await supabase
        .from('doctor_shifts')
        .select('*');

      if (shiftsError) throw shiftsError;

      if (!shifts) {
        setDoctorShifts([]);
        return;
      }

      // Get doctor profiles
      const doctorIds = shifts.map(shift => shift.doctor_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, department')
        .in('user_id', doctorIds);

      if (profilesError) throw profilesError;

      const shiftsWithDetails = shifts.map(shift => {
        const profile = profiles?.find(p => p.user_id === shift.doctor_id);
        return {
          ...shift,
          status: shift.status as 'on-duty' | 'off-duty',
          response_status: shift.response_status as 'available' | 'on-round' | 'in-surgery' | 'busy',
          doctor_name: profile?.name || 'Unknown Doctor',
          department: profile?.department || 'General'
        } as DoctorShift;
      });

      setDoctorShifts(shiftsWithDetails);
    } catch (error) {
      console.error('Error fetching doctor shifts:', error);
    }
  };

  const fetchMyTreatment = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('treatment_queue')
        .select('*')
        .eq('patient_id', userId)
        .eq('status', 'assigned')
        .or('status.eq.en-route,status.eq.with-patient')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Get doctor profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', data.doctor_id)
          .single();

        setMyTreatment({
          ...data,
          priority: data.priority as 'high' | 'medium' | 'low',
          status: data.status as 'assigned' | 'en-route' | 'with-patient' | 'completed',
          doctor_name: profile?.name || 'Unknown Doctor'
        });
      } else {
        setMyTreatment(null);
      }
    } catch (error) {
      console.error('Error fetching my treatment:', error);
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
              <Badge variant="secondary">Patient</Badge>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user.name}!</h2>
          <p className="text-muted-foreground">
            Manage your health records and get AI-powered insights.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Available Doctors</p>
                  <p className="text-2xl font-bold">{doctorShifts.filter(s => s.status === 'on-duty').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                  <p className="text-2xl font-bold">85%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Doctor on the Way Section */}
        {myTreatment && (
          <Card className="mb-8 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Clock className="h-6 w-6" />
                Doctor on the Way
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{myTreatment.doctor_name}</h3>
                    <p className="text-muted-foreground">{myTreatment.department}</p>
                  </div>
                  <Badge variant={
                    myTreatment.status === 'with-patient' ? 'default' :
                    myTreatment.status === 'en-route' ? 'secondary' : 'outline'
                  }>
                    {myTreatment.status === 'with-patient' ? 'With Patient' :
                     myTreatment.status === 'en-route' ? 'En Route' :
                     myTreatment.status === 'assigned' ? 'Assigned' : myTreatment.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Room Number</p>
                    <p className="font-medium">{myTreatment.room_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <Badge variant={
                      myTreatment.priority === 'high' ? 'destructive' :
                      myTreatment.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {myTreatment.priority}
                    </Badge>
                  </div>
                </div>
                
                {myTreatment.estimated_arrival_minutes && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {myTreatment.estimated_arrival_minutes} minutes
                    </p>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Assigned: {new Date(myTreatment.assigned_at).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Doctor Availability Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Doctor Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctorShifts
                .filter(shift => shift.department && (user.department === shift.department || !user.department))
                .map((shift) => (
                <Card key={shift.id} className={`${shift.status === 'off-duty' ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{shift.doctor_name}</h4>
                        <p className="text-sm text-muted-foreground">{shift.department}</p>
                      </div>
                      <Badge variant={shift.status === 'on-duty' ? 'default' : 'secondary'}>
                        {shift.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Available:</span>
                        <span>{shift.shift_start} - {shift.shift_end}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span>Status:</span>
                        <Badge variant="outline">
                          {shift.response_status}
                        </Badge>
                      </div>

                      {shift.status === 'on-duty' && shift.response_status === 'available' && (
                        <div className="mt-2">
                          <Badge variant="default" className="bg-green-600">
                            Available Now
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Doctor Availability Times */}
                    <div className="mt-3 pt-3 border-t">
                      <DoctorAvailability doctorId={shift.doctor_id} isEditable={false} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {doctorShifts.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No doctor information available</p>
            )}
          </CardContent>
        </Card>

        {/* Appointment Booking Section */}
        <div className="mb-8">
          <AppointmentBooking patientId={user.id} patientName={user.name} />
        </div>

        {/* My Appointments Section */}
        <div className="mb-8">
          <AppointmentList patientId={user.id} isPatient={true} />
        </div>

        {/* File Upload Section */}
        <div className="mb-8">
          <FileUpload />
        </div>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Analysis Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.slice(0, 5).map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{report.file_name}</h4>
                      <Badge variant="outline">
                        {new Date(report.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {report.detected_conditions?.map((condition: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-3 gap-4">
                      <span>BP: {report.blood_pressure}</span>
                      <span>Sugar: {report.blood_sugar}</span>
                      <span>Cholesterol: {report.cholesterol}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;