import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, AlertTriangle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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

interface PatientsTodayProps {
  doctorId: string;
}

const PatientsToday = ({ doctorId }: PatientsTodayProps) => {
  const [patients, setPatients] = useState<PatientToday[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    appointments: 0,
    emergencies: 0,
    total: 0
  });

  useEffect(() => {
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
          filter: `doctor_id=eq.${doctorId}`
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
          filter: `doctor_id=eq.${doctorId}`
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
  }, [doctorId]);

  const fetchPatientsToday = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Fetch today's appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('patients_today')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('date', today);

      if (appointmentsError) throw appointmentsError;

      // Fetch today's emergencies/treatment queue
      const { data: emergencies, error: emergenciesError } = await supabase
        .from('treatment_queue')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
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
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Patients Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading patients...</div>
        </CardContent>
      </Card>
    );
  }

  return (
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
        {patients.length === 0 ? (
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
  );
};

export default PatientsToday;