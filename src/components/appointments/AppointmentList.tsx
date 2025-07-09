import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, User, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  hospital_name: string;
  department_name: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
  status: 'active' | 'cancelled_by_patient' | 'cancelled_by_doctor' | 'completed';
  created_at: string;
  doctor_name?: string;
}

interface AppointmentListProps {
  patientId: string;
  isPatient?: boolean;
}

const AppointmentList = ({ patientId, isPatient = true }: AppointmentListProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
    
    // Real-time subscription for appointments
    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients_today',
          filter: `doctor_id=eq.${patientId}`
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [patientId, isPatient]);

  const fetchAppointments = async () => {
    try {
      // For now, use patients_today table until appointments table is available
      const { data, error } = await supabase
        .from('patients_today')
        .select('*')
        .order('date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      const appointmentsWithDoctorNames = data?.map(appointment => ({
        id: appointment.id,
        patient_id: patientId,
        patient_name: appointment.patient_name,
        doctor_id: appointment.doctor_id,
        hospital_name: 'General Hospital',
        department_name: 'General',
        appointment_date: appointment.date,
        appointment_time: appointment.appointment_time,
        reason: appointment.condition,
        status: 'active' as const,
        created_at: appointment.created_at,
        doctor_name: 'Dr. Smith' // Mock doctor name for now
      })) || [];

      setAppointments(appointmentsWithDoctorNames);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canCancelAppointment = (appointment: Appointment) => {
    if (appointment.status !== 'active') return false;
    
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    return appointmentDateTime > twoHoursFromNow;
  };

  const cancelAppointment = async (appointmentId: string) => {
    setCancellingId(appointmentId);
    
    try {
      // For now, delete from patients_today until appointments table is available
      const { error } = await supabase
        .from('patients_today')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Appointment cancelled successfully`,
        variant: "default"
      });

      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive"
      });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'cancelled_by_patient':
        return <Badge variant="destructive">Cancelled by Patient</Badge>;
      case 'cancelled_by_doctor':
        return <Badge variant="destructive">Cancelled by Doctor</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading appointments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          {isPatient ? 'My Appointments' : 'Patient Appointments'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No appointments found
          </p>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{appointment.hospital_name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{appointment.department_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {isPatient ? `Dr. ${appointment.doctor_name}` : appointment.patient_name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(appointment.appointment_date), 'PPP')} at {appointment.appointment_time}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <strong>Reason:</strong> {appointment.reason}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(appointment.status)}
                    
                    {appointment.status === 'active' && canCancelAppointment(appointment) && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cancel Appointment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertCircle className="h-5 w-5" />
                              <span>Are you sure you want to cancel this appointment?</span>
                            </div>
                            
                            <div className="bg-muted p-3 rounded-lg">
                              <p><strong>Date:</strong> {format(new Date(appointment.appointment_date), 'PPP')}</p>
                              <p><strong>Time:</strong> {appointment.appointment_time}</p>
                              <p><strong>Doctor:</strong> {appointment.doctor_name}</p>
                              <p><strong>Hospital:</strong> {appointment.hospital_name}</p>
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <DialogTrigger asChild>
                                <Button variant="outline">Keep Appointment</Button>
                              </DialogTrigger>
                              <Button
                                variant="destructive"
                                onClick={() => cancelAppointment(appointment.id)}
                                disabled={cancellingId === appointment.id}
                              >
                                {cancellingId === appointment.id ? "Cancelling..." : "Cancel Appointment"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentList;