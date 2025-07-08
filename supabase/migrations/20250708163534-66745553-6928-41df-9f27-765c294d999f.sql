-- Add department field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN department TEXT;

-- Create doctor_shifts table for shift tracking
CREATE TABLE public.doctor_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'off-duty' CHECK (status IN ('on-duty', 'off-duty')),
  response_status TEXT NOT NULL DEFAULT 'available' CHECK (response_status IN ('available', 'on-round', 'in-surgery', 'busy')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patients_today table for daily patient assignments
CREATE TABLE public.patients_today (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  patient_name TEXT NOT NULL,
  appointment_time TIME NOT NULL,
  condition TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.doctor_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients_today ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctor_shifts
CREATE POLICY "Doctors can manage their own shifts" 
ON public.doctor_shifts 
FOR ALL 
USING (auth.uid() = doctor_id);

CREATE POLICY "Staff and patients can view all doctor shifts" 
ON public.doctor_shifts 
FOR SELECT 
USING (true);

-- RLS Policies for patients_today
CREATE POLICY "Doctors can manage their patients" 
ON public.patients_today 
FOR ALL 
USING (auth.uid() = doctor_id);

CREATE POLICY "Staff can view all patients" 
ON public.patients_today 
FOR SELECT 
USING (true);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_doctor_shifts_updated_at
BEFORE UPDATE ON public.doctor_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_today_updated_at
BEFORE UPDATE ON public.patients_today
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.doctor_shifts REPLICA IDENTITY FULL;
ALTER TABLE public.patients_today REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients_today;