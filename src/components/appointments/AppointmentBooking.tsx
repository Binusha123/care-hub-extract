import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, User, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Hospital {
  id: string;
  name: string;
  location: string;
}

interface Department {
  id: string;
  name: string;
  hospital_id: string;
}

interface Doctor {
  id: string;
  name: string;
  department: string;
  hospital_id: string;
  department_id: string;
}

interface AppointmentBookingProps {
  patientId: string;
  patientName: string;
}

const AppointmentBooking = ({ patientId, patientName }: AppointmentBookingProps) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    hospital_id: '',
    department_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: ''
  });
  const { toast } = useToast();

  // Fetch hospitals on component mount
  useEffect(() => {
    fetchHospitals();
  }, []);

  // Fetch departments when hospital changes
  useEffect(() => {
    if (form.hospital_id) {
      fetchDepartments(form.hospital_id);
      setForm(prev => ({ ...prev, department_id: '', doctor_id: '' }));
    }
  }, [form.hospital_id]);

  // Fetch doctors when department changes
  useEffect(() => {
    if (form.department_id) {
      fetchDoctors(form.department_id);
      setForm(prev => ({ ...prev, doctor_id: '' }));
    }
  }, [form.department_id]);

  const fetchHospitals = async () => {
    try {
      // Mock data for now since tables need to be created
      const mockHospitals = [
        { id: '1', name: 'City General Hospital', location: 'Downtown' },
        { id: '2', name: 'Memorial Medical Center', location: 'Midtown' },
        { id: '3', name: 'University Hospital', location: 'Campus District' }
      ];
      setHospitals(mockHospitals);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      toast({
        title: "Error",
        description: "Failed to load hospitals",
        variant: "destructive"
      });
    }
  };

  const fetchDepartments = async (hospitalId: string) => {
    try {
      // Mock data for now
      const mockDepartments = [
        { id: '1', name: 'Emergency', hospital_id: hospitalId },
        { id: '2', name: 'Cardiology', hospital_id: hospitalId },
        { id: '3', name: 'Orthopedics', hospital_id: hospitalId },
        { id: '4', name: 'Pediatrics', hospital_id: hospitalId }
      ];
      setDepartments(mockDepartments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive"
      });
    }
  };

  const fetchDoctors = async (departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, department')
        .eq('role', 'doctor')
        .order('name');
      
      if (error) throw error;
      
      const doctorsData = data?.map(doc => ({
        id: doc.user_id,
        name: doc.name || 'Unknown Doctor',
        department: doc.department || 'General',
        hospital_id: form.hospital_id,
        department_id: departmentId
      })) || [];
      
      setDoctors(doctorsData);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to load doctors",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.hospital_id || !form.department_id || !form.doctor_id || !form.appointment_date || !form.appointment_time || !form.reason) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Check if appointment is at least 2 hours from now
    const appointmentDateTime = new Date(`${form.appointment_date}T${form.appointment_time}`);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (appointmentDateTime < twoHoursFromNow) {
      toast({
        title: "Error",
        description: "Appointment must be at least 2 hours from now",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const hospital = hospitals.find(h => h.id === form.hospital_id);
      const department = departments.find(d => d.id === form.department_id);
      
      // For now, store in patients_today until appointments table is available
      const { error } = await supabase
        .from('patients_today')
        .insert({
          patient_name: patientName,
          doctor_id: form.doctor_id,
          appointment_time: form.appointment_time,
          condition: form.reason,
          date: form.appointment_date
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Appointment booked successfully! The doctor will be notified.",
        variant: "default"
      });

      // Reset form
      setForm({
        hospital_id: '',
        department_id: '',
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        reason: ''
      });

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedHospital = hospitals.find(h => h.id === form.hospital_id);
  const selectedDepartment = departments.find(d => d.id === form.department_id);
  const selectedDoctor = doctors.find(d => d.id === form.doctor_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Book an Appointment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hospital">Hospital</Label>
              <Select value={form.hospital_id} onValueChange={(value) => setForm(prev => ({ ...prev, hospital_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{hospital.name}</div>
                          <div className="text-sm text-muted-foreground">{hospital.location}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select 
                value={form.department_id} 
                onValueChange={(value) => setForm(prev => ({ ...prev, department_id: value }))}
                disabled={!form.hospital_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        {department.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="doctor">Doctor</Label>
              <Select 
                value={form.doctor_id} 
                onValueChange={(value) => setForm(prev => ({ ...prev, doctor_id: value }))}
                disabled={!form.department_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {doctor.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Appointment Date</Label>
              <Input
                id="date"
                type="date"
                value={form.appointment_date}
                onChange={(e) => setForm(prev => ({ ...prev, appointment_date: e.target.value }))}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <Label htmlFor="time">Appointment Time</Label>
              <Input
                id="time"
                type="time"
                value={form.appointment_time}
                onChange={(e) => setForm(prev => ({ ...prev, appointment_time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason / Description</Label>
            <Textarea
              id="reason"
              placeholder="Describe your symptoms or reason for visit..."
              value={form.reason}
              onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Appointment Summary */}
          {selectedHospital && selectedDepartment && selectedDoctor && form.appointment_date && form.appointment_time && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Appointment Summary</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Hospital:</strong> {selectedHospital.name}</p>
                <p><strong>Department:</strong> {selectedDepartment.name}</p>
                <p><strong>Doctor:</strong> {selectedDoctor.name}</p>
                <p><strong>Date & Time:</strong> {format(new Date(form.appointment_date), 'PPP')} at {form.appointment_time}</p>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Booking..." : "Book Appointment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AppointmentBooking;