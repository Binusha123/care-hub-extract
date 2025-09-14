import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Stethoscope, Building2, Calendar, MapPin, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DoctorProfileProps {
  doctorId: string;
  isEditable?: boolean;
}

interface DoctorProfile {
  id?: string;
  full_name: string;
  department: string;
  specialization: string;
  gender: string;
  years_experience: number;
  available_from: string;
  available_to: string;
  day_of_week?: number;
  location?: string;
  slot_duration: number;
}

const SPECIALIZATIONS = [
  "Physician (General Medicine)",
  "General Surgeon", 
  "Pediatrician",
  "Neurologist",
  "Psychologist",
  "Gynecologist",
  "Dermatologist",
  "Cardiologist",
  "Pulmonologist",
  "ENT (Otolaryngologist)"
];

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" }
];

const DoctorProfile = ({ doctorId, isEditable = false }: DoctorProfileProps) => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [availability, setAvailability] = useState<DoctorProfile[]>([]);
  const [newProfile, setNewProfile] = useState<DoctorProfile>({
    full_name: "",
    department: "",
    specialization: "",
    gender: "",
    years_experience: 0,
    available_from: "",
    available_to: "",
    day_of_week: 1,
    location: "",
    slot_duration: 15
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDoctorProfile();
    fetchAvailability();
  }, [doctorId]);

  const fetchDoctorProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setProfile(data);
        setNewProfile(data);
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_active_availability', { doctor_uuid: doctorId })
        .eq('doctor_id', doctorId);

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const saveProfile = async () => {
    if (!newProfile.full_name || !newProfile.department || !newProfile.specialization || !newProfile.gender) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        doctor_id: doctorId,
        full_name: newProfile.full_name,
        department: newProfile.department,
        specialization: newProfile.specialization,
        gender: newProfile.gender,
        years_experience: newProfile.years_experience,
        available_from: newProfile.available_from,
        available_to: newProfile.available_to,
        day_of_week: newProfile.day_of_week,
        location: newProfile.location,
        slot_duration: newProfile.slot_duration
      };

      const { error } = profile 
        ? await supabase
            .from('doctor_availability')
            .update(profileData)
            .eq('id', profile.id)
        : await supabase
            .from('doctor_availability')
            .insert(profileData);

      if (error) throw error;

      toast({
        title: "Profile Saved",
        description: "Your doctor profile has been saved successfully",
      });

      fetchDoctorProfile();
      fetchAvailability();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addAvailabilitySlot = async () => {
    if (!newProfile.available_from || !newProfile.available_to) {
      toast({
        title: "Missing Time Information",
        description: "Please fill in both time fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_id: doctorId,
          full_name: newProfile.full_name,
          department: newProfile.department,
          specialization: newProfile.specialization,
          gender: newProfile.gender,
          years_experience: newProfile.years_experience,
          available_from: newProfile.available_from,
          available_to: newProfile.available_to,
          day_of_week: newProfile.day_of_week,
          location: newProfile.location,
          slot_duration: newProfile.slot_duration
        });

      if (error) throw error;

      toast({
        title: "Availability Added",
        description: "New availability slot has been added",
      });

      setNewProfile(prev => ({
        ...prev,
        available_from: "",
        available_to: ""
      }));
      fetchAvailability();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Availability Removed",
        description: "Availability slot has been removed",
      });

      fetchAvailability();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Doctor Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Doctor Profile & Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditable ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={newProfile.full_name}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Dr. John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    value={newProfile.department}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Cardiology"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="specialization">Specialization *</Label>
                  <Select 
                    value={newProfile.specialization} 
                    onValueChange={(value) => setNewProfile(prev => ({ ...prev, specialization: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALIZATIONS.map((spec) => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="years_experience">Years of Experience *</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    min="0"
                    value={newProfile.years_experience}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <Label>Gender *</Label>
                <RadioGroup 
                  value={newProfile.gender} 
                  onValueChange={(value) => setNewProfile(prev => ({ ...prev, gender: value }))}
                  className="flex flex-row space-x-6 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Other" id="other" />
                    <Label htmlFor="other">Other</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Availability Slots */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Add Availability Slot
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="day_of_week">Day of Week</Label>
                    <Select 
                      value={newProfile.day_of_week?.toString()} 
                      onValueChange={(value) => setNewProfile(prev => ({ ...prev, day_of_week: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="from-time">Start Time</Label>
                    <Input
                      id="from-time"
                      type="time"
                      value={newProfile.available_from}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, available_from: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="to-time">End Time</Label>
                    <Input
                      id="to-time"
                      type="time"
                      value={newProfile.available_to}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, available_to: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newProfile.location || ""}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Room 101"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="slot_duration">Slot Duration (minutes)</Label>
                    <Select 
                      value={newProfile.slot_duration?.toString()} 
                      onValueChange={(value) => setNewProfile(prev => ({ ...prev, slot_duration: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveProfile} disabled={loading} className="flex-1">
                  Save Profile
                </Button>
                <Button onClick={addAvailabilitySlot} disabled={loading} variant="outline">
                  Add Slot
                </Button>
              </div>
            </div>
          ) : (
            // View Only Mode
            <div className="space-y-4">
              {profile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Name:</strong> {profile.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Department:</strong> {profile.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Specialization:</strong> {profile.specialization}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{profile.gender}</Badge>
                    <span><strong>Experience:</strong> {profile.years_experience} years</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No profile information available</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Availability Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Availability ({availability.length} slots)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availability.length > 0 ? (
            <div className="space-y-3">
              {availability.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-4">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {DAYS_OF_WEEK.find(d => d.value === slot.day_of_week)?.label || 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {slot.available_from} - {slot.available_to}
                      </div>
                    </div>
                    {slot.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{slot.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Timer className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{slot.slot_duration}min slots</span>
                    </div>
                  </div>
                  {isEditable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeAvailability(slot.id!)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No availability slots set</p>
              {isEditable && <p className="text-sm">Add your first availability slot above</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorProfile;