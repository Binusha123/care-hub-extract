-- Add comprehensive doctor profile fields to doctor_availability table
ALTER TABLE public.doctor_availability 
ADD COLUMN full_name TEXT,
ADD COLUMN department TEXT,
ADD COLUMN specialization TEXT,
ADD COLUMN gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
ADD COLUMN years_experience INTEGER,
ADD COLUMN location TEXT,
ADD COLUMN slot_duration INTEGER DEFAULT 15;

-- Add appointments table for tracking appointments
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  patient_id UUID,
  patient_name TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS policies for appointments
CREATE POLICY "Doctors can view their appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can manage their appointments" 
ON public.appointments 
FOR ALL 
USING (auth.uid() = doctor_id);

CREATE POLICY "Medical staff can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (is_medical_staff());

CREATE POLICY "Medical staff can manage all appointments" 
ON public.appointments 
FOR ALL 
USING (is_medical_staff());

-- Create function to update timestamps
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;