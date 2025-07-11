import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Heart, 
  AlertTriangle,
  User,
  LogOut,
  MapPin,
  FileText,
  Activity,
  Clock,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

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

const StaffDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [doctorShifts, setDoctorShifts] = useState<DoctorShift[]>([]);
  const [treatmentQueue, setTreatmentQueue] = useState<TreatmentQueue[]>([]);
  const [formData, setFormData] = useState({
    patient_id: "",
    patient_name: "",
    location: "",
    condition: ""
  });
  const [assignmentForm, setAssignmentForm] = useState({
    patient_id: "",
    patient_name: "",
    doctor_id: "",
    department: "",
    priority: "medium" as 'high' | 'medium' | 'low',
    room_number: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { showNotification } = useNotifications('staff');

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
        role: profile?.role || 'staff'
      });
    };

    getUser();
  }, [navigate]);

  useEffect(() => {
    fetchDoctorShifts();
    fetchTreatmentQueue();

    // Real-time subscription for doctor shifts
    const shiftSubscription = supabase
      .channel('staff_doctor_shifts_changes')
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

    // Real-time subscription for treatment queue
    const treatmentSubscription = supabase
      .channel('staff_treatment_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_queue'
        },
        () => {
          fetchTreatmentQueue();
        }
      )
      .subscribe();

    return () => {
      shiftSubscription.unsubscribe();
      treatmentSubscription.unsubscribe();
    };
  }, []);

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

  const fetchTreatmentQueue = async () => {
    try {
      const { data: treatments, error: treatmentsError } = await supabase
        .from('treatment_queue')
        .select('*')
        .neq('status', 'completed')
        .order('priority', { ascending: true })
        .order('assigned_at', { ascending: true });

      if (treatmentsError) throw treatmentsError;

      if (!treatments) {
        setTreatmentQueue([]);
        return;
      }

      // Get doctor profiles
      const doctorIds = treatments.map(t => t.doctor_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', doctorIds);

      if (profilesError) throw profilesError;

      const treatmentsWithDetails = treatments.map(treatment => {
        const profile = profiles?.find(p => p.user_id === treatment.doctor_id);
        return {
          ...treatment,
          priority: treatment.priority as 'high' | 'medium' | 'low',
          status: treatment.status as 'assigned' | 'en-route' | 'with-patient' | 'completed',
          doctor_name: profile?.name || 'Unknown Doctor'
        } as TreatmentQueue;
      });

      setTreatmentQueue(treatmentsWithDetails);
    } catch (error) {
      console.error('Error fetching treatment queue:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAssignmentInputChange = (field: string, value: string) => {
    setAssignmentForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAssignDoctor = async () => {
    if (!assignmentForm.patient_id || !assignmentForm.patient_name || !assignmentForm.doctor_id || !assignmentForm.room_number) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('treatment_queue')
        .insert({
          patient_id: assignmentForm.patient_id,
          patient_name: assignmentForm.patient_name,
          doctor_id: assignmentForm.doctor_id,
          department: assignmentForm.department,
          priority: assignmentForm.priority,
          room_number: assignmentForm.room_number,
          status: 'assigned'
        });

      if (error) throw error;

      toast({
        title: "Doctor Assigned",
        description: `${assignmentForm.patient_name} has been assigned to a doctor`,
      });

      // Reset form
      setAssignmentForm({
        patient_id: "",
        patient_name: "",
        doctor_id: "",
        department: "",
        priority: "medium",
        room_number: ""
      });
    } catch (error) {
      console.error('Error assigning doctor:', error);
      toast({
        title: "Error",
        description: "Failed to assign doctor. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerEmergency = async () => {
    if (!formData.patient_id || !formData.location || !formData.condition) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create emergency in database
      const { data: emergency, error } = await supabase
        .from('emergencies')
        .insert({
          patient_id: formData.patient_id,
          patient_name: formData.patient_name || null,
          location: formData.location,
          condition: formData.condition,
          triggered_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Emergency created:', emergency);

      // Send push notifications to all on-duty doctors
      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke(
        'send-emergency-notifications',
        {
          body: {
            emergencyId: emergency.id,
            patientName: formData.patient_name,
            location: formData.location,
            condition: formData.condition,
            priority: 'high'
          }
        }
      );

      if (notificationError) {
        console.error('Error sending notifications:', notificationError);
        toast({
          title: "Emergency Created",
          description: "Emergency alert created but failed to send notifications to some doctors",
          variant: "destructive"
        });
      } else {
        console.log('Notification result:', notificationResult);
        toast({
          title: "Emergency Alert Sent",
          description: `Emergency alert sent to ${notificationResult.notificationsSent || 0} doctors`,
        });
      }

      // Show local notification to staff
      showNotification("Emergency Alert Triggered", `Emergency alert sent to all on-duty doctors for patient at ${formData.location}`);

      // Reset form
      setFormData({
        patient_id: "",
        patient_name: "",
        location: "",
        condition: ""
      });
    } catch (error) {
      console.error('Error creating emergency:', error);
      toast({
        title: "Error",
        description: "Failed to send emergency alert. Please try again.",
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
              <Badge variant="secondary">Staff</Badge>
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
          <h2 className="text-3xl font-bold mb-2">Staff Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor patient care and trigger emergency alerts when needed.
          </p>
        </div>

        {/* Treatment Coordination Panel */}
        <Card className="mb-8 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Users className="h-6 w-6" />
              Treatment Coordination
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignment_patient_id">Patient ID *</Label>
                <Input
                  id="assignment_patient_id"
                  placeholder="Enter patient ID"
                  value={assignmentForm.patient_id}
                  onChange={(e) => handleAssignmentInputChange('patient_id', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment_patient_name">Patient Name *</Label>
                <Input
                  id="assignment_patient_name"
                  placeholder="Enter patient name"
                  value={assignmentForm.patient_name}
                  onChange={(e) => handleAssignmentInputChange('patient_name', e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignment_doctor">Assign Doctor *</Label>
                <Select
                  value={assignmentForm.doctor_id}
                  onValueChange={(value) => handleAssignmentInputChange('doctor_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an on-duty doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorShifts
                      .filter(shift => shift.status === 'on-duty')
                      .map((shift) => (
                        <SelectItem key={shift.doctor_id} value={shift.doctor_id}>
                          {shift.doctor_name} - {shift.department}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment_room">Room Number *</Label>
                <Input
                  id="assignment_room"
                  placeholder="e.g., Ward 2, Room 5"
                  value={assignmentForm.room_number}
                  onChange={(e) => handleAssignmentInputChange('room_number', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignment_department">Department</Label>
                <Input
                  id="assignment_department"
                  placeholder="Enter department"
                  value={assignmentForm.department}
                  onChange={(e) => handleAssignmentInputChange('department', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment_priority">Priority Level</Label>
                <Select
                  value={assignmentForm.priority}
                  onValueChange={(value) => handleAssignmentInputChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleAssignDoctor}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Assigning..." : "Assign Doctor to Patient"}
            </Button>
          </CardContent>
        </Card>

        {/* Current Treatment Queue */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Current Treatment Queue ({treatmentQueue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {treatmentQueue.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No patients in treatment queue</p>
            ) : (
              <div className="space-y-3">
                {treatmentQueue.map((treatment) => (
                  <div key={treatment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{treatment.patient_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Room {treatment.room_number} • Dr. {treatment.doctor_name} • {treatment.department}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={
                        treatment.priority === 'high' ? 'destructive' :
                        treatment.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {treatment.priority}
                      </Badge>
                      <Badge variant="outline">
                        {treatment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Trigger Panel */}
        <Card className="mb-8 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
              Trigger Emergency Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient ID *</Label>
                <Input
                  id="patient_id"
                  placeholder="Enter patient ID"
                  value={formData.patient_id}
                  onChange={(e) => handleInputChange('patient_id', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_name">Patient Name (optional)</Label>
                <Input
                  id="patient_name"
                  placeholder="Enter patient name"
                  value={formData.patient_name}
                  onChange={(e) => handleInputChange('patient_name', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location / Room No *</Label>
              <Input
                id="location"
                placeholder="e.g., Ward 2, Room 5"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition / Emergency Details *</Label>
              <Textarea
                id="condition"
                placeholder="Brief summary of symptoms or emergency situation"
                value={formData.condition}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleTriggerEmergency}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Sending Alert..." : "🚨 Trigger Emergency"}
            </Button>
          </CardContent>
        </Card>

        {/* Doctor Availability Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Doctor Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctorShifts.map((shift) => (
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
                        <span>Shift:</span>
                        <span>{shift.shift_start} - {shift.shift_end}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span>Status:</span>
                        <Badge variant="outline">
                          {shift.response_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {doctorShifts.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No doctor shifts found</p>
            )}
          </CardContent>
        </Card>

        {/* Staff Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Ward</p>
                  <p className="text-2xl font-bold">Ward 3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Shift Status</p>
                  <p className="text-lg font-semibold">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Doctors On Duty</p>
                  <p className="text-2xl font-bold">{doctorShifts.filter(s => s.status === 'on-duty').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Heart className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Priority Patients</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
