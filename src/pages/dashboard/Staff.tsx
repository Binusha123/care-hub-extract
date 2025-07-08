import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const StaffDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [doctorShifts, setDoctorShifts] = useState<DoctorShift[]>([]);
  const [formData, setFormData] = useState({
    patient_id: "",
    patient_name: "",
    location: "",
    condition: ""
  });
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
        role: profile?.role || 'staff'
      });
    };

    getUser();
  }, [navigate]);

  useEffect(() => {
    fetchDoctorShifts();

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

    return () => {
      shiftSubscription.unsubscribe();
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      const { error } = await supabase
        .from('emergencies')
        .insert({
          patient_id: formData.patient_id,
          patient_name: formData.patient_name || null,
          location: formData.location,
          condition: formData.condition,
          triggered_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Emergency Alert Sent",
        description: "All doctors have been notified immediately",
      });

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