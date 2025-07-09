-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  department_id UUID NOT NULL REFERENCES public.departments(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  cancellation_reason TEXT,
  cancelled_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'cancelled_by_patient', 'cancelled_by_doctor', 'completed'))
);

-- Enable Row Level Security
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for hospitals (viewable by all)
CREATE POLICY "Everyone can view hospitals" 
ON public.hospitals 
FOR SELECT 
USING (true);

-- Create policies for departments (viewable by all)
CREATE POLICY "Everyone can view departments" 
ON public.departments 
FOR SELECT 
USING (true);

-- Create policies for appointments
CREATE POLICY "Patients can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their assigned appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = doctor_id);

CREATE POLICY "Staff can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'staff'
));

CREATE POLICY "Patients can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors can update their assigned appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Staff can update all appointments" 
ON public.appointments 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'staff'
));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_hospitals_updated_at
BEFORE UPDATE ON public.hospitals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample hospitals and departments
INSERT INTO public.hospitals (name, location) VALUES
('City General Hospital', 'Downtown'),
('Regional Medical Center', 'Uptown'),
('Community Health Center', 'Suburbs');

INSERT INTO public.departments (name, hospital_id) VALUES
('Cardiology', (SELECT id FROM public.hospitals WHERE name = 'City General Hospital')),
('Neurology', (SELECT id FROM public.hospitals WHERE name = 'City General Hospital')),
('Orthopedics', (SELECT id FROM public.hospitals WHERE name = 'City General Hospital')),
('Emergency Medicine', (SELECT id FROM public.hospitals WHERE name = 'City General Hospital')),
('Pediatrics', (SELECT id FROM public.hospitals WHERE name = 'Regional Medical Center')),
('Dermatology', (SELECT id FROM public.hospitals WHERE name = 'Regional Medical Center')),
('General Medicine', (SELECT id FROM public.hospitals WHERE name = 'Community Health Center')),
('Psychiatry', (SELECT id FROM public.hospitals WHERE name = 'Community Health Center'));

-- Enable real-time for appointments
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.emergencies REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;